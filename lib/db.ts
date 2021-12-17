import {Database} from 'sqlite3'
import {open} from 'sqlite'
const path = require('path')
const util = require('util')
const fs = require('fs')
const openFile = util.promisify(fs.open)
const closeFile = util.promisify(fs.close)
const fileExists = util.promisify(fs.exists)

export async function openDb() {

    const dbFile = path.resolve(__dirname, '../database.db');

    if (!await fileExists(dbFile)) {
        await closeFile(await openFile(dbFile, 'w'));
    }

    return open({
        filename: dbFile,
        driver: Database
    })
}

const setRules = async (chatId: number, rules: string) => {
    const db = await openDb();
    await db.run(
        'INSERT OR REPLACE INTO rules(chat_id, rules) VALUES($chatId, $rules);',
        {
            $chatId: chatId,
            $rules: rules
        }
    );
}

const getRules = async (chatId: number) => {
    const db = await openDb();

    const result = await db.get('SELECT rules FROM rules WHERE chat_id = ?', chatId);

    return result?.rules || '';
}

const addMod = async (chatId: number, username: string) => {
    const db = await openDb();
    await db.run(
        'INSERT OR REPLACE INTO mods(chat_id, username) VALUES($chatId, $username);',
        {
            $chatId: chatId,
            $username: username
        }
    );
}

const removeMod = async (chatId: number, username: string) => {
    const db = await openDb();
    await db.run(
        'DELETE FROM mods WHERE chat_id = $chatId AND username = $username',
        {
            $chatId: chatId,
            $username: username
        }
    );
}

const isMod = async (chatId: number, username: string) => {
    const db = await openDb();

    const result = await db.get(
        'SELECT COUNT(*) as total FROM mods WHERE chat_id = $chatId AND username = $username',
        {
            $chatId: chatId,
            $username: username
        }
    );

    return result.total > 0;
}


export {setRules, getRules, addMod, removeMod, isMod}
