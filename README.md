# Raspberry Pi 4B Monitoring Dashboard

A comprehensive, production-ready web dashboard for Raspberry Pi 4B that shows live system health and device details with a modern, interactive UI.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-green)
![Platform](https://img.shields.io/badge/Platform-Raspberry%20Pi%204B-red)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🌟 Features

### System Monitoring
- **CPU Metrics**: Overall usage %, per-core usage, frequency, load averages (1/5/15 min)
- **Memory**: RAM usage, swap usage with real-time stats
- **Temperature**: CPU temperature monitoring with warning thresholds (70°C yellow, 80°C red)
- **Storage**: All mounted filesystems, external drives (USB HDD/SSD), disk I/O rates
- **Network**: Active interfaces (eth0, wlan0, tailscale0), IP addresses, live throughput (rx/tx)
- **USB Devices**: Parsed lsusb output in clean table format

### Docker Integration
- List all running containers with stats
- Container CPU % and memory usage
- Container status (running/exited) with health indicators
- Start/Stop/Restart container actions
- Real-time container monitoring

### Huawei E3372 Dongle Monitor
- Signal strength with visual bars (5-level indicator)
- Network status and device information
- Data usage tracking
- **SMS Management**: View, read, and delete SMS messages
- **Auto Email Forwarding**: New SMS automatically forwarded to configured email
- Signal quality indicators (green/yellow/red)

### Modern UI/UX
- **Dark Theme**: Professional dark mode with smooth animations
- **Real-time Updates**: Auto-refresh every 1-3 seconds (configurable)
- **Interactive Charts**:
  - Speedometer/gauge for CPU and Temperature
  - Donut indicators for RAM and Disk usage
  - Line charts for historical data (last 15 minutes)
  - Network live chart with rx/tx lines
- **Status Tiles**: Big summary tiles with health indicators
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Search & Filters**: Search Docker containers and USB devices
- **Tooltips**: Helpful explanations for each metric

### Quick Access Links
- Pre-configured links to common services:
  - Jellyfin (Media Server)
  - Portainer (Docker Management)
  - qBittorrent (Torrent Client)
  - Uptime Kuma (Uptime Monitoring)
  - Home Assistant (Home Automation)
  - Immich (Photo Management)
  - Homebridge (HomeKit Bridge)
- Add/remove/edit service links via Settings
- Show/hide services based on preference
- One-click access to all your services

### Additional Features
- **Authentication**: Secure login system (default: admin/password)
- **Settings Panel**: Configure SMTP, API keys, thresholds, refresh rates
- **Calendar Integration**: Google Calendar support (OAuth setup included)
- **Anime/Movie Tracking**: AniList/MyAnimeList integration ready
- **Widgets Support**: Extensible widget system for future integrations

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/pi-monitor.git
cd pi-monitor

# Start all services
docker-compose up -d

# Access the dashboard
# Frontend: http://localhost:3003
# Backend API: http://localhost:8003
# API Docs: http://localhost:8003/docs
```

### Manual Installation (Raspberry Pi 4B)

#### Prerequisites
- Raspberry Pi 4B running Debian/Kali Linux (ARM64)
- Python 3.9+
- Node.js 18+
- MongoDB
- Docker (for container monitoring)

#### Backend Setup

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv mongodb lsusb usbutils

# Create virtual environment
cd pi-monitor/backend
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your SMTP_APP_PASSWORD
nano .env

# Start backend
uvicorn server:app --host 0.0.0.0 --port 8003
```

#### Frontend Setup

```bash
# Install Node.js dependencies
cd ../frontend
yarn install

# Configure environment
cp .env.example .env
# Edit .env if needed (default: http://localhost:8003)

# Start frontend
yarn dev
```

#### MongoDB Setup

```bash
# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Systemd Service (Auto-start on boot)

```bash
# Copy service files
sudo cp systemd/pi-monitor-backend.service /etc/systemd/system/
sudo cp systemd/pi-monitor-frontend.service /etc/systemd/system/

# Edit the service files to match your paths
sudo nano /etc/systemd/system/pi-monitor-backend.service
sudo nano /etc/systemd/system/pi-monitor-frontend.service

# Reload systemd
sudo systemctl daemon-reload

# Enable and start services
sudo systemctl enable pi-monitor-backend
sudo systemctl enable pi-monitor-frontend
sudo systemctl start pi-monitor-backend
sudo systemctl start pi-monitor-frontend

# Check status
sudo systemctl status pi-monitor-backend
sudo systemctl status pi-monitor-frontend
```

## ⚙️ Configuration

### SMTP Settings (For SMS Email Forwarding)

**Location**: Settings → SMTP Settings → App Password

1. Go to your Gmail account
2. Enable 2-Factor Authentication
3. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
4. Add the app password in Settings:
   - Navigate to Settings → SMTP Settings
   - Fill in your email details
   - **Paste the app password in the "App Password" field**
   - Click "Save SMTP Settings"

### Dongle Configuration

- Default IP: `192.168.8.1` (Huawei E3372 default)
- Change in `backend/.env` if your dongle uses a different IP:
  ```
  MODEM_IP=192.168.8.1
  ```

### Service Links

1. Navigate to Settings → Service Links
2. Pre-configured services:
   - Jellyfin, Portainer, qBittorrent, Uptime Kuma, Home Assistant, Immich, Homebridge
3. Add new services:
   - Click "Add New Service Link"
   - Fill in Name, URL, Icon (emoji), Container Name (optional)
   - Click "Add Service"
4. Enable/disable services by clicking the toggle button
5. Delete services using the trash icon

### API Keys

**Google Calendar**:
1. Go to Google Cloud Console
2. Create a new project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Download credentials JSON
6. Paste in Settings → API Keys → Google Calendar Credentials

**Anime/Movie Tracking**:
- AniList: Get API keys from https://anilist.co/settings/developer
- MyAnimeList: Get API keys from https://myanimelist.net/apiconfig

### Thresholds

Configure warning and critical thresholds in Settings → General:
- CPU Warning: 80% (default)
- CPU Critical: 95% (default)
- Temperature Warning: 70°C (default)
- Temperature Critical: 80°C (default)
- Refresh Rate: 1-10 seconds (default: 2s)

## 📡 API Endpoints

### Health & Metrics
- `GET /api/health` - Overall system health
- `GET /api/metrics/all` - All system metrics in one call
- `GET /api/metrics/cpu` - CPU metrics
- `GET /api/metrics/memory` - Memory metrics
- `GET /api/metrics/temperature` - Temperature
- `GET /api/metrics/disk` - Disk usage
- `GET /api/metrics/network` - Network stats

### Docker
- `GET /api/docker/containers` - List all containers with stats
- `POST /api/docker/containers/{id}/start` - Start container
- `POST /api/docker/containers/{id}/stop` - Stop container
- `POST /api/docker/containers/{id}/restart` - Restart container

### Dongle
- `GET /api/dongle/status` - Dongle status and SMS messages
- `POST /api/dongle/sms/{index}/delete` - Delete SMS message

### USB
- `GET /api/usb/devices` - List all USB devices

### Settings
- `GET /api/settings/` - Get all settings
- `PUT /api/settings/` - Update settings
- `POST /api/settings/service-links` - Add service link
- `PUT /api/settings/service-links/{id}` - Update service link
- `DELETE /api/settings/service-links/{id}` - Delete service link
- `PUT /api/settings/smtp` - Update SMTP settings
- `PUT /api/settings/api-keys` - Update API keys

### Authentication
- `POST /api/auth/login` - Login (returns JWT token)
- `GET /api/auth/me` - Get current user

Full API documentation available at: `http://localhost:8003/docs`

## 🐳 Docker Deployment

### Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### ARM64 Support

The Docker images are automatically built for ARM64 (Raspberry Pi 4B). If you're building on a different architecture:

```bash
# Build for ARM64
docker buildx build --platform linux/arm64 -t pi-monitor-backend -f Dockerfile.backend .
docker buildx build --platform linux/arm64 -t pi-monitor-frontend -f Dockerfile.frontend .
```

## 🔒 Security

### Default Credentials
- **Username**: admin
- **Password**: password

**⚠️ IMPORTANT**: Change the default password after first login!

### JWT Secret

Change the JWT secret in `backend/.env`:
```
JWT_SECRET_KEY=your-secret-key-change-this-in-production
```

Generate a secure random key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Reverse Proxy (Optional)

For production deployment, use nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🛠️ Troubleshooting

### Backend Issues

```bash
# Check backend logs
sudo journalctl -u pi-monitor-backend -f

# Check if backend is running
sudo systemctl status pi-monitor-backend

# Restart backend
sudo systemctl restart pi-monitor-backend
```

### Frontend Issues

```bash
# Check frontend logs
sudo journalctl -u pi-monitor-frontend -f

# Check if frontend is running
sudo systemctl status pi-monitor-frontend

# Restart frontend
sudo systemctl restart pi-monitor-frontend
```

### Docker Not Available

If Docker monitoring shows "Docker not available":
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Restart Docker
sudo systemctl restart docker

# Restart backend
sudo systemctl restart pi-monitor-backend
```

### Dongle Not Connected

1. Check if dongle is plugged in: `lsusb | grep Huawei`
2. Verify dongle IP: `ping 192.168.8.1`
3. Check MODEM_IP in `backend/.env`
4. Restart backend service

### Temperature Sensor Not Found

On Raspberry Pi 4B:
```bash
# Check if thermal zone exists
cat /sys/class/thermal/thermal_zone0/temp

# If not found, ensure system packages are updated
sudo apt-get update && sudo apt-get upgrade
```

## 📊 Performance & Caching

- **System Metrics**: No caching, real-time data
- **Docker Stats**: 3-second cache to reduce API load
- **Dongle Status**: 5-second cache
- **Historical Data**: 15 minutes rolling window (450 data points at 2s intervals)

## 🎨 Customization

### Adding New Widgets

1. Create widget component in `frontend/src/components/widgets/`
2. Add widget to Dashboard or create new route
3. Connect to backend API if needed

### Changing Theme Colors

Edit `frontend/tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      dark: {
        bg: '#0f172a',      // Main background
        card: '#1e293b',    // Card background
        hover: '#334155',   // Hover state
        border: '#475569'   // Border color
      }
    }
  }
}
```

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review API documentation at `/docs`

## 🙏 Acknowledgments

- Built with FastAPI, React, MongoDB, and Docker
- Huawei LTE API by Salamek
- Chart components by Recharts
- Icons by Lucide React
- Reference project: [portlog](https://github.com/Vagesh21/portlog)
- Dongle monitor integration: [dongle_monitor](https://github.com/Vagesh21/dongle_monitor)

## 🗺️ Roadmap

- [ ] Calendar view integration
- [ ] Anime/movie release tracking
- [ ] Custom widget creation UI
- [ ] Multi-user support
- [ ] Email notifications for system alerts
- [ ] Mobile app (React Native)
- [ ] Backup/restore settings
- [ ] Dark/Light theme toggle
- [ ] Export metrics to CSV/JSON
- [ ] Grafana integration

---

**Made with ❤️ for Raspberry Pi 4B**
