module.exports = {
    apps : [{
        name: 'kleros_bot',
        script: 'yarn',
        args: 'start-bot',
        watch: true,
        ignore_watch: ['\.git', 'node_modules', 'database\.db', 'database\.db-journal'],
    }, {
        name: 'kleros_bot_cron',
        script: 'yarn',
        args: 'cron',
        watch: true,
        ignore_watch: ['\.git', 'node_modules', 'database\.db', 'database\.db-journal'],
        cron_restart: '* * * * *',
    }],
};