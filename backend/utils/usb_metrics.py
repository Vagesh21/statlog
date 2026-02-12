import subprocess
import re
from typing import List, Dict


def parse_lsusb() -> List[Dict]:
    result = subprocess.run(['lsusb'], capture_output=True, text=True, timeout=5)
    devices: List[Dict] = []
    for line in result.stdout.strip().split('\n'):
        if not line:
            continue
        match = re.match(r'Bus (\d+) Device (\d+): ID ([0-9a-f]+):([0-9a-f]+)\s+(.*)', line)
        if match:
            devices.append({
                "bus": match.group(1),
                "device": match.group(2),
                "vendor_id": match.group(3),
                "product_id": match.group(4),
                "description": match.group(5).strip()
            })
    return devices
