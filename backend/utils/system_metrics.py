import psutil
import os
from typing import Dict, List

def get_cpu_metrics() -> Dict:
    """Get CPU metrics including usage, per-core, frequency, and load averages."""
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_per_core = psutil.cpu_percent(interval=1, percpu=True)
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
    partitions = psutil.disk_partitions()
    disk_info = []
    
    for partition in partitions:
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
        except PermissionError:
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
