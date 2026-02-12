import psutil
import os
from typing import Dict, List

PSEUDO_FS = {
    "proc", "sysfs", "tmpfs", "devtmpfs", "cgroup", "cgroup2", "overlay",
    "squashfs", "nsfs", "mqueue", "autofs", "securityfs", "pstore",
    "debugfs", "tracefs", "fusectl", "rpc_pipefs", "configfs",
    "devpts", "bpf", "binfmt_misc"
}

HOST_ROOT = "/host"

def warm_cpu_metrics() -> None:
    """Prime CPU counters to avoid blocking intervals on first read."""
    try:
        psutil.cpu_percent(interval=None)
        psutil.cpu_percent(interval=None, percpu=True)
    except Exception:
        pass

def get_cpu_metrics() -> Dict:
    """Get CPU metrics including usage, per-core, frequency, and load averages."""
    cpu_percent = psutil.cpu_percent(interval=None)
    cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)
    cpu_freq = psutil.cpu_freq()
    load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else (0, 0, 0)
    
    return {
        "overall_usage": cpu_percent,
        "per_core_usage": cpu_per_core,
        "current_frequency": cpu_freq.current if cpu_freq else 0,
        "load_average": {
            "1_min": load_avg[0],
            "5_min": load_avg[1],
            "15_min": load_avg[2]
        }
    }

def get_memory_metrics() -> Dict:
    """Get RAM and swap memory metrics."""
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    return {
        "total": mem.total,
        "used": mem.used,
        "available": mem.available,
        "percent": mem.percent,
        "swap_total": swap.total,
        "swap_used": swap.used,
        "swap_percent": swap.percent
    }

def get_temperature() -> Dict:
    """Get CPU temperature."""
    try:
        # Try reading from Raspberry Pi thermal zone
        if os.path.exists('/sys/class/thermal/thermal_zone0/temp'):
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = float(f.read().strip()) / 1000.0
                return {"cpu_temp": temp, "unit": "C"}
        
        # Fallback to psutil sensors_temperatures
        temps = psutil.sensors_temperatures()
        if temps:
            for name, entries in temps.items():
                for entry in entries:
                    if entry.current:
                        return {"cpu_temp": entry.current, "unit": "C"}
        
        return {"cpu_temp": 0, "unit": "C", "error": "Temperature sensor not found"}
    except Exception as e:
        return {"cpu_temp": 0, "unit": "C", "error": str(e)}

def get_disk_metrics() -> Dict:
    """Get disk usage for all mounted filesystems."""
    disk_info = []
    seen_mountpoints = set()

    def _is_noise_mount(mountpoint: str) -> bool:
        if mountpoint in ("/etc/hosts", "/etc/hostname", "/etc/resolv.conf"):
            return True
        if mountpoint.startswith("/proc") or mountpoint.startswith("/sys"):
            return True
        if mountpoint.startswith("/dev") and not mountpoint.startswith("/dev/disk"):
            return True
        return False

    def _sort_key(fs: Dict) -> tuple:
        mountpoint = fs.get("mountpoint", "")
        device = fs.get("device", "")
        total = int(fs.get("total", 0) or 0)
        is_root = mountpoint == "/"
        is_boot = mountpoint == "/boot" or mountpoint.startswith("/boot/")
        is_dev_block = device.startswith("/dev/")

        # Root filesystem should be first (dashboard uses filesystems[0]).
        # Keep boot partitions after primary filesystems, and larger volumes earlier.
        return (
            0 if is_root else 1 if not is_boot else 2,
            0 if is_dev_block else 1,
            -total,
            mountpoint,
        )

    # Prefer host mounts when backend runs in Docker and host root is mounted.
    host_mounts_file = os.path.join(HOST_ROOT, "proc", "mounts")
    if os.path.exists(host_mounts_file):
        try:
            with open(host_mounts_file, "r", encoding="utf-8") as f:
                for line in f:
                    parts = line.split()
                    if len(parts) < 3:
                        continue
                    device, mountpoint, fstype = parts[0], parts[1], parts[2]
                    if mountpoint == "/host":
                        mountpoint = "/"
                    elif mountpoint.startswith("/host/"):
                        mountpoint = mountpoint[len("/host"):]
                    if fstype in PSEUDO_FS:
                        continue
                    if _is_noise_mount(mountpoint):
                        continue
                    if mountpoint in seen_mountpoints:
                        continue
                    host_path = os.path.join(HOST_ROOT, mountpoint.lstrip("/"))
                    if not os.path.exists(host_path):
                        continue
                    try:
                        stat = os.statvfs(host_path)
                        total = stat.f_frsize * stat.f_blocks
                        free = stat.f_frsize * stat.f_bavail
                        used = total - free
                        percent = (used / total * 100) if total else 0
                        disk_info.append({
                            "device": device,
                            "mountpoint": mountpoint,
                            "fstype": fstype,
                            "total": total,
                            "used": used,
                            "free": free,
                            "percent": percent
                        })
                        seen_mountpoints.add(mountpoint)
                    except OSError:
                        continue
        except OSError:
            pass

    # Fallback to container-visible partitions for local/non-docker runs.
    if not disk_info:
        partitions = psutil.disk_partitions(all=True)
        for partition in partitions:
            if partition.fstype in PSEUDO_FS:
                continue
            if _is_noise_mount(partition.mountpoint):
                continue
            if partition.mountpoint in seen_mountpoints:
                continue
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disk_info.append({
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "total": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percent": usage.percent
                })
                seen_mountpoints.add(partition.mountpoint)
            except (PermissionError, FileNotFoundError):
                continue
    
    # IO stats
    try:
        io_counters = psutil.disk_io_counters()
        io_stats = {
            "read_bytes": io_counters.read_bytes,
            "write_bytes": io_counters.write_bytes,
            "read_count": io_counters.read_count,
            "write_count": io_counters.write_count
        }
    except:
        io_stats = {}

    disk_info.sort(key=_sort_key)
    
    return {
        "filesystems": disk_info,
        "io_stats": io_stats
    }

def get_network_metrics() -> Dict:
    """Get network interfaces and statistics."""
    interfaces = []
    
    for interface_name, addrs in psutil.net_if_addrs().items():
        interface_info = {"name": interface_name, "addresses": []}
        
        for addr in addrs:
            if addr.family == 2:  # AF_INET (IPv4)
                interface_info["addresses"].append({
                    "type": "IPv4",
                    "address": addr.address,
                    "netmask": addr.netmask
                })
            elif addr.family == 10:  # AF_INET6 (IPv6)
                interface_info["addresses"].append({
                    "type": "IPv6",
                    "address": addr.address
                })
        
        interfaces.append(interface_info)
    
    # Network IO stats
    try:
        io_counters = psutil.net_io_counters(pernic=True)
        net_stats = {}
        for interface, stats in io_counters.items():
            net_stats[interface] = {
                "bytes_sent": stats.bytes_sent,
                "bytes_recv": stats.bytes_recv,
                "packets_sent": stats.packets_sent,
                "packets_recv": stats.packets_recv
            }
    except:
        net_stats = {}
    
    return {
        "interfaces": interfaces,
        "stats": net_stats
    }
