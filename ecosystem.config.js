module.exports = {
  apps: [{
    name: 'dailyhabits',
    script: 'server/index.js',
    env_file: '.env',
    watch: false,
    max_restarts: 10,
    restart_delay: 3000,
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
  }],
};
