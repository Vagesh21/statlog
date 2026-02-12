# Raspberry Pi 4B Monitor - Installation Guide

## Quick Setup Instructions

### Option 1: Docker (Recommended)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd pi-monitor

# 2. Build and start with Docker Compose
docker-compose up -d

# 3. Access the dashboard
# Frontend: http://localhost:3003
# Backend API: http://localhost:8003/docs
# Default login: admin / password
```

### Option 2: Manual Installation

#### Step 1: Install Dependencies

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Python 3.11+
sudo apt-get install -y python3 python3-pip python3-venv

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Yarn
sudo npm install -g yarn

# Install MongoDB
sudo apt-get install -y mongodb

# Install system tools
sudo apt-get install -y lsusb usbutils
```

#### Step 2: Setup Backend

```bash
cd pi-monitor/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp .env .env.backup  # Backup existing .env
nano .env

# Required changes in .env:
# 1. Add SMTP_APP_PASSWORD (see SMTP Setup below)
# 2. Change JWT_SECRET_KEY to a random string
# 3. Adjust MODEM_IP if needed (default: 192.168.8.1)
```

#### Step 3: Setup Frontend

```bash
cd ../frontend

# Install dependencies
yarn install

# Configure environment (usually no changes needed)
nano .env
# Default: VITE_BACKEND_URL=http://localhost:8003
```

#### Step 4: Start Services

**Option A: Using the start script**
```bash
cd ..
chmod +x start.sh
./start.sh
```

**Option B: Manual start**
```bash
# Terminal 1: Start MongoDB
sudo systemctl start mongodb

# Terminal 2: Start Backend
cd backend
source venv/bin/activate
python -m uvicorn server:app --host 0.0.0.0 --port 8003

# Terminal 3: Start Frontend
cd frontend
yarn dev
```

**Option C: Using systemd (Auto-start on boot)**
```bash
# Copy service files
sudo cp systemd/pi-monitor-backend.service /etc/systemd/system/
sudo cp systemd/pi-monitor-frontend.service /etc/systemd/system/

# Edit paths in service files
sudo nano /etc/systemd/system/pi-monitor-backend.service
# Change /home/pi/pi-monitor to your actual path
# Change User=pi to your username

sudo nano /etc/systemd/system/pi-monitor-frontend.service
# Same changes as above

# Reload systemd
sudo systemctl daemon-reload

# Enable and start services
sudo systemctl enable pi-monitor-backend pi-monitor-frontend
sudo systemctl start pi-monitor-backend pi-monitor-frontend

# Check status
sudo systemctl status pi-monitor-backend
sudo systemctl status pi-monitor-frontend
```

## SMTP Configuration for SMS Forwarding

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Raspberry Pi Monitor"
   - Copy the 16-character password

