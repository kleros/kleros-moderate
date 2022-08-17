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
            $address: address
        }
    );
}

const setPermissions = async (platform: string, groupId: string, permission: boolean) => {
    const db = await openDb();
    await db.run(
        `INSERT INTO groups (platform, group_id, permission) 
            VALUES ($platform, $group_id, $permission) 
            ON CONFLICT(platform, group_id) DO UPDATE SET 
            permission=$permission;`,
        {
            $platform: platform,
            $group_id: groupId,
            $permission: permission
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

    return result?.invite_url || '';
}

const getPermissions = async(platform: string, groupId: string) => {
    const db = await openDb();

    const result = await db.get('SELECT permission FROM groups WHERE platform = ? AND group_id = ?', platform, groupId);

    return result?.permission || '';
}

const setRules = async (platform: string, groupId: string, rules: string, timestamp: number) => {
    const db = await openDb();
    await db.run(
        `INSERT INTO rules (platform, group_id, rules, timestamp)
            VALUES ($platform, $group_id, $rules, $timestamp);`, 
        {
            $platform: platform,
            $group_id: groupId,
            $rules: rules,
            $timestamp: timestamp
        }
    );
}

const getRules = async (platform: string, groupId: string, timestamp: number) => {
    const db = await openDb();
    const query = 
        `SELECT rules
        FROM rules 
        WHERE platform = $platform and group_id = $groupId and timestamp < $timestamp
        ORDER BY timestamp DESC;`;
    const result = await db.get(query, platform, groupId, timestamp);

    return result?.rules || '';
}

const addReport = async (questionId: string, 
                        platform: string, 
                        groupId: string, 
                        userId: string, 
                        msgId: string,
                        active: boolean
                        ) => {
    const db = await openDb();
    await db.run(
        `INSERT INTO reports (question_id, 
                                platform, 
                                group_id, 
                                user_id, 
                                msg_id, 
                                timestamp, 
                                active_timestamp, 
                                active, 
                                timeServed, 
                                finalized,
                                arbitrationRequested) 
        VALUES ($questionId, 
                $platform, 
                $group_id, 
                $user_id, 
                $msg_id, 
                $timestamp, 
                $active_timestamp, 
                $active, 
                $timeServed, 
                FALSE,
                FALSE);`,
        {
            $questionId: questionId,
            $platform: platform,
            $group_id: groupId,
            $user_id: userId,
            $msg_id: msgId,
            $timestamp: Math.floor(Date.now()/1000),
            $active_timestamp: active? Math.floor(Date.now()/1000): 0,
            $timeServed: 0,
            $active: active
        }
    );
}

const setReport = async (questionId: string, active: boolean, finalized: boolean, activeTimestamp: number, timeServed: number) => {
    const db = await openDb();

    await db.run(
        'UPDATE reports SET active = $active, finalized = $finalized, active_timestamp = $active_timestamp, timeServed = $timeServed WHERE question_id = $question_id',
        {
            $question_id: questionId,
            $active: active,
            $active_timestamp: activeTimestamp,
            $finalized: finalized,
            $timeServed : timeServed
        }
    );
}

const setReportArbitration = async (questionId: string, timeServed: number) => {
    const db = await openDb();

    await db.run(
        `UPDATE reports SET 
        arbitrationRequested = TRUE, timeServed = $timeServed, active = FALSE
        WHERE question_id = $question_id`,
        {
            $timeServed: timeServed,
            $question_id: questionId
        }
    );
}

const getDisputedReports = async() => {
    const db = await openDb();

    return await db.all('SELECT * FROM reports WHERE finalized = FALSE');
}

const getConcurrentReports = async(platform: string, groupId: string, userId: string, timestamp: number) => {
    const db = await openDb();

    const result = await db.all(
        'SELECT question_id, msg_id, group_id, timestamp FROM reports WHERE timestamp BETWEEN $timestamp1 AND $timestamp2 AND user_id = $user_id AND group_id = $group_id AND platform = $platform',
        {
            $timestamp1: timestamp - 3600,
            $timestamp2: timestamp + 3600,
            $user_id: userId,
            $group_id: groupId,
            $platform: platform
        }
    );

    return result;
}

const getQuestionId = async (platform: string, groupId: string, userId: string, msgId: string) => {
    const db = await openDb();

    const result = await db.get(`SELECT question_id FROM reports WHERE platform = ? AND group_id = ? AND user_id = ? AND msg_id = ?;`, platform, groupId, userId, msgId);

    return result?.question_id || '';
}

const getAllowance = async(platform: string, groupId: string, userId: string): Promise<{report_allowance: number, evidence_allowance: number, timestamp_refresh: number} | undefined> => {
    const db = await openDb();

    const result = await db.get(
        'SELECT report_allowance, evidence_allowance, timestamp_refresh FROM allowance WHERE user_id = $user_id AND group_id = $group_id AND platform = $platform',
        {
            $user_id: userId,
            $group_id: groupId,
            $platform: platform
        }
    );

    return result;
}

const setAllowance = async(platform: string, groupId: string, userId: string, reportAllowance: number, evidenceAllowance: number, timeRefresh: number) => {
    const db = await openDb();
//        'UPDATE allowance SET report_allowance = $report_allowance, evidence_allowance = $evidence_allowance, timestamp_refresh = $timestamp_refresh WHERE user_id = $user_id AND group_id = $group_id AND platform = $platform',
    
    await db.run(
        `INSERT INTO allowance (platform, group_id, user_id, report_allowance, evidence_allowance, timestamp_refresh) 
        VALUES ($platform, $group_id, $user_id, $report_allowance, $evidence_allowance, $timestamp_refresh) 
        ON CONFLICT(platform, group_id, user_id) DO UPDATE SET 
        report_allowance=$report_allowance, evidence_allowance = $evidence_allowance, timestamp_refresh = $timestamp_refresh;`,
        {
            $report_allowance: reportAllowance,
            $evidence_allowance: evidenceAllowance,
            $timestamp_refresh: timeRefresh,
            $user_id: userId,
            $group_id: groupId,
            $platform: platform
        }
    );
}


const getRecentReports = async(userId: string, timestamp: number) => {
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

const getFinalRecord = async(platform: string, groupId: string, userId: string) => {
    const db = await openDb();

    const result = await db.get(
        `SELECT COUNT(*) FROM reports 
        WHERE active = TRUE 
            AND finalized = TRUE 
            AND platform = $platform 
            AND group_id = $group_id 
            AND user_id = $user_id`,
        {
            $platform: platform,
            $group_id: groupId,
            $user_id: userId
        }
    );

    return result?.total || 0;
}

const getCurrentRecord = async(platform: string, groupId: string, userId: string) => {
    const db = await openDb();

    const result = await db.get(
        `SELECT COUNT(*) FROM reports 
        WHERE active = TRUE 
            AND platform = $platform 
            AND group_id = $group_id 
            AND user_id = $user_id`,
        {
            $platform: platform,
            $group_id: groupId,
            $user_id: userId
        }
    );

    return result.total;
}

export {
    getInviteURL,
    isAccountOwner,
    getQuestionId,
    setInviteURL,
    setAccount,
    getGroup,
    getActiveReportedUserAndGroupId,
    createAccount,
    setRules,
    getPermissions,
    getAllowance,
    setAllowance,
    setPermissions,
    getRules,
    addReport,
    setReport,
    getDisputedReports,
    getConcurrentReports,
    getFinalRecord,
    getCurrentRecord,
    setReportArbitration
}
