const Database = require('better-sqlite3');

(async () => {
    const db = new Database('database.db');
    db.pragma('journal_mode = WAL');

    /**
     * A group can be a telegram chat, a subreddit, etc.
     *
     * `platform` can be `telegram`, `reddit`, etc.
     * `group_id` is the id of the telegram group or the name of the subreddit.
     * `address` is the address of the bot assigned to this group.
     */
    await db.exec(
        `CREATE TABLE groups (
            platform TEXT, 
            group_id TEXT, 
            title TEXT,
            channel_id TEXT,
            thread_id_rules TEXT,
            thread_id_notifications TEXT,
            thread_id_welcome TEXT,
            invite_url TEXT, 
            invite_url_channel TEXT, 
            federation_id TEXT,
            federation_id_following TEXT,
            greeting_mode BIT,
            admins_reportable BIT,
            captcha BIT,
            enforcement BIT,
            lang TEXT,
            rules TEXT,
            warn_mode BIT,
            PRIMARY KEY (platform, group_id))`
        );

    /**
     * A group can be a telegram chat, a subreddit, etc.
     *
     * `platform` can be `telegram`, `reddit`, etc.
     * `group_id` is the id of the telegram group or the name of the subreddit.
     * `address` is the address of the bot assigned to this group.
     */
    await db.exec(
        `CREATE TABLE groupsMultiLang (
            platform TEXT, 
            group_id TEXT, 
            lang TEXT,
            invite_url TEXT, 
            PRIMARY KEY (platform, group_id, lang))`
        );

    /**
     * `question_id` is the id of the question in reality.eth
     * `platform` can be `telegram`, `reddit`, etc.
     * `group_id` is the id of the group on the platform (eg. group on telegram, subreddit on reddit, etc.).
     * `user_id` is the id of the banned user in `platform`.
     * `chat_id` is the id of the banned user in `platform`.
     * `active` indicates whether the user is currently banned.
     * `finalized` indicates if the question has finalized.
     */
     await db.exec(
    `CREATE TABLE allowance (
        platform TEXT, 
        group_id TEXT, 
        user_id TEXT, 
        report_allowance INTEGER, 
        evidence_allowance INTEGER, 
        timestamp_refresh INTEGER,
        limit_level INTEGER,
        PRIMARY KEY (platform, group_id, user_id))`
    );


    /**
     * `platform` can be `telegram`, `reddit`, etc.
     * `group_id` is the id of the group on the platform (eg. group on telegram, subreddit on reddit, etc.).
     * `rules` the group rules. eg ipfs cid string.
     * `timestamp` the timestamp when the rules were set.
     */
    await db.exec(
        `CREATE TABLE rules (
            platform TEXT, 
            group_id TEXT, 
            rules TEXT, 
            timestamp INTEGER, 
            msg_id TEXT,
            PRIMARY KEY (platform, group_id, timestamp))`
        );

    /**
     * `platform` can be `telegram`, `reddit`, etc.
     * `group_id` is the id of the group on the platform (eg. group on telegram, subreddit on reddit, etc.).
     * `rules` the group rules. eg ipfs cid string.
     * `timestamp` the timestamp when the rules were set.
     */
    await db.exec(
        `CREATE TABLE forgiveness (
            platform TEXT, 
            group_id TEXT, 
            user_id TEXT, 
            timestamp INTEGER,
            PRIMARY KEY (platform, group_id, user_id))`
        );

    /**
     * `question_id` is the id of the question in reality.eth
     * `platform` can be `telegram`, `reddit`, etc.
     * `group_id` is the id of the group on the platform (eg. group on telegram, subreddit on reddit, etc.).
     * `user_id` is the id of the banned user in `platform`.
     * `chat_id` is the id of the banned user in `platform`.
     * `active` indicates whether the user is currently banned.
     * `finalized` indicates if the question has finalized.
     */
    await db.exec(
        `CREATE TABLE reports (
            question_id TEXT PRIMARY KEY, 
            platform TEXT, 
            group_id TEXT, 
            user_id TEXT, 
            username TEXT, 
            msg_id TEXT, 
            evidenceIndex INTEGER,
            msgBackup TEXT,
            timestamp_msg INTEGER, 
            timestamp_report INTEGER, 
            timestamp_active INTEGER,
            timestamp_finalized INTEGER, 
            disputed BIT,
            answered BIT,
            active BIT,
            finalized BIT
            )`
        );



    /**
     * `platform` can be `telegram`, `reddit`, etc.
     * `federation_id` is the user_id of the federation owner on the platform (eg. group on telegram, subreddit on reddit, etc.).
     * `user_id` is the id of the banned user in `platform`.
     */
     await db.exec(
        `CREATE TABLE federations (
            platform TEXT, 
            federation_id, 
            notification_channel_id,
            invite_url_channel TEXT, 
            name TEXT,
            PRIMARY KEY (platform, federation_id))`
        );

    /**
     * `platform` can be `telegram`, `reddit`, etc.
     * `group_id` is the id of the group on the platform (eg. group on telegram, subreddit on reddit, etc.).
     * `user_id` is the id of the banned user in `platform`.
     */
     await db.exec(
        `CREATE TABLE federationSubscriptions (
            platform TEXT, 
            federation_id_subscriber, 
            federation_id_subscribed,
            PRIMARY KEY (platform, federation_id_subscriber, federation_id_subscribed))`
        );

    /**
     * `platform` can be `telegram`, `reddit`, etc.
     * `group_id` is the id of the group on the platform (eg. group on telegram, subreddit on reddit, etc.).
     * `user_id` is the id of the banned user in `platform`.
     */
     await db.exec(
        `CREATE TABLE federationAdmin (
            platform TEXT, 
            federation_id,
            admin_id,
            PRIMARY KEY (platform, federation_id, admin_id))`
        );

    /**
     *
     **/
     await db.exec(
        `CREATE TABLE cron (
            bot_index INTEGER,
            last_block INTEGER,
            last_timestamp INTEGER,
            PRIMARY KEY (bot_index))`
        );

    db.close();
})();