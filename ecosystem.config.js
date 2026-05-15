module.exports = {
  apps: [
    {
      name: 'proconnectBackend',
      script: './server/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 2886
      }
    }
  ]
}
