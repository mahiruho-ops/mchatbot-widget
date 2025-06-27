# MChatBot Widget - Deployment Guide

## 🚀 Ubuntu Server + Cloudflare Tunnel Setup (No Nginx)

### Prerequisites
- Ubuntu server with Node.js 18+ installed
- Cloudflare tunnel already configured for `api.mretailstore.com`
- Access to your server via SSH

### Step 1: Server Setup

#### 1.1 Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

#### 1.2 Clone/Upload Project
```bash
# Create directory for the widget
sudo mkdir -p /var/www/mchatbot-widget
sudo chown $USER:$USER /var/www/mchatbot-widget

# Upload your project files to this directory
# Or clone from your repository
```

### Step 2: Application Setup

#### 2.1 Install Dependencies
```bash
cd /var/www/mchatbot-widget
npm install
```

#### 2.2 Build the Application
```bash
npm run build
```

#### 2.3 Test Locally
```bash
npm start
# Should show: MChatBot Widget server running on port 3001
```

### Step 3: PM2 Process Management

#### 3.1 Create PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'mchatbot-widget',
    script: 'server.js',
    cwd: '/var/www/mchatbot-widget',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/mchatbot-widget/err.log',
    out_file: '/var/log/mchatbot-widget/out.log',
    log_file: '/var/log/mchatbot-widget/combined.log',
    time: true
  }]
};
```

#### 3.2 Create Log Directory
```bash
sudo mkdir -p /var/log/mchatbot-widget
sudo chown $USER:$USER /var/log/mchatbot-widget
```

#### 3.3 Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 4: Cloudflare Tunnel Configuration

#### 4.1 Update Cloudflare Tunnel Config
Add this route to your existing Cloudflare tunnel configuration:

```yaml
# In your cloudflared config.yml
tunnel: your-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  # Your existing routes...
  - hostname: api.mretailstore.com
    path: /mchatbot-widget/*
    service: http://localhost:3001
    originRequest:
      noTLSVerify: true
  # Keep your existing catch-all route
  - service: http_status:404
```

#### 4.2 Restart Cloudflare Tunnel
```bash
# Restart cloudflared service
sudo systemctl restart cloudflared
```

### Step 5: Testing

#### 5.1 Test Widget Access
```bash
# Test the widget files
curl -I https://api.mretailstore.com/mchatbot-widget/mchatbot.js
curl -I https://api.mretailstore.com/mchatbot-widget/index.html

# Test health endpoint
curl https://api.mretailstore.com/mchatbot-widget/health
```

#### 5.2 Test CORS
Create a test HTML file to verify CORS:
```html
<!DOCTYPE html>
<html>
<head>
    <title>CORS Test</title>
</head>
<body>
    <h1>CORS Test for MChatBot Widget</h1>
    <script>
        fetch('https://api.mretailstore.com/mchatbot-widget/health')
            .then(response => response.json())
            .then(data => console.log('Success:', data))
            .catch(error => console.error('Error:', error));
    </script>
</body>
</html>
```

### Step 6: Usage Instructions

#### 6.1 Embedding the Widget
Add this to any website:
```html
<!-- Add the widget -->
<mchatbot-widget 
    theme-color="#701FAB"
    dark-mode="false"
    email="user@example.com"
    name="User Name"
    session-mode="tab">
</mchatbot-widget>

<!-- Import the widget script -->
<script type="module" src="https://api.mretailstore.com/mchatbot-widget/mchatbot.js"></script>
```

#### 6.2 Available URLs
- **Widget JS**: `https://api.mretailstore.com/mchatbot-widget/mchatbot.js`
- **Demo Page**: `https://api.mretailstore.com/mchatbot-widget/`
- **Health Check**: `https://api.mretailstore.com/mchatbot-widget/health`

### Step 7: Monitoring & Maintenance

#### 7.1 PM2 Commands
```bash
# Check status
pm2 status

# View logs
pm2 logs mchatbot-widget

# Restart application
pm2 restart mchatbot-widget

# Update application
cd /var/www/mchatbot-widget
git pull
npm install
npm run build
pm2 restart mchatbot-widget
```

#### 7.2 Log Monitoring
```bash
# Monitor logs in real-time
tail -f /var/log/mchatbot-widget/combined.log

# Check for errors
grep "ERROR" /var/log/mchatbot-widget/combined.log
```

### Troubleshooting

#### Common Issues

1. **CORS Errors**
   - Verify CORS headers are set correctly in server.js
   - Check if the domain is allowed in your API configuration

2. **Widget Not Loading**
   - Check if `mchatbot.js` is accessible
   - Verify the script URL is correct
   - Check browser console for errors

3. **WebSocket Connection Issues**
   - Ensure your API server supports WebSocket connections
   - Check if the WebSocket URL is correct in the widget

4. **PM2 Issues**
   - Check PM2 status: `pm2 status`
   - View logs: `pm2 logs mchatbot-widget`
   - Restart if needed: `pm2 restart mchatbot-widget`

5. **Cloudflare Tunnel Issues**
   - Check tunnel status: `cloudflared tunnel info your-tunnel-id`
   - Verify config.yml syntax
   - Check tunnel logs: `sudo journalctl -u cloudflared -f`

### Security Considerations

1. **CORS Configuration**: Currently set to allow all origins (`*`). Consider restricting to specific domains in production.

2. **Rate Limiting**: Consider adding rate limiting to prevent abuse.

3. **HTTPS**: Ensure all connections use HTTPS in production.

4. **Environment Variables**: Set proper environment variables for production.

### Performance Optimization

1. **Caching**: Static files are cached for 1 year. Adjust as needed.

2. **CDN**: Consider using a CDN for better global performance.

3. **Compression**: The Express server can be configured with compression middleware.

### Architecture Overview

```
Internet → Cloudflare Tunnel → Express Server (Port 3001) → Static Files
```

**URL Flow:**
- `https://api.mretailstore.com/mchatbot-widget/` → `http://localhost:3001/mchatbot-widget/`
- `https://api.mretailstore.com/mchatbot-widget/mchatbot.js` → `http://localhost:3001/mchatbot-widget/mchatbot.js`
- `https://api.mretailstore.com/mchatbot-widget/health` → `http://localhost:3001/mchatbot-widget/health`

**Subpath Handling:**
- All requests to `/mchatbot-widget/*` are routed to the Express server
- Static files are served from the `dist/` directory
- CORS headers are automatically added for cross-domain access
- Health check endpoint provides monitoring capability