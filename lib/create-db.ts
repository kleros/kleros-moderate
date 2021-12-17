import {openDb} from "./db";

(async () => {
    const db = await openDb();

    await db.exec('CREATE TABLE rules (chat_id INTEGER PRIMARY KEY, rules TEXT)');

    // TODO: should we use the user id instead of the username?
    await db.exec('CREATE TABLE mods (chat_id INTEGER, username TEXT, PRIMARY KEY (chat_id, username))');

    console.log('database created');
})();