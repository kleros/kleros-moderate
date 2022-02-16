import {openDb} from "./db";

(async () => {
    const db = await openDb();

    /**
     * `app_type` + `app_user_id` is used to verify if the user is the owner of the bot.
     *
     * The owner is the only user who can call `/setaccount` to use this bot in a group.
     *
     * `app_type` can be `telegram`, `reddit`, etc.
     * `app_user_id` is the id of the user in `app_type`.
     */
    await db.exec('CREATE TABLE bots (address TEXT PRIMARY KEY, private_key TEXT, app_type TEXT, app_user_id TEXT)');

    /**
     * A group can be a telegram chat, a subreddit, etc.
     *
     * `app_type` can be `telegram`, `reddit`, etc.
     * `app_group_id` is the id of the telegram group or the name of the subreddit.
     * `address` is the address of the bot assigned to this group.
     */
    await db.exec('CREATE TABLE bot_groups (app_type TEXT, app_group_id TEXT, address TEXT, PRIMARY KEY (app_type, app_group_id))');


    /**
     * `question_id` is the id of the question in reality.eth
     * `app_type` can be `telegram`, `reddit`, etc.
     * `app_group_id` is the id of the telegram group or the name of the subreddit.
     * `app_user_id` is the id of the banned user in `app_type`.
     * `active` indicates whether the user is currently banned.
     * `finalized` indicates if the question has expired.
     */
    await db.exec('CREATE TABLE bans (question_id TEXT PRIMARY KEY, app_type TEXT, app_group_id TEXT, app_user_id TEXT, active BOOLEAN, finalized BOOLEAN)');

    /*
     * The following tables are only used for telegram
     */
    await db.exec('CREATE TABLE rules (chat_id INTEGER PRIMARY KEY, rules TEXT)');

    await db.exec('CREATE TABLE mods (chat_id INTEGER, user_id INTEGER, PRIMARY KEY (chat_id, user_id))');

    console.log('database created');
})();