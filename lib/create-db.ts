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
        channel_id TEXT,
        thread_id_rules TEXT,
        thread_id_notifications TEXT,
        thread_id_welcome TEXT,
        invite_url TEXT, 
        invite_url_channel TEXT, 
        federation_owner_user_id TEXT,
        greeting_mode INTEGER,
        lang TEXT,
        rules TEXT,
        PRIMARY KEY (platform, group_id))`
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
        timestamp_parole INTEGER,
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
        `CREATE TABLE banHistory (
            platform TEXT, 
            group_id TEXT, 
            user_id TEXT, 
            ban_level INTEGER, 
            count_current_level_optimistic_bans INTEGER,
            timestamp_ban INTEGER,
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
        PRIMARY KEY (platform, group_id, timestamp))`
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
            timestamp INTEGER, 
            evidenceIndex INTEGER,
            msgBackup TEXT,
            active_timestamp INTEGER,
            active BIT,
            banLevel BIT,
            finalized BIT,
            timestamp_finalized INTEGER, 
            disputed BIT
            )`
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
        `CREATE TABLE federations (
            platform TEXT, 
            owner_user_id TEXT, 
            group_id TEXT[], 
            PRIMARY KEY (platform, owner_user_id))`
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
        `CREATE TABLE cron (
            bot_index INTEGER,
            last_block INTEGER,
            last_timestamp INTEGER,
            PRIMARY KEY (bot_index))`
        );

    db.close();
})();