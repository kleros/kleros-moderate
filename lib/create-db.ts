import {openDb} from "./db";

(async () => {
    const db = await openDb();

    await db.exec('CREATE TABLE rules (chat_id INTEGER PRIMARY KEY, rules TEXT)');

    // TODO: should we use the user id instead of the username?
    await db.exec('CREATE TABLE mods (chat_id INTEGER, user_id INTEGER, PRIMARY KEY (chat_id, user_id))');

    await db.exec('CREATE TABLE bans (chat_id INTEGER, question_id TEXT, active BOOLEAN, PRIMARY KEY (chat_id, question_id))');

    console.log('database created');
})();