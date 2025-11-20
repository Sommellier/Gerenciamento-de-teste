module.exports = {
  apps: [
    {
      name: "backend-api",
      cwd: "backend",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      env_production: { NODE_ENV: "production" }
    }
  ],
  deploy: {
    production: {
      user: "ubuntu",
      host: "3.140.242.76",
      ref: "origin/main",
      repo: "git@github.com:Sommellier/Gerenciamento-de-teste.git",
      path: "/var/www/api-backend",
      ssh_options: ["StrictHostKeyChecking=accept-new"],
      "pre-deploy-local": "echo 'Starting deployment...'",
      "pre-deploy": "sudo mkdir -p /var/www/api-backend/{source,shared,releases} /var/www/shared && sudo chown -R ubuntu:ubuntu /var/www/api-backend /var/www/shared && rm -rf /var/www/api-backend/current && (test -d /var/www/api-backend/source/.git || (rm -rf /var/www/api-backend/source/* /var/www/api-backend/source/.* 2>/dev/null || true && cd /var/www/api-backend/source && git clone git@github.com:Sommellier/Gerenciamento-de-teste.git . || git clone https://github.com/Sommellier/Gerenciamento-de-teste.git .))",
      "post-deploy": [
        "test -f /var/www/shared/.env && cp /var/www/shared/.env backend/.env || echo 'No .env file found, skipping copy'",
        "cd backend",
        "npm ci",
        "npm run build",
        "npx prisma generate",
        "npx prisma migrate deploy || true",
        "npm prune --omit=dev",
        "cd ..",
        "pm2 startOrReload ecosystem.config.js --env production --update-env"
      ].join(" && ")
    }
  }
}



