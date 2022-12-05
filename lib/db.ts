const Database = require('better-sqlite3');
import { groupSettingsUnderspecified } from "../types";

export function openDb() {
    const db = new Database('database.db');
    db.pragma('journal_mode = WAL');
    return db;
}

const setLang = (db: any, platform: string, groupId: string, lang: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, lang) 
            VALUES (?, ?, ?) 
            ON CONFLICT(platform, group_id) DO UPDATE SET 
            lang=?;`);
        const info = stmt.run(platform, groupId, lang, lang);
    } catch(err) {
        console.log("db error: setLang");
        console.log(err);
    }
}

const joinFederation = (db: any, platform: string, groupId: string, owner_user_id: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, owner_user_id) 
            VALUES (?, ?, ?) 
            ON CONFLICT(platform, group_id) DO UPDATE SET 
            owner_user_id=?;`);
        const info = stmt.run(platform, groupId, owner_user_id, owner_user_id);
    } catch(err) {
        console.log("db error: joinFederation");
        console.log(err);
    }
}

const leaveFederation = (db: any, platform: string, groupId: string, owner_user_id: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, owner_user_id) 
            VALUES (?, ?, ?) 
            ON CONFLICT(platform, group_id) DO UPDATE SET 
            owner_user_id=?;`);
        const info = stmt.run(platform, groupId, owner_user_id, owner_user_id);
    } catch(err) {
        console.log("db error: leaveFederation");
        console.log(err);
    }
}

const setInviteURL = (db: any, platform: string, groupId: string, inviteUrl: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, invite_url) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            invite_url = ?;`);
        const info = stmt.run(platform, groupId, inviteUrl, inviteUrl);
    } catch(err) {
        console.log("db error: setInviteURL");
        console.log(err);
    }
}

const setInviteURLChannel = (db: any, platform: string, groupId: string, inviteUrlChannel: string) => {
    try{
        console.log('yo');
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, invite_url_channel) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            invite_url_channel = ?;`);
        const info = stmt.run(platform, groupId, inviteUrlChannel, inviteUrlChannel);
    } catch(err) {
        console.log("db error: setInviteURLChannel");
        console.log(err);
    }
}

const setChannelID = (db: any, platform: string, groupId: string, channel_id: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, channel_id) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            channel_id = ?;`);
        const info = stmt.run(platform, groupId, channel_id, channel_id);
    } catch(err) {
        console.log("db error: set setChannelID");
        console.log(err);
    }
}

const getDisputedReportsInfo = (db:any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT * FROM reports WHERE finalized = 0 AND group_id = ? AND platform = ? AND active_timestamp > 0');
        return stmt.all(groupId, platform);
    } catch(err){
        console.log("db error: getDisputedReports");
        console.log(err);
    }
}

const getFederationGroups = (db: any, platform: string, owner_user_id: string) => {
    try{
        const stmt = db.prepare(
            `SELECT group_id FROM groups WHERE platform=? AND owner_user_id=?;`);
        const info = stmt.run(platform, platform, owner_user_id);
    } catch(err) {
        console.log("db error: setLang");
        console.log(err);
    }
}

const setGreetingMode = (db: any, platform: string, groupId: string, greeting_mode: number) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, greeting_mode) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            greeting_mode = ?;`);
        const info = stmt.run(platform, groupId, greeting_mode, greeting_mode);
    } catch(err) {
        console.log("db error: set setGreetingMode");
        console.log(err);
    }
}

const setThreadID = (db: any, platform: string, groupId: string, thread_id_rules: string, thread_id_notifications: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, thread_id_rules, thread_id_notifications) 
            VALUES (?, ?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            thread_id_rules = ?, thread_id_notifications = ?;`);
        const info = stmt.run(platform, groupId, thread_id_rules, thread_id_notifications, thread_id_rules, thread_id_notifications);
    } catch(err) {
        console.log("db error: set setThreadID");
        console.log(err);
    }
}

const eraseThreadID = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, thread_id_rules, thread_id_notifications, thread_id_welcome) 
            VALUES (?, ?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            thread_id_rules = ?, thread_id_notifications = ?, thread_id_welcome = ?;`);
        const info = stmt.run(platform, groupId, '', '', '', '', '', '');
    } catch(err) {
        console.log("db error: set eraseThreadID");
        console.log(err);
    }
}

const setThreadIDWelcome = (db: any, platform: string, groupId: string, thread_id_welcome: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, thread_id_welcome) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            thread_id_welcome = ?;`);
        const info = stmt.run(platform, groupId, thread_id_welcome, thread_id_welcome);
    } catch(err) {
        console.log("db error: set setThreadIDWelcome");
        console.log(err);
    }
}