3. **Add to Dashboard**
   - Login to dashboard (http://localhost:3003)
   - Go to Settings → SMTP Settings
   - Fill in:
     - SMTP Server: smtp.gmail.com
     - Port: 465
     - Security: SSL
     - Username: your_email@gmail.com
     - **App Password: [paste the 16-character password]**
     - From Email: your_email@gmail.com
     - From Name: [your name or phone number]
     - To Email: recipient@example.com
   - Click "Save SMTP Settings"

## First Time Setup

### 1. Login

- URL: http://localhost:3003
- Default credentials: **admin** / **password**
- **IMPORTANT: Change password after first login!**

### 2. Configure Service Links

Navigate to Settings → Service Links:

**Pre-configured services:**
- Jellyfin (Port 8096)
- Portainer (Port 9000)
- qBittorrent (Port 8080)
- Uptime Kuma (Port 3001)
- Home Assistant (Port 8123)
- Immich (Port 2283)
- Homebridge (Port 8581)

**To add/edit services:**
1. Click "Add New Service Link"
2. Fill in: Name, URL, Icon (emoji), Container Name, Description
3. Click "Add Service"
4. Toggle enabled/disabled with the button
5. Click "Save All Changes"

### 3. Configure Thresholds

Settings → General:
- Refresh Rate: 1-10 seconds (default: 2s)
- CPU Warning: 80% (default)
- CPU Critical: 95% (default)
- Temperature Warning: 70°C (default)
- Temperature Critical: 80°C (default)

### 4. Setup Dongle Monitor (if using Huawei E3372)

1. Plug in your Huawei E3372 dongle
2. Verify connection: `ping 192.168.8.1`
3. Check if detected: `lsusb | grep Huawei`
4. Navigate to Dongle Monitor tab in dashboard
5. Configure SMTP settings for SMS forwarding (see above)

## Verification Checklist

After installation, verify:

- [ ] Dashboard loads at http://localhost:3003
- [ ] Login works with admin/password
- [ ] System Metrics shows CPU, RAM, Temperature
- [ ] Storage Devices table displays filesystems
- [ ] USB Devices table shows connected devices
- [ ] Docker Containers tab lists running containers
- [ ] Container actions work (start/stop/restart)
- [ ] Dongle Monitor shows dongle status (if connected)
- [ ] SMS messages appear (if dongle connected)
- [ ] Settings can be saved
- [ ] Service links redirect correctly

## Troubleshooting

### Backend won't start

```bash
# Check logs
cd /app/backend
python -m uvicorn server:app --host 0.0.0.0 --port 8003

# Common issues:
# 1. Port already in use
sudo lsof -i :8003
# Kill process: sudo kill -9 <PID>

# 2. MongoDB not running
sudo systemctl status mongodb
sudo systemctl start mongodb

# 3. Missing dependencies
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend won't start

```bash
# Check Node.js version (should be 18+)
node --version

# Reinstall dependencies
cd /app/frontend
rm -rf node_modules yarn.lock
yarn install

# Check if port 3003 is available
sudo lsof -i :3003
```

### Docker monitoring not working

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Test Docker access
docker ps

# Restart backend
sudo systemctl restart pi-monitor-backend
```

### Dongle not detected

```bash
# Check if dongle is connected
lsusb | grep Huawei

# Check if dongle is accessible
ping 192.168.8.1

# Verify MODEM_IP in .env
cat /app/backend/.env | grep MODEM_IP

# Check Huawei API installation
source /app/backend/venv/bin/activate
python -c "import huawei_lte_api; print('OK')"
```

### Temperature sensor not found

```bash
# Check thermal zone (Raspberry Pi 4B)
cat /sys/class/thermal/thermal_zone0/temp

# Should output a number like 45000 (45°C)
# If file doesn't exist, update system:
sudo apt-get update && sudo apt-get upgrade
sudo reboot
```

## Performance Tuning

### Reduce CPU usage

1. Increase refresh rate: Settings → General → Refresh Rate: 5s
2. Reduce historical data: Edit Dashboard.jsx, change `slice(-450)` to `slice(-150)`
3. Disable unused monitoring: Comment out routes in server.py

### Reduce memory usage

1. Stop unused containers: `docker stop <container_name>`
2. Limit historical data in MongoDB
3. Use Docker deployment (more efficient than manual)

## Security Hardening

### 1. Change Default Credentials

```bash
# Via API
curl -X POST http://localhost:8003/api/auth/register \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "strong-password"}'
```

### 2. Generate Strong JWT Secret

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Add output to backend/.env as JWT_SECRET_KEY
```

### 3. Setup Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name your-pi-hostname.local;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8003;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
    }
}
```

### 4. Setup SSL (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Backup & Restore

### Backup Settings

```bash
# Export MongoDB settings
mongodump --db pi_monitor --out /backup/pi_monitor_$(date +%Y%m%d)

# Backup environment files
cp /app/backend/.env /backup/backend.env
cp /app/frontend/.env /backup/frontend.env
```

### Restore Settings

```bash
# Import MongoDB settings
mongorestore --db pi_monitor /backup/pi_monitor_<date>/pi_monitor

# Restore environment files
cp /backup/backend.env /app/backend/.env
cp /backup/frontend.env /app/frontend/.env
```

## Updates

### Update Application

```bash
cd /app
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade
sudo systemctl restart pi-monitor-backend

# Update frontend
cd ../frontend
yarn install
sudo systemctl restart pi-monitor-frontend
```

## Support

- GitHub Issues: https://github.com/yourusername/pi-monitor/issues
- Documentation: See README.md
- API Docs: http://localhost:8003/docs

## References

- Huawei LTE API: https://github.com/Salamek/huawei-lte-api
- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/
- MongoDB: https://www.mongodb.com/docs/
