module.exports = {
  apps: [{
    name: 'mchatbot-widget',
    script: 'server.js',
    cwd: '/home/mahiruho/chatbot/mchatbot-widget',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/home/mahiruho/chatbot/mchatbot-widget/logs/err.log',
    out_file: '/home/mahiruho/chatbot/mchatbot-widget/logs/out.log',
    log_file: '/home/mahiruho/chatbot/mchatbot-widget/logs/combined.log',
    time: true,
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
}; 