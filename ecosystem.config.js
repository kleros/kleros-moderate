module.exports = {
    apps : [{
        name: 'moderator_telegram_bot',
        script: './yarn.sh',
        args: 'start-telegram-bot',
        interpreter: '/bin/bash',
        log_date_format : 'YYYY-MM-DD HH:mm Z',
        watch: false,
        ignore_watch: ['\.git', 'node_modules', 'database\.db', 'database\.db-journal'],
        env: {
            NODE_ENV: 'development'
          }
    },
    {
        name: 'moderator_cron',
        script: './yarn.sh',
        args: 'cron',
        interpreter: '/bin/bash',
        log_date_format : 'YYYY-MM-DD HH:mm Z',
        autorestart: false,
        watch: false,
        ignore_watch: ['\.git', 'node_modules', 'database\.db', 'database\.db-journal'],
        cron_restart: '* * * * *',
        env: {
            NODE_ENV: 'development'
          }
    }],
};