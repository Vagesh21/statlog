from fastapi import APIRouter, Depends, HTTPException
import subprocess
import re
from typing import List, Dict
from routes.auth import get_current_user

router = APIRouter(prefix="/api/usb", tags=["usb"])

def parse_lsusb() -> List[Dict]:
    """Parse lsusb output into structured data"""
    try:
        result = subprocess.run(['lsusb'], capture_output=True, text=True, timeout=5)
        devices = []
        
        for line in result.stdout.strip().split('\n'):
            if line:
                # Parse: Bus 001 Device 003: ID 1234:5678 Vendor Product Name
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing lsusb: {str(e)}")

@router.get("/devices")
async def get_usb_devices(current_user: dict = Depends(get_current_user)):
    """Get all connected USB devices"""
    return {"devices": parse_lsusb()}
