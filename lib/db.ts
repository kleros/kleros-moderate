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

const createBot = async (appUserId: string, appType: string, address: string, privateKey: string) => {
    const db = await openDb();
    await db.run(
        'INSERT INTO bots (app_user_id, app_type, address, private_key) VALUES ($appUserId, $appType, $address, $privateKey);',
        {
            $appUserId: appUserId,
            $appType: appType,
            $address: address,
            $privateKey: privateKey
        }
    );
}

const isAccountOwner = async (appUserId: string, appType: string, address: string) => {
    const db = await openDb();

    const result = await db.get('SELECT COUNT(*) as total FROM bots WHERE app_user_id = ? AND app_type = ? AND address = ?', appUserId, appType, address);

    return result.total > 0;
}

const setGroupAccount = async (appGroupId: string, appType: string, address: string) => {
    const db = await openDb();
    await db.run(
        'INSERT OR REPLACE INTO bot_groups (app_group_id, app_type, address) VALUES ($appGroupId, $appType, $address);',
        {
            $appGroupId: appGroupId,
            $appType: appType,
            $address: address,
        }
    );
}

const getBot = async(appGroupId: string, appType: string): Promise<{address: string, private_key: string} | undefined> => {
    const db = await openDb();

    const query = `
SELECT * FROM bots 
LEFT JOIN bot_groups ON bot_groups.address = bots.address
WHERE bot_groups.app_group_id = $appGroupId AND bot_groups.app_type = $appType`;

    return await db.get(
        query,
        {
            $appGroupId: appGroupId,
            $appType: appType,
        }
    );
}

const setRules = async (chatId: number, rules: string) => {
    const db = await openDb();
    await db.run(
        'INSERT OR REPLACE INTO rules (chat_id, rules) VALUES ($chatId, $rules);',
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

const addMod = async (chatId: number, userId: number) => {
    const db = await openDb();
    await db.run(
        'INSERT OR REPLACE INTO mods (chat_id, user_id) VALUES ($chatId, $userId);',
        {
            $chatId: chatId,
            $userId: userId
        }
    );
}

const removeMod = async (chatId: number, userId: number) => {
    const db = await openDb();
    await db.run(
        'DELETE FROM mods WHERE chat_id = $chatId AND user_id = $userId',
        {
            $chatId: chatId,
            $userId: userId
        }
    );
}

const isMod = async (chatId: number, userId: number) => {
    const db = await openDb();

    const result = await db.get(
        'SELECT COUNT(*) as total FROM mods WHERE chat_id = $chatId AND user_id = $userId',
        {
            $chatId: chatId,
            $userId: userId
        }
    );

    return result.total > 0;
}

const addBan = async (questionId: string, appType: string, appGroupId: string, appUserId: string, active: boolean) => {
    const db = await openDb();

    await db.run(
        'INSERT INTO bans (question_id, app_type, app_group_id, app_user_id, active, finalized) VALUES ($questionId, $appType, $appGroupId, $appUserId, $active, FALSE);',
        {
            $questionId: questionId,
            $appType: appType,
            $appGroupId: appGroupId,
            $appUserId: appUserId,
            $active: active
        }
    );
}

const setBan = async (questionId: string, active: boolean, finalized: boolean) => {
    const db = await openDb();

    await db.run(
        'UPDATE bans SET active = $active, finalized = $finalized WHERE question_id = $questionId',
        {
            $questionId: questionId,
            $active: active,
            $finalized: finalized
        }
    );
}

const getDisputedBans = async() => {
    const db = await openDb();

    return await db.all('SELECT * FROM bans WHERE finalized = FALSE');
}

export {
    createBot,
    getBot,
    isAccountOwner,
    setGroupAccount,
    setRules,
    getRules,
    addMod,
    removeMod,
    isMod,
    addBan,
    setBan,
    getDisputedBans
}
