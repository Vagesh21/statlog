import asyncio
import time
from typing import Dict, Any, List
from zoneinfo import ZoneInfo
from datetime import datetime

from utils.cache_store import cache_store
from utils import system_metrics
from utils.usb_metrics import parse_lsusb
from utils.database import get_database
from utils.smtp_mailer import smtp_is_configured, send_email_sync

import os
import logging

try:
    import docker
    DOCKER_AVAILABLE = True
except Exception:
    DOCKER_AVAILABLE = False

try:
    from huawei_lte_api.Client import Client
    from huawei_lte_api.Connection import Connection
    from huawei_lte_api.enums.sms import BoxTypeEnum
    HUAWEI_API_AVAILABLE = True
except Exception:
    HUAWEI_API_AVAILABLE = False

logger = logging.getLogger(__name__)

# Cache keys
KEY_CPU = "metrics.cpu"
KEY_MEMORY = "metrics.memory"
KEY_TEMP = "metrics.temperature"
KEY_DISK = "metrics.disk"
KEY_NETWORK = "metrics.network"
KEY_SUMMARY = "metrics.summary"
KEY_HISTORY = "metrics.history"
KEY_USB = "usb.devices"
KEY_DOCKER = "docker.containers"
KEY_DONGLE = "dongle.status"
KEY_HEALTH = "health.status"
KEY_SMS_FORWARDER = "dongle.sms_forwarder"

MEL_TZ = ZoneInfo("Australia/Melbourne")

_history: List[Dict[str, Any]] = []


def _now_iso_mel() -> str:
    return datetime.now(MEL_TZ).isoformat()


def _build_summary(cpu, memory, temp, disk, network) -> Dict[str, Any]:
    return {
        "cpu": cpu,
        "memory": memory,
        "temperature": temp,
        "disk": disk,
        "network": network,
        "timestamp": _now_iso_mel(),
    }


def _ensure_history_point(summary: Dict[str, Any]) -> None:
    global _history
    ts = datetime.now(MEL_TZ)
    point = {
        "ts": ts.isoformat(),
        "time": ts.strftime("%H:%M:%S"),
        "cpu": summary["cpu"].get("overall_usage", 0),
        "memory": summary["memory"].get("percent", 0),
        "temp": summary["temperature"].get("cpu_temp", 0),
    }
    _history.append(point)
    # Keep last 15 minutes at ~2s cadence (450 points)
    if len(_history) > 450:
        _history = _history[-450:]


def _get_docker_client():
    if not DOCKER_AVAILABLE:
        return None
    try:
        return docker.from_env()
    except Exception:
        return None


def _container_stats(container) -> Dict[str, Any]:
    try:
        stats = container.stats(stream=False)
        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - stats['precpu_stats']['cpu_usage']['total_usage']
        system_delta = stats['cpu_stats']['system_cpu_usage'] - stats['precpu_stats']['system_cpu_usage']
        cpu_percent = 0.0
        if system_delta > 0:
            cpu_percent = (cpu_delta / system_delta) * len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100.0

        mem_usage = stats['memory_stats'].get('usage', 0)
        mem_limit = stats['memory_stats'].get('limit', 1)
        mem_percent = (mem_usage / mem_limit) * 100 if mem_limit > 0 else 0

        return {
            "cpu_percent": round(cpu_percent, 2),
            "memory_usage": mem_usage,
            "memory_limit": mem_limit,
            "memory_percent": round(mem_percent, 2)
        }
    except Exception as e:
        return {"error": str(e)}


def _parse_timestamp_local(raw: str) -> str:
    if not raw:
        return ""
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S%z", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S"):
        try:
            dt = datetime.strptime(raw, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=ZoneInfo("UTC"))
            return dt.astimezone(MEL_TZ).isoformat()
        except Exception:
            continue
    try:
        dt = datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo("UTC"))
        return dt.astimezone(MEL_TZ).isoformat()
    except Exception:
        return raw


def _signal_strength(rsrp: str) -> int:
    try:
        value = int(rsrp.replace('dBm', '').strip())
        if value > 0:
            value = -abs(value)
        if value >= -80:
            return 5
        if value >= -90:
            return 4
        if value >= -100:
            return 3
        if value >= -110:
            return 2
        return 1
    except Exception:
        return 0


def _signal_color(strength: int) -> str:
    if strength >= 4:
        return 'green'
    if strength >= 3:
        return 'yellow'
    return 'red'


