# Xubuntu Server Logging Service

A comprehensive logging service setup for Xubuntu server with a modern Node.js web interface that displays logs in real-time on port 5500.

## Features

- 🔄 **Real-time log monitoring** with WebSocket updates
- 📊 **Multiple log types**: System, Authentication, Combined, Errors, Access
- 🔍 **Advanced filtering**: Search, severity filtering, program filtering
- 📱 **Responsive design** with modern UI
- 🔄 **Automatic log rotation** with configurable retention
- 🚀 **Systemd service** for automatic startup
- 🔒 **Security-focused** configuration

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Creating Web Interface Files](#creating-web-interface-files)
5. [Service Setup](#service-setup)
6. [Usage Guide](#usage-guide)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)
10. [Security Considerations](#security-considerations)

## Prerequisites

Before starting, ensure you have:

- **Xubuntu Server** (or Ubuntu-based system)
- **Root/sudo access**
- **Internet connection** for downloading Node.js
- **Basic terminal knowledge**

### System Requirements

- **RAM**: Minimum 512MB (1GB+ recommended)
- **Disk Space**: At least 1GB free space
- **Network**: Port 5500 available
- **Node.js**: Version 14+ (will be installed during setup)

## Installation

### Step 1: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Node.js

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### Step 3: Create Directory Structure

```bash
# Create log directory
sudo mkdir -p /var/log/custom
sudo chown syslog:adm /var/log/custom
sudo chmod 755 /var/log/custom

# Create application directory
sudo mkdir -p /opt/log-viewer/public
sudo chown $USER:$USER /opt/log-viewer
```

### Step 4: Copy Project Files

```bash
# Navigate to the project directory (where you downloaded/cloned this repo)
cd /path/to/this/project

# Copy configuration files
sudo cp rsyslog-custom.conf /etc/rsyslog.d/50-custom.conf
sudo cp custom-logrotate.conf /etc/logrotate.d/custom-logs

# Copy application files
sudo cp server.js package.json /opt/log-viewer/
```

## Configuration

### Step 5: Install Node.js Dependencies

```bash
cd /opt/log-viewer
sudo npm install
```

### Step 6: Restart rsyslog

```bash
# Restart rsyslog to load new configuration
sudo systemctl restart rsyslog

# Verify rsyslog is running
sudo systemctl status rsyslog
```

## Creating Web Interface Files

Since some files need to be created manually, follow these steps:

### Step 7: Create HTML File

```bash
sudo tee /opt/log-viewer/public/index.html > /dev/null << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xubuntu Server Log Viewer</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🖥️ Xubuntu Server Log Viewer</h1>
            <div class="status-bar">
                <span id="connection-status" class="status-indicator disconnected">🔴 Disconnected</span>
                <span id="last-update">Never</span>
                <button id="refresh-btn" class="btn btn-small">🔄 Refresh</button>
            </div>
        </header>

        <nav class="log-tabs">
            <button class="tab-btn active" data-log="system">📋 System</button>
            <button class="tab-btn" data-log="auth">🔐 Authentication</button>
            <button class="tab-btn" data-log="combined">📊 Combined</button>
            <button class="tab-btn" data-log="error">❌ Errors</button>
            <button class="tab-btn" data-log="access">🌐 Access</button>
        </nav>

        <div class="controls">
            <div class="search-container">
                <input type="text" id="search-input" placeholder="🔍 Search logs..." autocomplete="off">
                <button id="clear-search" class="btn btn-small">Clear</button>
            </div>
            <div class="filter-container">
                <select id="severity-filter">
                    <option value="">All Severities</option>
                    <option value="emerg">Emergency</option>
                    <option value="alert">Alert</option>
                    <option value="crit">Critical</option>
                    <option value="err">Error</option>
                    <option value="warning">Warning</option>
                    <option value="notice">Notice</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                </select>
                <input type="text" id="program-filter" placeholder="Filter by program..." autocomplete="off">
            </div>
        </div>

        <main class="log-container">
            <div id="log-content" class="log-content">
                <div class="loading">Loading logs...</div>
            </div>
        </main>

        <footer>
            <div class="stats">
                <span id="total-logs">Total: 0</span>
                <span id="filtered-logs">Filtered: 0</span>
                <span id="auto-refresh-status">Auto-refresh: ON</span>
            </div>
        </footer>
    </div>

    <script src="script.js"></script>
</body>
</html>
HTMLEOF
```

## Usage Guide

### Accessing the Web Interface

1. **Open your web browser**
2. **Navigate to**: `http://your-server-ip:5500`
   - Replace `your-server-ip` with your actual server IP address
   - For local access: `http://localhost:5500`

### Interface Overview

#### Header Section
- **Title**: Shows "Xubuntu Server Log Viewer"
- **Connection Status**: 
  - 🟢 Connected (green) - WebSocket is active
  - 🔴 Disconnected (red) - Connection lost
- **Last Update**: Shows timestamp of most recent log update
- **Refresh Button**: Reloads the entire page

#### Navigation Tabs
Click on any tab to switch between log types:

- **📋 System**: General system logs (auth excluded)
- **🔐 Authentication**: Login/logout and authentication events
- **📊 Combined**: All custom application logs merged
- **❌ Errors**: Error-level logs from applications
- **🌐 Access**: Web server or application access logs

#### Control Panel
- **Search Box**: Type to filter logs by content
  - Searches in: message, program name, hostname
  - Case-insensitive
  - Real-time filtering as you type

- **Clear Button**: Clears the search box

- **Severity Filter**: Dropdown to show only specific log levels
  - Emergency, Alert, Critical, Error, Warning, Notice, Info, Debug

- **Program Filter**: Filter by specific program/service name
  - Type partial program names
  - Case-insensitive

#### Log Display Area
- **Log Entries**: Newest logs appear at the top
- **Click to Expand**: Click any log entry to see detailed information
- **Color Coding**: Severity levels have different colors
  - Red: Emergency, Alert, Critical
  - Orange: Error
  - Yellow: Warning
  - Blue: Notice, Info
  - Purple: Debug

#### Footer Statistics
- **Total**: Number of logs in current category
- **Filtered**: Number of logs matching current filters
- **Auto-refresh**: Status of real-time updates

### Advanced Usage

#### Searching Logs
```
Examples:
- "error" - Find all logs containing "error"
- "ssh" - Find SSH-related logs
- "failed" - Find failed operations
- "192.168" - Find logs from specific IP range
```

#### Using Multiple Filters
1. **Search** for general terms
2. **Severity filter** to focus on specific log levels
3. **Program filter** to isolate specific services
4. **Combine all three** for precise log analysis

#### Keyboard Shortcuts
- **Ctrl+F**: Focus on search box
- **Escape**: Clear search box
- **Tab**: Navigate between controls

## Testing

### Generate Test Logs

```bash
# Test system logs
logger "Test system message from logger"

# Test application logs
logger -p local0.info "Test application log message"

# Test error logs
logger -p local1.error "Test error message"

# Test access logs
logger -p local2.info "Test access log entry"

# Test authentication (requires actual login attempt)
sudo su - $USER  # This generates auth logs
```

### Verify Log Files

```bash
# Check if log files are being created
sudo ls -la /var/log/custom/

# View recent logs
sudo tail -f /var/log/custom/system.log
sudo tail -f /var/log/custom/combined.log
sudo tail -f /var/log/custom/auth.log
```

### Test Web Interface

1. **Open browser**: Navigate to `http://your-server-ip:5500`
2. **Check connection**: Status should show "🟢 Connected"
3. **Switch tabs**: Click different log type tabs
4. **Test search**: Type "test" in search box
5. **Test filters**: Try different severity levels
6. **Expand logs**: Click on log entries to see details

## Troubleshooting

### Common Issues and Solutions

#### Service Won't Start
```bash
# Check service status
sudo systemctl status log-viewer

# View detailed logs
sudo journalctl -u log-viewer -f

# Check if port is in use
sudo netstat -tlnp | grep :5500
sudo lsof -i :5500
```

#### Permission Errors
```bash
# Fix ownership
sudo chown -R www-data:www-data /opt/log-viewer

# Fix log directory permissions
sudo chown syslog:adm /var/log/custom
sudo chmod 755 /var/log/custom
```

#### No Logs Appearing
```bash
# Check rsyslog status
sudo systemctl status rsyslog

# Restart rsyslog
sudo systemctl restart rsyslog

# Check rsyslog configuration
sudo rsyslogd -N1

# View rsyslog errors
sudo tail -f /var/log/syslog | grep rsyslog
```

#### WebSocket Connection Issues
```bash
# Check if Node.js is running
ps aux | grep node

# Check firewall
sudo ufw status
sudo iptables -L

# Test port connectivity
telnet your-server-ip 5500
```

#### Browser Issues
1. **Clear browser cache**: Ctrl+F5
2. **Check browser console**: F12 → Console tab
3. **Disable ad blockers**: May block WebSocket connections
4. **Try different browser**: Chrome, Firefox, Edge

## Quick Setup Script

For convenience, here's a complete setup script:

```bash
#!/bin/bash
# Quick setup script for Xubuntu Server Logging Service

echo "Setting up Xubuntu Server Logging Service..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create directories
sudo mkdir -p /var/log/custom /opt/log-viewer/public
sudo chown syslog:adm /var/log/custom
sudo chmod 755 /var/log/custom

# Copy files (assuming you're in the project directory)
sudo cp rsyslog-custom.conf /etc/rsyslog.d/50-custom.conf
sudo cp custom-logrotate.conf /etc/logrotate.d/custom-logs
sudo cp server.js package.json /opt/log-viewer/

# Install dependencies
cd /opt/log-viewer
sudo npm install

# Create web files (you'll need to run the tee commands from the guide above)

# Set permissions
sudo chown -R www-data:www-data /opt/log-viewer

# Restart services
sudo systemctl restart rsyslog
sudo systemctl daemon-reload

echo "Setup complete! Create the web interface files using the commands in the guide above."
echo "Then access your log viewer at http://your-server-ip:5500"
```

## Security Considerations

### Network Security
1. **Firewall Rules**: Only allow access from trusted networks
2. **Reverse Proxy**: Use nginx for HTTPS and authentication
3. **VPN Access**: Consider requiring VPN for log access

### Application Security
1. **Service User**: Runs as `www-data` with limited privileges
2. **File Permissions**: Logs readable only by appropriate users
3. **Input Sanitization**: All log content is escaped in the web interface
4. **No Remote Code Execution**: Read-only access to log files

## Conclusion

Your Xubuntu Server Logging Service is now fully configured and ready for production use. The system provides:

- ✅ **Centralized logging** with automatic rotation
- ✅ **Real-time web interface** with advanced filtering
- ✅ **Secure service** with proper permissions
- ✅ **Production-ready** with systemd integration
- ✅ **Comprehensive monitoring** of all log types

For support or questions, refer to the troubleshooting section or check the service logs using the commands provided above.

**Happy logging! 🎉**
