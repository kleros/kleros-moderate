module.exports = {
    apps : [{
        name: 'moderator_telegram_bot',
        script: 'yarn',
        args: 'start-telegram-bot',
        interpreter: '/bin/bash',
        log_date_format : 'YYYY-MM-DD HH:mm Z',
        watch: true,
        ignore_watch: ['\.git', 'node_modules', 'database\.db', 'database\.db-journal'],
        env: {
            NODE_ENV: 'development'
          }
    }, {
        name: 'moderator_cron',
        script: 'yarn',
        args: 'cron',
        interpreter: '/bin/bash',
        log_date_format : 'YYYY-MM-DD HH:mm Z',
        autorestart: false,
        watch: true,
        ignore_watch: ['\.git', 'node_modules', 'database\.db', 'database\.db-journal'],
        cron_restart: '* * * * *',
        env: {
            NODE_ENV: 'development'
          }
    }],
};