const getGroup = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare(
            `SELECT groups.address, private_key FROM accounts 
            LEFT JOIN groups ON groups.address = accounts.address
            WHERE groups.platform = ? AND groups.group_id = ?`
        );
        return stmt.get(platform, groupId);
    } catch(err) {
        console.log("db error: getGroup");
        console.log(err);
    }    
}

const getInviteURL = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT invite_url FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.invite_url || '';
    } catch(err){
        console.log("db error: getInviteURL");
        console.log(err);
    }
}

const getInviteURLChannel = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT invite_url_channel FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.invite_url_channel || '';
    } catch(err){
        console.log("db error: getInviteURLChannel");
        console.log(err);
    }
}


const existsQuestionId = (db: any, question_id: string): boolean => {
    try{
        const stmt = db.prepare('SELECT * FROM reports WHERE question_id = ?');
        return stmt.get(question_id)?.length > 0;
    } catch(err){
        console.log("db error: getGreetingMode");
        console.log(err);
    }
}

const getGreetingMode = (db: any, platform: string, groupId: string): boolean => {
    try{
        const stmt = db.prepare('SELECT greeting_mode FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.greeting_mode === 1;
    } catch(err){
        console.log("db error: getGreetingMode");
        console.log(err);
    }
}

const getChannelID = (db: any, platform: string, groupId: string): string => {
    try{
        const stmt = db.prepare('SELECT channel_id FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.channel_id;
    } catch(err){
        console.log("db error: getChannelID");
        console.log(err);
    }
}



const getGroupSettings = (db: any, platform: string, groupId: string): groupSettingsUnderspecified => {
    try{
        const stmt = db.prepare('SELECT * FROM groups WHERE platform = ? AND group_id = ?');
        const result = stmt.get(platform, groupId);
        return {
            lang: result?.lang,
            rules: undefined,
            channelID: result?.channel_id,
            thread_id_rules: result?.thread_id_rules,
            thread_id_notifications: result?.thread_id_notifications,
            thread_id_welcome: result?.thread_id_welcome,
            greeting_mode: result?.greeting_mode,
        }
    } catch(err){
        console.log("db error: getGroupSettings");
        console.log(err);
    }
}

const getThreadIDRules = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT thread_id_rules FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.thread_id_rules || '';
    } catch(err){
        console.log("db error: getThreadIDRules");
        console.log(err);
    }
}

const getConcurrentReports = (db: any, platform: string, groupId: string, userId: string, timestamp: number) => {
    try{
        const stmt = db.prepare('SELECT question_id, msg_id, group_id, timestamp FROM reports WHERE timestamp BETWEEN ? AND ? AND user_id = ? AND group_id = ? AND platform = ?');
        return stmt.all(timestamp - 3600, timestamp + 3600, userId, groupId, platform);
    } catch(err){
        console.log("db error: getConcurrentReports");
        console.log(err);
    }
}

const getDisputedReportsUserInfo = (db:any, platform: string, groupId: string, userId: string) => {
    try{
        const stmt = db.prepare('SELECT question_id, active, active_timestamp,msgBackup, msg_id, evidenceIndex, timestamp FROM reports WHERE user_id = ? AND group_id = ? AND platform = ? AND finalized = 0');
        return stmt.all(userId, groupId, platform);
    } catch(err){
        console.log("db error: getDisputedReportsUserInfo");
        console.log(err);
    }
}

const getQuestionId = (db: any, platform: string, groupId: string, userId: string, msgId: string) => {
    try{
        const stmt = db.prepare(`SELECT question_id FROM reports WHERE platform = ? AND group_id = ? AND user_id = ? AND msg_id = ?`);
        return stmt.get(platform, groupId, userId, msgId)?.question_id || '';
    } catch{
        console.log("db error: getQuestionId");
    }
}

const getCron = (db: any): {last_timestamp: number, last_block: number} => {
    try{
        const stmt = db.prepare(`SELECT last_block, last_timestamp FROM cron WHERE bot_index = 0`);
        return stmt.get();
    } catch{
        console.log("db error: getCron");
    }
}

