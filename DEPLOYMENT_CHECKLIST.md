# MChatBot Widget - Deployment Checklist

## ✅ Pre-Deployment

- [ ] Build the project: `npm run build`
- [ ] Test locally: `npm start`
- [ ] Verify all files are in `dist/` folder
- [ ] Check that `mchatbot.js` is accessible at `http://localhost:3001/mchatbot-widget/mchatbot.js`

## 🚀 Server Setup

### Ubuntu Server
- [ ] Install Node.js 18+: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`
- [ ] Install PM2: `sudo npm install -g pm2`
- [ ] Create project directory: `sudo mkdir -p /var/www/mchatbot-widget && sudo chown $USER:$USER /var/www/mchatbot-widget`

### Upload Files
- [ ] Upload all project files to `/var/www/mchatbot-widget/`
- [ ] Install dependencies: `npm install`
- [ ] Build project: `npm run build`
- [ ] Create logs directory: `mkdir logs`

## 🔧 Application Setup

### PM2 Configuration
- [ ] Start with PM2: `pm2 start ecosystem.config.js`
- [ ] Save PM2 configuration: `pm2 save`
- [ ] Setup PM2 startup: `pm2 startup`
- [ ] Verify PM2 status: `pm2 status`

### Test Application
- [ ] Test health endpoint: `curl http://localhost:3001/mchatbot-widget/health`
- [ ] Test widget script: `curl -I http://localhost:3001/mchatbot-widget/mchatbot.js`
- [ ] Test demo page: `curl -I http://localhost:3001/mchatbot-widget/`

## 🌐 Cloudflare Tunnel

### Update Tunnel Config
- [ ] Add route to cloudflared config.yml:
```yaml
- hostname: api.mretailstore.com
  path: /mchatbot-widget/*
  service: http://localhost:3001
  originRequest:
    noTLSVerify: true
```

- [ ] Restart cloudflared: `sudo systemctl restart cloudflared`
- [ ] Check tunnel status: `cloudflared tunnel info your-tunnel-id`

## 🔍 Testing

### CORS Testing
- [ ] Upload `test-cors.html` to any web server
- [ ] Open the test page in browser
- [ ] Run all CORS tests
- [ ] Verify widget loads correctly

### Integration Testing
- [ ] Test widget on different domains
- [ ] Verify WebSocket connections work
- [ ] Test session persistence
- [ ] Check mobile responsiveness

## 📊 Monitoring

### PM2 Monitoring
- [ ] Check logs: `pm2 logs mchatbot-widget`
- [ ] Monitor status: `pm2 monit`
- [ ] Set up log rotation if needed

### Health Monitoring
- [ ] Test health endpoint: `curl https://api.mretailstore.com/mchatbot-widget/health`
- [ ] Set up monitoring alerts (optional)

## 🔒 Security

### CORS Configuration
- [ ] Verify CORS headers are set correctly
- [ ] Consider restricting origins in production
- [ ] Test from different domains

### Environment Variables
- [ ] Set production environment variables
- [ ] Verify API endpoints are correct
- [ ] Test WebSocket connections

## 📝 Documentation

### Update Documentation
- [ ] Update widget usage instructions
- [ ] Document deployment process
- [ ] Create troubleshooting guide
- [ ] Update API documentation

## 🎯 Final Verification

### Production Testing
- [ ] Test widget on production domain
- [ ] Verify all features work correctly
- [ ] Test error handling
- [ ] Check performance

### User Acceptance
- [ ] Test with real users
- [ ] Gather feedback
- [ ] Monitor for issues
- [ ] Plan improvements

---

## 🚨 Emergency Rollback

If issues occur:
1. Stop PM2: `pm2 stop mchatbot-widget`
2. Revert to previous version
3. Restart: `pm2 start mchatbot-widget`
4. Check logs: `pm2 logs mchatbot-widget`

## 📞 Support

- PM2 logs: `pm2 logs mchatbot-widget`
- Application logs: `tail -f logs/combined.log`
- Health check: `curl https://api.mretailstore.com/mchatbot-widget/health`
- Cloudflare tunnel: `cloudflared tunnel info your-tunnel-id` 