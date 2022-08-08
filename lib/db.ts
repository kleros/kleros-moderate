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

const createAccount = async (address: string, privateKey: string, platform: string, userId: string) => {
    const db = await openDb();
    await db.run(
        'INSERT INTO accounts (address, private_key, platform, user_id) VALUES ($address, $private_key, $platform, $user_id);',
        {
            $address: address,
            $private_key: privateKey,
            $platform: platform,
            $user_id: userId,
        }
    );
}

const isAccountOwner = async (user_id: string, platform: string, address: string) => {
    const db = await openDb();

    const result = await db.get('SELECT COUNT(*) as total FROM accounts WHERE user_id = ? AND platform = ? AND address = ?;', user_id, platform, address);

    return result.total > 0;
}

const setAccount = async (platform: string, groupId: string, address: string) => {
    const db = await openDb();
    await db.run(
        `INSERT INTO groups (platform, group_id, address) 
            VALUES ($platform, $group_id, $address) 
            ON CONFLICT(platform, group_id) DO UPDATE SET 
            address=$address;`,
        {
            $platform: platform,
            $group_id: groupId,
            $address: address,
        }
    );
}

const setInviteURL = async (platform: string, groupId: string, inviteUrl: string) => {
    const db = await openDb();
    await db.run(
        `INSERT INTO groups (platform, group_id, invite_url) 
            VALUES ($platform, $group_id, $invite_url) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            invite_url = $invite_url;`,
        {
            $platform: platform,
            $group_id: groupId,
            $invite_url: inviteUrl,
        }
    );
}

const getGroup = async(platform: string, groupId: string): Promise<{address: string, private_key: string} | undefined> => {
    const db = await openDb();

    const query = `
SELECT groups.address, private_key FROM accounts 
LEFT JOIN groups ON groups.address = accounts.address
WHERE groups.platform = $platform AND groups.group_id = $group_id`;

    return await db.get(
        query,
        {
            $platform: platform,
            $group_id: groupId
        }
    );
}

const getInviteURL = async(platform: string, groupId: string) => {
    const db = await openDb();

    const result = await db.get('SELECT invite_url FROM groups WHERE platform = ? AND group_id = ?', platform, groupId);

    return result?.app_invite_url || '';
}

const setRules = async (platform: string, groupId: string, rules: string, timestamp: number) => {
    const db = await openDb();
    await db.run(
        `INSERT INTO rules (platform, group_id, rules)
            VALUES ($platform, $group_id, $rules) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
                rules = $rules ;`,
        {
            $platform: platform,
            $group_id: groupId,
            $rules: rules,
        }
    );
}

const getRules = async (platform: string, groupId: string) => {
    const db = await openDb();

    const result = await db.get('SELECT rules FROM rules WHERE platform = ? AND group_id = ?', platform, groupId);

    return result?.rules || '';
}

const addReport = async (questionId: string, timestamp: number, platform: string, groupId: string, userId: string, active: boolean) => {
    const db = await openDb();
    await db.run(
        'INSERT INTO reports (question_id, timestamp, activeTimestamp, timeServed, platform, group_id, user_id, active, finalized) VALUES ($questionId, $timestamp, $activeTimestamp, $timeServed, $platform, $group_id, $user_id, $active, FALSE);',
        {
            $questionId: questionId,
            $timestamp: timestamp,
            $activeTimestamp: 0,
            $platform: platform,
            $group_id: groupId,
            $user_id: userId,
            $active: active
        }
    );
}

const setReport = async (questionId: string, active: boolean, finalized: boolean, activeTimestamp: number, timeServed: number) => {
    const db = await openDb();

    await db.run(
        'UPDATE reports SET active = $active, finalized = $finalized, activeTimestamp = $activeTimestamp, timeServed = $timeServed WHERE question_id = $questionId',
        {
            $questionId: questionId,
            $active: active,
            $activeTimestamp: activeTimestamp,
            $finalized: finalized,
            $timeServed : timeServed
        }
    );
}

const getDisputedReports = async() => {
    const db = await openDb();

    return await db.all('SELECT * FROM reports WHERE finalized = FALSE');
}

const getConcurrentReports = async(userId: string, timestamp: number) => {
    const db = await openDb();

    const result = await db.all(
        'SELECT question_id FROM reports WHERE timestamp BETWEEN $timestamp1 AND $timestamp2 AND user_id = $user_id',
        {
            $timestamp1: timestamp - 3600,
            $timestamp2: timestamp + 3600,
            $user_id: userId
        }
    );

    return result;
}

const getActiveReportedUserAndGroupId = async(questionId: string) => {
    const db = await openDb();

    const result = await db.get(
        `SELECT user_id, group_id, active FROM reports 
        WHERE question_id = $question_id AND finalized = FALSE`,
        {
            $question_id: questionId,
        }
    );

    return result;
}

const getRecord = async(userId: string) => {
    const db = await openDb();

    const result = await db.get(
        'SELECT COUNT(*) FROM reports WHERE finalized = TRUE AND active = TRUE AND user_id = $user_id',
        {
            $user_id: userId
        }
    );

    return result.total;
}

export {
    getInviteURL,
    isAccountOwner,
    setInviteURL,
    setAccount,
    getGroup,
    getActiveReportedUserAndGroupId,
    createAccount,
    setRules,
    getRules,
    addReport,
    setReport,
    getDisputedReports,
    getConcurrentReports,
    getRecord
}
