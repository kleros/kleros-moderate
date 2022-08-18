import {openDb} from "./db";

(async () => {
    const db = await openDb();

    /**
     * `platform` + `platform_user_id` is used to verify if the user is the owner of the bot.
     *
     * The owner is the only user who can call `/setaccount` to use this bot in a group.
     *
     * `platform` can be `telegram`, `reddit`, etc.
     * `platform_user_id` is the id of the user in `app_type`.
     */
     await db.exec(
        `CREATE TABLE accounts (
            address TEXT PRIMARY KEY, 
            private_key TEXT, 
            platform TEXT, 
            user_id TEXT)`
        );

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
            penaltyDuration INTEGER, 
            finalized BOOLEAN,
            arbitrationRequested BOOLEAN 
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
        `CREATE TABLE allowance (
            platform TEXT, 
            group_id TEXT, 
            user_id TEXT, 
            report_allowance INTEGER, 
            evidence_allowance INTEGER, 
            timestamp_refresh INTEGER,
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
            PRIMARY KEY (platform, group_id))`
        );

})();