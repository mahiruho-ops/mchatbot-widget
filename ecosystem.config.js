export default {
  apps: [{
    name: 'mchatbot-widget',
    script: 'server.js',
    cwd: process.cwd(),
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Restart on file changes (development)
    watch: process.env.NODE_ENV === 'development' ? ['server.js', 'dist'] : false,
    ignore_watch: ['node_modules', 'logs'],
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
}; 