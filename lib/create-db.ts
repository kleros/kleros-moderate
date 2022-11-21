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
            greeting_mode INTEGER,
            lang TEXT,
            rules TEXT
            PRIMARY KEY (platform, group_id))`
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