const setCron = (db: any, last_block: number, last_timestamp: number) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO cron (bot_index, last_block, last_timestamp) 
            VALUES (0, ?, ?) 
            ON CONFLICT(bot_index) DO UPDATE SET 
            last_block=?, last_timestamp=?;`);
        const info = stmt.run(last_block, last_timestamp,last_block, last_timestamp);
    } catch(err) {
        console.log("db error: setCron");
        console.log(err);
    }
}

const getRecordCount = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare(  
        `SELECT COUNT(*) as total FROM reports 
        WHERE platform = ? AND group_id = ?`
        );
        return stmt.get(platform, groupId)?.total || 0;
    } catch(err) {
        console.log("db error: getRecordCount");
        console.log(err);
    }
}

const getAllowance = (db: any, platform: string, groupId: string, userId: string): {report_allowance: number, evidence_allowance: number, timestamp_refresh: number,  question_id_last: string, timestamp_last_question: number} | undefined => {
    try{
        const stmt = db.prepare('SELECT report_allowance, evidence_allowance, timestamp_refresh FROM allowance WHERE user_id = ? AND group_id = ? AND platform = ?');
        return stmt.get(userId, groupId, platform);
    } catch(e){
        console.log("db error: getAllowance "+e);
    }
}

const setReport = (db: any, questionId: string, active: boolean, finalized: boolean, activeTimestamp: number) => {
    try{
        const stmt = db.prepare(
            'UPDATE reports SET active = ?, finalized = ?, active_timestamp = ? WHERE question_id = ?',
            );
        const info = stmt.run(Number(active), Number(finalized), activeTimestamp, questionId);
    } catch(err) {
        console.log("db error: setReport");
        console.log(err);
    }
}

const getBanHistory = (db: any, platform: string, groupId: string, userId: string): {ban_level: number, timestamp_ban: number, count_current_level_optimistic_bans: number} | undefined => {
    try{
        const stmt = db.prepare('SELECT ban_level, timestamp_ban, count_current_level_optimistic_bans FROM banHistory WHERE user_id = ? AND group_id = ? AND platform = ?');
        return stmt.get(userId, groupId, platform);
    } catch(e){
        console.log("db error: getBanHistory "+e);
    }
}

const getActiveEvidenceGroupId = (db: any, platform: string, groupId: string, evidenceIndex: number) => {
    try{
        const stmt = db.prepare( `SELECT question_id FROM reports WHERE platform = ? AND group_id = ? AND evidenceIndex = ? AND finalized = 0`);
        return stmt.get(platform, groupId, evidenceIndex)?.question_id;
    } catch(err) {
        console.log("db error: getActiveEvidenceGroupId");
        console.log(err);
    }
}

const getUsersWithQuestionsNotFinalized = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare( `SELECT DISTINCT user_id, username FROM reports WHERE platform = ? AND group_id = ? AND finalized = 0`);
        return stmt.all(platform, groupId);
    } catch(err) {
        console.log("db error: getActiveEvidenceGroupId");
        console.log(err);
    }
}

const setAllowance = (
    db: any,
    platform: string, 
    groupId: string, 
    userId: string, 
    reportAllowance: number, 
    evidenceAllowance: number, 
    timeRefresh: number
    ) => {
        try{
            const stmt = db.prepare(
                `INSERT INTO allowance (platform, group_id, user_id, report_allowance, evidence_allowance, timestamp_refresh) 
                VALUES (?, ?, ?, ?, ?, ?) 
                ON CONFLICT(platform, group_id, user_id) DO UPDATE SET 
                report_allowance=?, evidence_allowance = ?, timestamp_refresh = ?;`
            );
            const info = stmt.run(platform, groupId, userId, reportAllowance, evidenceAllowance, timeRefresh,reportAllowance, evidenceAllowance, timeRefresh);
        } catch(e) {
            console.log("db error: setAllowance"+e);
        }
}

const setBanHistory = (
    db: any,
    platform: string, 
    groupId: string, 
    userId: string, 
    ban_level: number, 
    timestamp_ban: number,
    count_current_level_optimistic_bans: number
    ) => {
        try{
            const stmt = db.prepare(
                `INSERT INTO banHistory (platform, group_id, user_id, ban_level, timestamp_ban, count_current_level_optimistic_bans) 
                VALUES (?, ?, ?, ?, ?, ?) 
                ON CONFLICT(platform, group_id, user_id) DO UPDATE SET 
                ban_level=?, timestamp_ban = ?, count_current_level_optimistic_bans=?;`
            );
            const info = stmt.run(platform, groupId, userId, ban_level, timestamp_ban,count_current_level_optimistic_bans,ban_level, timestamp_ban,count_current_level_optimistic_bans);
        } catch(e) {
            console.log("db error: setBanHistory"+e);
        }
}

const getThreadIDWelcome = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT thread_id_welcome FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.thread_id_welcome || '';
    } catch(err){
        console.log("db error: getThreadIDWelcome");
        console.log(err);
    }
}

const getThreadIDNotifications = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT thread_id_notifications FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.thread_id_notifications || '';
    } catch(err){
        console.log("db error: getThreadIDNotifications");
        console.log(err);
    }
} 

const getLang = (db:any, platform: string, groupId: string): string => {
    try{
        const stmt = db.prepare('SELECT lang FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.lang;
    } catch(err){
        console.log("db error: getLang");
        console.log(err);
    }
}

const getReportMessageTimestampAndActive = (db:any, question_id: string):  {timestamp: number, active: number} | undefined => {
    try{
        const stmt = db.prepare('SELECT timestamp, active FROM reports WHERE question_id = ?');
        return stmt.get(question_id);
    } catch(err){
        console.log("db error: getReportMessageTimestamp");
        console.log(err);
    }
}

const setRules = (db:any, platform: string, groupId: string, rules: string, timestamp: number) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO rules (platform, group_id, rules, timestamp)
            VALUES (?, ?, ?, ?);`);
        const info = stmt.run(platform, groupId, rules, timestamp);
    } catch(err) {
        console.log("db error: setRules");
        console.log(err);
    }
}


