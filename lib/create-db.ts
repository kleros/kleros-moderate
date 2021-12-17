import {openDb} from "./db";

(async () => {
    const db = await openDb();

    await db.exec('CREATE TABLE rules (chat_id INTEGER PRIMARY KEY, rules TEXT)');

    console.log('database created');
})();