async def collect_fast(interval: float = 2.0):
    # Warm CPU counters
    system_metrics.warm_cpu_metrics()
    await asyncio.sleep(0.1)
    while True:
        try:
            cpu = system_metrics.get_cpu_metrics()
            memory = system_metrics.get_memory_metrics()
            temp = system_metrics.get_temperature()
            network = system_metrics.get_network_metrics()
            disk = cache_store.snapshot(KEY_DISK)["data"] or {"filesystems": [], "io_stats": {}}

            cache_store.set(KEY_CPU, cpu, ttl=interval * 1.5)
            cache_store.set(KEY_MEMORY, memory, ttl=interval * 1.5)
            cache_store.set(KEY_TEMP, temp, ttl=interval * 2)
            cache_store.set(KEY_NETWORK, network, ttl=interval * 2)
            cache_store.set(KEY_SUMMARY, _build_summary(cpu, memory, temp, disk, network), ttl=interval * 1.5)

            _ensure_history_point(cache_store.snapshot(KEY_SUMMARY)["data"])
            cache_store.set(KEY_HISTORY, list(_history), ttl=interval * 2, stale_ttl=interval * 8)
        except Exception as e:
            logger.error(f"fast collector error: {e}")
        await asyncio.sleep(interval)


async def collect_disk(interval: float = 10.0):
    await asyncio.sleep(0.2)
    while True:
        try:
            disk = await asyncio.to_thread(system_metrics.get_disk_metrics)
            cache_store.set(KEY_DISK, disk, ttl=interval * 1.5, stale_ttl=interval * 6)
        except Exception as e:
            logger.error(f"disk collector error: {e}")
        await asyncio.sleep(interval)


async def collect_usb(interval: float = 15.0):
    await asyncio.sleep(0.3)
    while True:
        try:
            devices = await asyncio.to_thread(parse_lsusb)
            cache_store.set(KEY_USB, {"devices": devices}, ttl=interval * 1.5, stale_ttl=interval * 6)
        except Exception as e:
            logger.error(f"usb collector error: {e}")
        await asyncio.sleep(interval)


async def collect_docker(interval: float = 5.0):
    await asyncio.sleep(0.4)
    while True:
        try:
            client = await asyncio.to_thread(_get_docker_client)
            if not client:
                cache_store.set(KEY_DOCKER, {"containers": [], "error": "Docker not available"}, ttl=interval * 2)
            else:
                containers = await asyncio.to_thread(client.containers.list, all=True)
                container_list = []
                for container in containers:
                    container_info = {
                        "id": container.short_id,
                        "name": container.name,
                        "image": container.image.tags[0] if container.image.tags else container.image.short_id,
                        "status": container.status,
                        "state": container.attrs['State'],
                        "ports": container.ports,
                        "created": container.attrs['Created'],
                    }
                    if container.status == 'running':
                        container_info['stats'] = await asyncio.to_thread(_container_stats, container)
                    else:
                        container_info['stats'] = {}
                    container_list.append(container_info)

                cache_store.set(KEY_DOCKER, {"containers": container_list}, ttl=interval * 1.5, stale_ttl=interval * 4)
        except Exception as e:
            logger.error(f"docker collector error: {e}")
        await asyncio.sleep(interval)


async def collect_health(interval: float = 5.0):
    await asyncio.sleep(0.5)
    while True:
        try:
            # Basic health summary based on temperature and cpu
            summary = cache_store.snapshot(KEY_SUMMARY)["data"]
            status = "healthy"
            if summary:
                temp = summary.get("temperature", {}).get("cpu_temp", 0)
                cpu = summary.get("cpu", {}).get("overall_usage", 0)
                if temp >= 80 or cpu >= 95:
                    status = "critical"
                elif temp >= 70 or cpu >= 85:
                    status = "warning"
            cache_store.set(KEY_HEALTH, {"status": status, "timestamp": _now_iso_mel()}, ttl=interval * 2)
        except Exception as e:
            logger.error(f"health collector error: {e}")
        await asyncio.sleep(interval)


