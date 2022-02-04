import {openDb} from "./db";

(async () => {
    const db = await openDb();

    await db.exec('CREATE TABLE bots (address TEXT PRIMARY KEY, private_key TEXT, account_id TEXT, account_source TEXT)');

    await db.exec('CREATE TABLE bot_chats (chat_id INTEGER PRIMARY KEY, address TEXT)');

    await db.exec('CREATE TABLE rules (chat_id INTEGER PRIMARY KEY, rules TEXT)');

    await db.exec('CREATE TABLE mods (chat_id INTEGER, user_id INTEGER, PRIMARY KEY (chat_id, user_id))');

    await db.exec('CREATE TABLE bans (question_id TEXT PRIMARY KEY, chat_id INTEGER, user_id INTEGER, active BOOLEAN, finalized BOOLEAN)');

    console.log('database created');
})();