const getRule = (db:any, platform: string, groupId: string, timestamp: number): string => {
    try{
        const stmt = db.prepare(`SELECT rules
        FROM rules 
        WHERE platform = ? and group_id = ? and timestamp < ?
        ORDER BY timestamp DESC;`);
        return stmt.get(platform, groupId,timestamp)?.rules;
    } catch(err){
        console.log("db error: getRule " + err);
    }
}

const addReport = (
    db: any,
    questionId: string, 
    platform: string, 
    groupId: string, 
    userId: string, 
    username: string, 
    msgId: string,
    msgTimestamp: number,
    evidenceIndex: number,
    msgBackup: string
    ) => {
        try{
            const stmt = db.prepare(
                `INSERT INTO reports (
                    question_id, 
                    platform, 
                    group_id, 
                    user_id, 
                    username,
                    msg_id, 
                    timestamp, 
                    evidenceIndex,
                    finalized,
                    active,
                    active_timestamp,
                    msgBackup) 
                    VALUES (
                        ?, 
                        ?, 
                        ?, 
                        ?, 
                        ?,
                        ?, 
                        ?, 
                        ?,
                        0,
                        0,
                        0,
                        ?);`);
            const info = stmt.run(
                questionId,
                platform,
                groupId,
                userId,
                username,
                msgId,
                msgTimestamp,
                evidenceIndex,
                msgBackup);
        } catch(e) {
            console.log("db error: addReport."+e);
        }

}

export {
    getInviteURL,
    existsQuestionId,
    setInviteURL,
    getInviteURLChannel,
    setInviteURLChannel,
    getThreadIDWelcome,
    getGroupSettings,
    setThreadIDWelcome,
    setAllowance,
    getAllowance,
    setReport,
    addReport,
    getUsersWithQuestionsNotFinalized,
    getQuestionId,
    getConcurrentReports,
    getActiveEvidenceGroupId,
    setChannelID,
    setBanHistory,
    getBanHistory,
    getReportMessageTimestampAndActive,
    getDisputedReportsUserInfo,
    getChannelID,
    getDisputedReportsInfo,
    leaveFederation,
    joinFederation,
    getFederationGroups,
    getGreetingMode,
    eraseThreadID,
    setGreetingMode,
    getRecordCount,
    setLang,
    getCron,
    setCron,
    getLang,
    setRules,
    setThreadID,
    getThreadIDNotifications,
    getThreadIDRules,
    getRule
}