const Database = require('better-sqlite3');

(async () => {
    const db = new Database('database.db', { verbose: console.log });
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
            invite_url TEXT, 
            address TEXT, 
            permission BOOLEAN,
            lang TEXT,
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
        `CREATE TABLE reports (
            question_id TEXT PRIMARY KEY, 
            platform TEXT, 
            group_id TEXT, 
            user_id TEXT, 
            username TEXT, 
            msg_id TEXT, 
            timestamp INTEGER, 
            active_timestamp INTEGER, 
            active BOOLEAN, 
            timeServed INTEGER, 
            finalized BOOLEAN,
            arbitrationRequested BOOLEAN,
            msgBackup TEXT,
            evidenceIndex INTEGER,
            bond_paid INTEGER
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
        `CREATE TABLE reportRequests (
            platform TEXT, 
            group_id TEXT, 
            user_id TEXT, 
            username TEXT, 
            msg_id TEXT, 
            confirmations INTEGER, 
            confirmed BOOLEAN,
            msgBackup TEXT,
            msgRequestId TEXT,
            PRIMARY KEY (platform, group_id, user_id, msg_id))`
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
            question_id_last TEXT,
            timestamp_last_question INTEGER,
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
    db.close();
})();