# Raspberry Pi Monitor - Quick Reference Card

## 🚀 Quick Start

```bash
# Clone and start
git clone <your-repo-url> pi-monitor
cd pi-monitor
docker-compose up -d

# Access
http://localhost:3003
Login: admin / password
```

## 📍 Important Locations

### SMTP App Password
**Where to add**: Settings → SMTP Settings → App Password field

**How to get**:
1. Gmail → Account → Security → 2-Step Verification
2. App passwords → Mail → Generate
3. Copy 16-character password
4. Paste in dashboard Settings

### Service URLs
- Frontend: `http://localhost:3003`
- Backend API: `http://localhost:8003`
- API Docs: `http://localhost:8003/docs`
- MongoDB: `mongodb://localhost:27017/pi_monitor`

### Configuration Files
- Backend config: `/app/backend/.env`
- Frontend config: `/app/frontend/.env`
- Docker config: `/app/docker-compose.yml`

## 🔧 Essential Commands

### Docker
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Rebuild
docker-compose build --no-cache
```

### Systemd
```bash
# Start services
sudo systemctl start pi-monitor-backend
sudo systemctl start pi-monitor-frontend

# Stop services
sudo systemctl stop pi-monitor-backend
sudo systemctl stop pi-monitor-frontend

# Check status
sudo systemctl status pi-monitor-backend
sudo systemctl status pi-monitor-frontend

# View logs
sudo journalctl -u pi-monitor-backend -f
sudo journalctl -u pi-monitor-frontend -f

# Enable on boot
sudo systemctl enable pi-monitor-backend
sudo systemctl enable pi-monitor-frontend
```

### Manual Start
```bash
# Start MongoDB
sudo systemctl start mongodb

# Start backend
cd /app/backend
source venv/bin/activate
python -m uvicorn server:app --host 0.0.0.0 --port 8003

# Start frontend (new terminal)
cd /app/frontend
yarn dev
```

## 🔑 Default Credentials

**Dashboard Login:**
- Username: `admin`
- Password: `password`

**⚠️ CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN!**

## 📝 Key Environment Variables

### Backend (.env)
```env
# MongoDB
MONGO_URL=mongodb://localhost:27017/pi_monitor

# Security
JWT_SECRET_KEY=<generate-random-string>
JWT_EXPIRATION_MINUTES=10080

# Dongle
MODEM_IP=192.168.8.1

# SMTP (ADD YOUR PASSWORD HERE)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=your_email@gmail.com
SMTP_APP_PASSWORD=<your-16-char-app-password>
EMAIL_FROM=your_email@gmail.com
EMAIL_TO=recipient@example.com
```

### Frontend (.env)
```env
VITE_BACKEND_URL=http://localhost:8003
```

## 🎯 Quick Checks

### Is Backend Running?
```bash
curl http://localhost:8003/api/health
```

### Is Frontend Running?
```bash
curl http://localhost:3003
```

### Is MongoDB Running?
```bash
pgrep mongod
# or
sudo systemctl status mongodb
```

### Is Dongle Connected?
```bash
lsusb | grep Huawei
ping 192.168.8.1
```

### Check Docker Containers
```bash
docker ps
```

## 🐛 Quick Fixes

### Port Already in Use
```bash
# Find process
sudo lsof -i :8003  # Backend
sudo lsof -i :3003  # Frontend

# Kill process
sudo kill -9 <PID>
```

### Docker Permission Denied
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### MongoDB Not Starting
```bash
sudo systemctl restart mongodb
sudo systemctl status mongodb
```

### Frontend Build Fails
```bash
cd /app/frontend
rm -rf node_modules yarn.lock
yarn install
```

### Backend Import Errors
```bash
cd /app/backend
source venv/bin/activate
pip install -r requirements.txt --upgrade
```

## 📊 Dashboard Navigation

- **Dashboard** (Home): Overview with gauges and charts
- **System Metrics**: Detailed storage and USB devices
- **Docker Containers**: Container management
- **Dongle Monitor**: Huawei E3372 status and SMS
- **Settings**: Configure everything

## ⚙️ Settings Tabs

1. **Service Links**: Add/remove quick access links
2. **SMTP Settings**: Configure email forwarding
3. **API Keys**: Google Calendar, AniList credentials
4. **General**: Thresholds and refresh rate

## 🔗 Pre-configured Services

Update URLs in Settings → Service Links:
- Jellyfin: Port 8096
- Portainer: Port 9000
- qBittorrent: Port 8080
- Uptime Kuma: Port 3001
- Home Assistant: Port 8123
- Immich: Port 2283
- Homebridge: Port 8581

## 🎨 Customization

### Change Refresh Rate
Dashboard → Top right → Refresh rate dropdown (1-10s)

### Adjust Thresholds
Settings → General → Temperature/CPU thresholds

### Add Service
Settings → Service Links → Add New Service Link

### Change Theme Colors
Edit: `/app/frontend/tailwind.config.js`

## 📈 API Quick Test

```bash
# Get JWT token
TOKEN=$(curl -X POST http://localhost:8003/api/auth/login \
  -F "username=admin" \
  -F "password=password" \
  | jq -r '.access_token')

# Get all metrics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8003/api/metrics/all

# Get containers
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8003/api/docker/containers

# Get dongle status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8003/api/dongle/status
```

## 🆘 Emergency Restart

```bash
# Stop everything
docker-compose down
sudo systemctl stop pi-monitor-*
pkill -f uvicorn
pkill -f node

# Clean restart
sudo systemctl restart mongodb
docker-compose up -d
# or
./start.sh
```

## 📖 Full Documentation

- **README.md**: Overview and features
- **INSTALLATION.md**: Detailed setup guide
- **PROJECT_SUMMARY.md**: Technical documentation
- **FEATURES.md**: Complete feature list

## 💡 Tips

1. **First Login**: Change default password immediately
2. **SMTP Setup**: Required for SMS email forwarding
3. **Dongle**: Plug in Huawei E3372 before starting
4. **Docker**: Add user to docker group for monitoring
5. **Production**: Change JWT secret and use HTTPS
6. **Backup**: Export MongoDB settings regularly
7. **Updates**: `git pull` then restart services

## 🔒 Security Checklist

- [ ] Changed admin password
- [ ] Updated JWT_SECRET_KEY
- [ ] Configured SMTP app password
- [ ] Setup reverse proxy (nginx)
- [ ] Enabled HTTPS (Let's Encrypt)
- [ ] Configured firewall
- [ ] Limited MongoDB access
- [ ] Regular backups enabled

## 📞 Support

- GitHub Issues: https://github.com/yourusername/pi-monitor/issues
- API Documentation: http://localhost:8003/docs
- Check Logs: `sudo journalctl -u pi-monitor-* -f`

---

**Keep this card handy for quick reference!**

Last Updated: 2025-02-09 | Version: 1.0.0
