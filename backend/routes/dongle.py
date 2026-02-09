from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_user
from utils.database import get_database
import os
import smtplib
from email.mime.text import MIMEText
import logging
from typing import Dict
import time

try:
    from huawei_lte_api.Client import Client
    from huawei_lte_api.Connection import Connection
    from huawei_lte_api.enums.sms import BoxTypeEnum
    HUAWEI_API_AVAILABLE = True
except ImportError:
    HUAWEI_API_AVAILABLE = False

router = APIRouter(prefix="/api/dongle", tags=["dongle"])

# Cache for dongle data
cache_timeout = 5  # 5 seconds
last_cache_time = 0
cached_dongle_data = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_signal_strength(rsrp):
    """Calculate signal strength from RSRP value"""
    try:
        rsrp = int(rsrp.replace('dBm', ''))
        if rsrp >= -80:
            return 5
        elif rsrp >= -90:
            return 4
        elif rsrp >= -100:
            return 3
        elif rsrp >= -110:
            return 2
        else:
            return 1
    except (ValueError, AttributeError):
        return 0

def get_signal_color(strength):
    """Get color based on signal strength"""
    if strength >= 4:
        return 'green'
    elif strength >= 3:
        return 'yellow'
    else:
        return 'red'

async def send_sms_email(subject: str, body: str):
    """Send SMS notification via email"""
    db = get_database()
    settings = await db.settings.find_one()
    
    if not settings or not settings.get('smtp_settings'):
        logger.error("SMTP settings not configured")
        return False
    
    smtp = settings['smtp_settings']
    
    if not smtp.get('app_password'):
        logger.error("SMTP app password not set")
        return False
    
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = f"{smtp.get('email_from_name', 'Dongle')} <{smtp.get('email_from')}>"
    msg['To'] = smtp.get('email_to')
    
    try:
        if smtp.get('secure') == 'ssl':
            with smtplib.SMTP_SSL(smtp.get('server'), smtp.get('port', 465)) as server:
                server.login(smtp.get('username'), smtp.get('app_password'))
                server.send_message(msg)
        elif smtp.get('secure') == 'tls':
            with smtplib.SMTP(smtp.get('server'), smtp.get('port', 587)) as server:
                server.starttls()
                server.login(smtp.get('username'), smtp.get('app_password'))
                server.send_message(msg)
        logger.info(f"SMS email sent to {smtp.get('email_to')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS email: {e}")
        return False

async def get_dongle_data() -> Dict:
    """Fetch data from Huawei E3372 dongle"""
    if not HUAWEI_API_AVAILABLE:
        return {"error": "Huawei LTE API not available. Install: pip install huawei-lte-api"}
    
    modem_ip = os.getenv('MODEM_IP', '192.168.8.1')
    
    try:
        with Connection(f'http://{modem_ip}/') as connection:
            client = Client(connection)
            
            # Get signal status
            status = client.device.signal()
            signal_strength = get_signal_strength(status.get('rsrp', '0dBm'))
            signal_color = get_signal_color(signal_strength)
            
            # Get device info
            device_info = client.device.information()
            
            # Get network info
            try:
                network_info = client.net.current_plmn()
            except:
                network_info = {}
            
            # Get data usage
            try:
                traffic = client.monitoring.traffic_statistics()
            except:
                traffic = {}
            
            # Get SMS messages
            messages = []
            try:
                sms_list = client.sms.get_sms_list(box_type=BoxTypeEnum.LOCAL_INBOX)
                
                if 'Messages' in sms_list and 'Message' in sms_list['Messages']:
                    raw_messages = sms_list['Messages']['Message']
                    if not isinstance(raw_messages, list):
                        raw_messages = [raw_messages]
                    
                    for message in raw_messages:
                        is_unread = message.get('Smstat') == '0'
                        messages.append({
                            "index": message.get('Index'),
                            "timestamp": message.get('Date'),
                            "from": message.get('Phone'),
                            "message": message.get('Content'),
                            "unread": is_unread
                        })
                        
                        # Send email for unread messages
                        if is_unread:
                            await send_sms_email(
                                f"New SMS from {message.get('Phone')}",
                                message.get('Content')
                            )
                            # Mark as read
                            try:
                                client.sms.set_read(message.get('Index'))
                            except:
                                pass
            except Exception as e:
                logger.error(f"Error fetching SMS: {e}")
            
            messages.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return {
                "signal": {
                    "status": status,
                    "strength": signal_strength,
                    "color": signal_color
                },
                "device": device_info,
                "network": network_info,
                "traffic": traffic,
                "sms_messages": messages,
                "connected": True
            }
    
    except Exception as e:
        logger.error(f"Error connecting to dongle: {e}")
        return {
            "error": str(e),
            "connected": False
        }

@router.get("/status")
async def dongle_status(current_user: dict = Depends(get_current_user)):
    """Get dongle status with caching"""
    global cached_dongle_data, last_cache_time
    
    current_time = time.time()
    if cached_dongle_data and (current_time - last_cache_time) < cache_timeout:
        return cached_dongle_data
    
    data = await get_dongle_data()
    cached_dongle_data = data
    last_cache_time = current_time
    
    return data

@router.post("/sms/{message_index}/delete")
async def delete_sms(message_index: int, current_user: dict = Depends(get_current_user)):
    """Delete an SMS message"""
    if not HUAWEI_API_AVAILABLE:
        raise HTTPException(status_code=500, detail="Huawei LTE API not available")
    
    modem_ip = os.getenv('MODEM_IP', '192.168.8.1')
    
    try:
        with Connection(f'http://{modem_ip}/') as connection:
            client = Client(connection)
            client.sms.delete_sms(message_index)
        return {"message": "SMS deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting SMS: {str(e)}")
