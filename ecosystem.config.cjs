module.exports = {
  apps: [
    {
      name: "estoquelogia-backend",
      script: "server.js",
      exec_mode: "cluster",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      watch: false,
      time: true,
      max_memory_restart: "300M"
    }
  ]
};