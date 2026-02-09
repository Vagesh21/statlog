#!/bin/bash

# Raspberry Pi Monitor - Pre-flight Check Script

echo "==================================="
echo "Raspberry Pi Monitor - Pre-flight Check"
echo "==================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        ERRORS=$((ERRORS + 1))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# Check Python
echo "Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    print_status 0 "Python installed: $PYTHON_VERSION"
    
    # Check if version is 3.9+
    MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
    MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)
    if [ $MAJOR -ge 3 ] && [ $MINOR -ge 9 ]; then
        print_status 0 "Python version >= 3.9"
    else
        print_warning "Python version should be 3.9 or higher"
    fi
else
    print_status 1 "Python not found"
fi

# Check Node.js
echo -e "\nChecking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status 0 "Node.js installed: $NODE_VERSION"
else
    print_status 1 "Node.js not found"
fi

# Check Yarn
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn --version)
    print_status 0 "Yarn installed: $YARN_VERSION"
else
    print_warning "Yarn not found (optional, but recommended)"
fi

# Check MongoDB
echo -e "\nChecking MongoDB..."
if command -v mongod &> /dev/null; then
    print_status 0 "MongoDB installed"
    
    # Check if MongoDB is running
    if pgrep -x mongod > /dev/null; then
        print_status 0 "MongoDB is running"
    else
        print_warning "MongoDB is not running"
    fi
else
    print_status 1 "MongoDB not found"
fi

# Check Docker
echo -e "\nChecking Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_status 0 "Docker installed: $DOCKER_VERSION"
    
    # Check if Docker is running
    if docker ps &> /dev/null; then
        print_status 0 "Docker is running"
    else
        print_warning "Docker is not running or user lacks permissions"
    fi
else
    print_warning "Docker not found (optional for container monitoring)"
fi

# Check system tools
echo -e "\nChecking system tools..."
if command -v lsusb &> /dev/null; then
    print_status 0 "lsusb installed"
else
    print_warning "lsusb not found (needed for USB device monitoring)"
fi

# Check project structure
echo -e "\nChecking project files..."
[ -f "backend/server.py" ] && print_status 0 "backend/server.py exists" || print_status 1 "backend/server.py missing"
[ -f "backend/requirements.txt" ] && print_status 0 "backend/requirements.txt exists" || print_status 1 "backend/requirements.txt missing"
[ -f "backend/.env" ] && print_status 0 "backend/.env exists" || print_status 1 "backend/.env missing"
[ -f "frontend/package.json" ] && print_status 0 "frontend/package.json exists" || print_status 1 "frontend/package.json missing"
[ -f "frontend/.env" ] && print_status 0 "frontend/.env exists" || print_status 1 "frontend/.env missing"
[ -f "docker-compose.yml" ] && print_status 0 "docker-compose.yml exists" || print_status 1 "docker-compose.yml missing"

# Check backend dependencies
echo -e "\nChecking backend setup..."
if [ -d "backend/venv" ]; then
    print_status 0 "Backend virtual environment exists"
else
    print_warning "Backend virtual environment not created (run: python3 -m venv backend/venv)"
fi

# Check frontend dependencies
if [ -d "frontend/node_modules" ]; then
    print_status 0 "Frontend dependencies installed"
else
    print_warning "Frontend dependencies not installed (run: cd frontend && yarn install)"
fi

# Check .env configuration
echo -e "\nChecking configuration..."
if [ -f "backend/.env" ]; then
    # Check for critical variables
    if grep -q "SMTP_APP_PASSWORD=$" backend/.env || ! grep -q "SMTP_APP_PASSWORD" backend/.env; then
        print_warning "SMTP_APP_PASSWORD not configured in backend/.env"
    else
        print_status 0 "SMTP_APP_PASSWORD is configured"
    fi
    
    if grep -q "JWT_SECRET_KEY=your-secret-key-change-this" backend/.env; then
        print_warning "JWT_SECRET_KEY should be changed from default"
    else
        print_status 0 "JWT_SECRET_KEY is customized"
    fi
fi

# Check for Huawei dongle
echo -e "\nChecking Huawei E3372 dongle..."
if lsusb 2>/dev/null | grep -i huawei &> /dev/null; then
    print_status 0 "Huawei dongle detected"
    
    # Check if dongle is accessible
    if ping -c 1 -W 1 192.168.8.1 &> /dev/null; then
        print_status 0 "Dongle is accessible at 192.168.8.1"
    else
        print_warning "Dongle not accessible at 192.168.8.1"
    fi
else
    print_warning "Huawei dongle not detected (optional feature)"
fi

# Check thermal sensor
echo -e "\nChecking temperature sensor..."
if [ -f "/sys/class/thermal/thermal_zone0/temp" ]; then
    TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$((TEMP / 1000))
    print_status 0 "Temperature sensor found: ${TEMP_C}°C"
else
    print_warning "Temperature sensor not found at /sys/class/thermal/thermal_zone0/temp"
fi

# Check ports
echo -e "\nChecking port availability..."
if lsof -Pi :8001 -sTCP:LISTEN -t &> /dev/null; then
    print_warning "Port 8001 is already in use (backend)"
else
    print_status 0 "Port 8001 is available (backend)"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t &> /dev/null; then
    print_warning "Port 3000 is already in use (frontend)"
else
    print_status 0 "Port 3000 is available (frontend)"
fi

# Summary
echo -e "\n==================================="
echo "Summary"
echo "==================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo "You're ready to start the application."
    echo ""
    echo "Quick start:"
    echo "  Docker:  docker-compose up -d"
    echo "  Manual:  ./start.sh"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}Checks completed with $WARNINGS warning(s)${NC}"
    echo "You can proceed, but some features may not work."
else
    echo -e "${RED}Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo "Please fix the errors before starting the application."
    exit 1
fi

echo ""
echo "Access the dashboard at: http://localhost:3000"
echo "Default login: admin / password"
echo ""