async def collect_dongle(interval: float = 5.0):
    await asyncio.sleep(0.6)
    while True:
        try:
            if not HUAWEI_API_AVAILABLE:
                cache_store.set(KEY_DONGLE, {"error": "Huawei LTE API not available", "connected": False}, ttl=interval * 2)
                cache_store.set(KEY_SMS_FORWARDER, {
                    "active": False,
                    "configured": False,
                    "last_error": "Huawei LTE API not available",
                    "last_sent_at": None,
                    "last_forwarded_sms": None
                }, ttl=interval * 2)
                await asyncio.sleep(interval)
                continue

            modem_ip = os.getenv('MODEM_IP', '192.168.8.1')
            with Connection(f'http://{modem_ip}/') as connection:
                client = Client(connection)

                status = client.device.signal()
                strength = _signal_strength(status.get('rsrp', '0dBm'))
                color = _signal_color(strength)

                device_info = client.device.information()
                try:
                    network_info = client.net.current_plmn()
                except Exception:
                    network_info = {}

                try:
                    traffic = client.monitoring.traffic_statistics()
                except Exception:
                    traffic = {}

                messages = []
                sent_count = 0
                prev_status = cache_store.snapshot(KEY_SMS_FORWARDER).get("data") or {}
                forward_status = {
                    "active": False,
                    "configured": False,
                    "last_error": None,
                    "last_sent_at": prev_status.get("last_sent_at"),
                    "last_forwarded_sms": prev_status.get("last_forwarded_sms")
                }
                db = get_database()
                settings = await db.settings.find_one() or {}
                smtp = settings.get("smtp_settings") or {}
                configured, cfg_reason = smtp_is_configured(smtp)
                forward_status["configured"] = configured
                if not configured:
                    forward_status["last_error"] = cfg_reason
                try:
                    sms_list = client.sms.get_sms_list(box_type=BoxTypeEnum.LOCAL_INBOX)
                    if 'Messages' in sms_list and 'Message' in sms_list['Messages']:
                        raw_messages = sms_list['Messages']['Message']
                        if not isinstance(raw_messages, list):
                            raw_messages = [raw_messages]
                        for message in raw_messages:
                            is_unread = message.get('Smstat') == '0'
                            raw_ts = message.get('Date')
                            local_ts = _parse_timestamp_local(raw_ts)
                            messages.append({
                                "index": message.get('Index'),
                                "timestamp": local_ts or raw_ts,
                                "raw_timestamp": raw_ts,
                                "from": message.get('Phone'),
                                "message": message.get('Content'),
                                "unread": is_unread
                            })
                            if is_unread and configured:
                                subject = f"New SMS from {message.get('Phone', 'Unknown')}"
                                body = (
                                    f"From: {message.get('Phone', '')}\n"
                                    f"Time: {local_ts or raw_ts}\n\n"
                                    f"{message.get('Content', '')}"
                                )
                                try:
                                    await asyncio.to_thread(send_email_sync, smtp, subject, body)
                                    sent_count += 1
                                    forward_status["active"] = True
                                    forward_status["last_sent_at"] = _now_iso_mel()
                                    content = (message.get('Content') or '').strip()
                                    preview = content[:80] + ("..." if len(content) > 80 else "")
                                    forward_status["last_forwarded_sms"] = {
                                        "from": message.get('Phone'),
                                        "timestamp": local_ts or raw_ts,
                                        "preview": preview
                                    }
                                    # Mark forwarded message as read to avoid duplicate forwards.
                                    try:
                                        client.sms.set_read(message.get('Index'))
                                    except Exception:
                                        pass
                                except Exception as e:
                                    forward_status["last_error"] = str(e)
                except Exception as e:
                    logger.error(f"Error fetching SMS: {e}")
                    forward_status["last_error"] = str(e)

                messages.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
                if configured and sent_count == 0 and not forward_status["last_error"]:
                    forward_status["active"] = True

                cache_store.set(KEY_DONGLE, {
                    "signal": {
                        "status": status,
                        "strength": strength,
                        "color": color
                    },
                    "device": device_info,
                    "network": network_info,
                    "traffic": traffic,
                    "sms_messages": messages,
                    "connected": True,
                    "timestamp": _now_iso_mel()
                }, ttl=interval * 1.5, stale_ttl=interval * 4)
                cache_store.set(KEY_SMS_FORWARDER, forward_status, ttl=interval * 2, stale_ttl=interval * 6)
        except Exception as e:
            logger.error(f"dongle collector error: {e}")
            cache_store.set(KEY_DONGLE, {"error": str(e), "connected": False}, ttl=interval * 2)
            cache_store.set(KEY_SMS_FORWARDER, {
                "active": False,
                "configured": False,
                "last_error": str(e),
                "last_sent_at": None,
                "last_forwarded_sms": None
            }, ttl=interval * 2)
        await asyncio.sleep(interval)


async def start_collectors():
    tasks = [
        asyncio.create_task(collect_fast()),
        asyncio.create_task(collect_disk()),
        asyncio.create_task(collect_usb()),
        asyncio.create_task(collect_docker()),
        asyncio.create_task(collect_dongle()),
        asyncio.create_task(collect_health()),
    ]
    return tasks


async def stop_collectors(tasks):
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
