module.exports = {
    apps : [{
        name: 'moderator_telegram_bot',
        script: 'yarn',
        args: 'start-telegram-bot',
        watch: true,
        ignore_watch: ['\.git', 'node_modules', 'database\.db', 'database\.db-journal'],
    }, {
        name: 'moderator_cron',
        script: 'yarn',
        args: 'cron',
        watch: true,
        ignore_watch: ['\.git', 'node_modules', 'database\.db', 'database\.db-journal'],
        cron_restart: '* * * * *',
    }],
};