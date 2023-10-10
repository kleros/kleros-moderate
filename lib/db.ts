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

const setWarn = (db: any, platform: string, groupId: string, warnmode: number) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, warn_mode) 
            VALUES (?, ?, ?) 
            ON CONFLICT(platform, group_id) DO UPDATE SET 
            warn_mode=?;`);
        const info = stmt.run(platform, groupId, warnmode, warnmode);
    } catch(err) {
        console.log("db error: setWarn");
        console.log(err);
    }
}

const joinFederation = (db: any, platform: string, groupId: string, federation_id: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, federation_id) 
            VALUES (?, ?, ?) 
            ON CONFLICT(platform, group_id) DO UPDATE SET 
            federation_id=?;`);
        const info = stmt.run(platform, groupId, federation_id, federation_id);
    } catch(err) {
        console.log("db error: joinFederation");
        console.log(err);
    }
}

const setFederation = (db: any, platform: string, name: string, federation_id: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO federations (platform, federation_id, name) 
            VALUES (?, ?, ?) 
            ON CONFLICT(platform, federation_id) DO UPDATE SET 
            name=?;`);
        const info = stmt.run(platform, federation_id, name, name);
    } catch(err) {
        console.log("db error: joinFederation");
        console.log(err);
    }
}

const followFederation = (db: any, platform: string, groupId: string, federation_id_following: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, federation_id_following) 
            VALUES (?, ?, ?) 
            ON CONFLICT(platform, group_id) DO UPDATE SET 
            federation_id_following=?;`);
        const info = stmt.run(platform, groupId, federation_id_following, federation_id_following);
    } catch(err) {
        console.log("db error: joinFederation");
        console.log(err);
    }
}

const leaveFederation = (db: any, platform: string, groupId: string, federation_id: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, federation_id) 
            VALUES (?, ?, ?) 
            ON CONFLICT(platform, group_id) DO UPDATE SET 
            federation_id=?;`);
        const info = stmt.run(platform, groupId, federation_id, federation_id);
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

const setMultilangGroup = (db: any, platform: string, groupId: string, inviteUrl: string, lang: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groupsMultiLang (platform, group_id, invite_url, lang) 
            VALUES (?, ?, ?, ?) 
            ON CONFLICT (platform, group_id, lang) DO UPDATE SET 
            invite_url = ?;`);
        const info = stmt.run(platform, groupId, inviteUrl, lang, inviteUrl);
    } catch(err) {
        console.log("db error: setMultilangGroup, "+err);
    }
}

const setInviteURLChannel = (db: any, platform: string, groupId: string, inviteUrlChannel: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, invite_url_channel) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            invite_url_channel = ?;`);
        const info = stmt.run(platform, groupId, inviteUrlChannel, inviteUrlChannel);
    } catch(err) {
        console.log("db error: setInviteURLChannel, "+err);
    }
}

const setFederationInviteURLChannel = (db: any, platform: string, federation_id: string, inviteUrlChannel: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO federations (platform, federation_id, invite_url_channel) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, federation_id) DO UPDATE SET 
            invite_url_channel = ?;`);
        const info = stmt.run(platform, federation_id, inviteUrlChannel, inviteUrlChannel);
    } catch(err) {
        console.log("db error: setFederationInviteURLChannel, "+err);
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
        console.log("db error: setChannelID");
        console.log(err);
    }
}

const setFederationChannelID = (db: any, platform: string, federation_id: string, channel_id: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO federations (platform, federation_id, notification_channel_id) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, federation_id) DO UPDATE SET 
            notification_channel_id = ?;`);
        const info = stmt.run(platform, federation_id, channel_id, channel_id);
    } catch(err) {
        console.log("db error: setFederationChannelID");
        console.log(err);
    }
}

const getActiveReportsInfo = (db:any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT * FROM reports WHERE group_id = ? AND platform = ? AND answered IS NOT NULL AND NOT finalized = 1');
        return stmt.all(groupId, platform);
    } catch(err){
        console.log("db error: getDisputedReports");
        console.log(err);
    }
}

const getFederationChannel = (db: any, platform: string, federation_id: string) => {
    try{
        const stmt = db.prepare(
            `SELECT notification_channel_id FROM federations WHERE platform=? AND federation_id=?;`);
        return stmt.get(platform, federation_id)?.notification_channel_id;
    } catch(err) {
        console.log("db error: getFederationChannel "+err);
    }
}

const getFederationGroups = (db: any, platform: string, federation_id: string) => {
    try{
        const stmt = db.prepare(
            `SELECT group_id FROM groups WHERE platform=? AND federation_id=?;`);
        return stmt.get(platform, platform, federation_id);
    } catch(err) {
        console.log("db error: getFederationGroups "+err);
    }
}

const getGroupFederation = (db: any, platform: string, group_id: string): string | undefined => {
    try{
        const stmt = db.prepare('SELECT federation_id FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, group_id)?.federation_id;
    } catch(err){
        console.log("db error: getGroupFederation, "+err);
    }
}

const getGroupFederationFollowing = (db: any, platform: string, group_id: string): string | undefined => {
    try{
        const stmt = db.prepare('SELECT federation_id_following FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, group_id)?.federation_id_following;
    } catch(err){
        console.log("db error: getGroupFederationFollowing, "+err);
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
        console.log("db error: set setGreetingMode "+err);
    }
}
const setCaptchaMode = (db: any, platform: string, groupId: string, captcha_mode: number) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, captcha) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            captcha = ?;`);
        const info = stmt.run(platform, groupId, captcha_mode, captcha_mode);
    } catch(err) {
        console.log("db error: setCaptchaMode "+ err);
    }
}

const setEnforcementMode = (db: any, platform: string, groupId: string, enforcement_mode: number) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, enforcement) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            enforcement = ?;`);
        const info = stmt.run(platform, groupId, enforcement_mode, enforcement_mode);
    } catch(err) {
        console.log("db error: setCaptchaMode "+ err);
    }
}

const setAdminReportableMode = (db: any, platform: string, groupId: string, admin_reportable_mode: number) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, admins_reportable) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            admins_reportable = ?;`);
        const info = stmt.run(platform, groupId, admin_reportable_mode, admin_reportable_mode);
    } catch(err) {
        console.log("db error: setAdminReportableMode "+err);
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
        console.log("db error: set setThreadID, "+err);
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
        console.log("db error: set setThreadIDWelcome, "+err);
    }
}

const setTitle = (db: any, platform: string, groupId: string, title: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, title) 
            VALUES (?, ?, ?) 
            ON CONFLICT (platform, group_id) DO UPDATE SET 
            title = ?;`);
        const info = stmt.run(platform, groupId, title, title);
    } catch(err) {
        console.log("db error: setTitle, "+err);
    }
}

const getTitle = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare(
            `SELECT title
            FROM groups WHERE platform=? AND group_id=? `);
        const info = stmt.get(platform, groupId);
    } catch(err) {
        console.log("db error: setTitle, "+err);
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
        console.log("db error: getGroup, "+err);
    }    
}

const getInviteURL = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT invite_url FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.invite_url || '';
    } catch(err){
        console.log("db error: getInviteURL, "+err);
    }
}

const getMultilangGroup = (db: any, platform: string, groupId: string, lang: string) => {
    try{
        const stmt = db.prepare('SELECT invite_url FROM groupsMultiLang WHERE platform = ? AND group_id = ? AND lang = ?');
        return stmt.get(platform, groupId, lang)?.invite_url || '';
    } catch(err) {
        console.log("db error: getMultilangGroup, "+err);
    }
}

const getInviteURLChannel = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT invite_url_channel FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.invite_url_channel || '';
    } catch(err){
        console.log("db error: getInviteURLChannel, "+err);
    }
}

const getFederatedInviteURLChannel = (db: any, platform: string, federation_id: string) => {
    try{
        const stmt = db.prepare('SELECT invite_url_channel FROM federations WHERE platform = ? AND federation_id = ?');
        return stmt.get(platform, federation_id)?.invite_url_channel || '';
    } catch(err){
        console.log("db error: getFederatedInviteURLChannel, "+err);
    }
}


const existsQuestionId = (db: any, question_id: string): boolean => {
    try{
        const stmt = db.prepare('SELECT question_id FROM reports WHERE question_id = ?');
        return stmt.get(question_id)?.length > 0;
    } catch(err){
        console.log("db error: existsQuestionId, "+err);
    }
}

const getFederationName = (db: any, platform: string, federation_id: string): string | undefined => {
    try{
        const stmt = db.prepare('SELECT name FROM federations WHERE platform = ? AND federation_id = ?');
        return stmt.get(platform, federation_id)?.name;
    } catch(err){
        console.log("db error: getFederationName, "+err);
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
            captcha: result?.captcha,
            admin_reportable: result?.admins_reportable,
            enforcement: result?.enforcement,
            federation_id: result?.federation_id,
            federation_id_following: result?.federation_id_following,
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

const getReportsUserInfo = (db:any, platform: string, groupId: string, userId: string) => {
    try{
        const stmt = db.prepare('SELECT question_id, group_id, active,msgBackup, msg_id, answered, evidenceIndex, timestamp_msg, finalized FROM reports WHERE user_id = ? AND group_id = ? AND platform = ?  AND answered IS NOT NULL AND ((active = 1 AND finalized = 1) OR finalized = 0)');
        return stmt.all(userId, groupId, platform);
    } catch(err){
        console.log("db error: getReportsUserInfo, "+err);
    }
}

const getReportsUserInfoFederation = (db:any, platform: string, userId: string, federation_id: string, group_id_not: string) => {
    try{
        const stmt = db.prepare(`SELECT question_id, group_id, answered, active,msgBackup, msg_id, evidenceIndex, timestamp_msg, finalized FROM reports WHERE user_id = ? AND platform = ? AND answered IS NOT NULL AND ((active = 1 AND finalized = 1) OR finalized = 0) AND NOT group_id = ? AND group_id IN (
            SELECT group_id
            FROM groups
            WHERE federation_id = ? AND platform = ?
        )`);
        return stmt.all(userId, platform,group_id_not,federation_id,platform);
    } catch(err){
        console.log("db error: getReportsUserInfoFederation, "+err);
    }
}

const getReportsUserInfoActive = (db:any, platform: string, groupId: string, userId: string) => {
    try{
        const stmt = db.prepare('SELECT question_id, active,msgBackup, msg_id, evidenceIndex, timestamp_msg, finalized FROM reports WHERE user_id = ? AND group_id = ? AND platform = ? AND (NOT finalized = 1 OR finalized IS NULL)');
        return stmt.all(userId, groupId, platform);
    } catch(err){
        console.log("db error: getReportsUserInfoActive, "+err);
    }
}

const getQuestionId = (db: any, platform: string, groupId: string, userId: string, msgId: string) => {
    try{
        const stmt = db.prepare(`SELECT question_id FROM reports WHERE platform = ? AND group_id = ? AND user_id = ? AND msg_id = ?`);
        return stmt.get(platform, groupId, userId, msgId)?.question_id || '';
    } catch(err){
        console.log("db error: getQuestionId, "+err);
    }
}

const getCron = (db: any): {last_timestamp: number, last_block: number} => {
    try{
        const stmt = db.prepare(`SELECT last_block, last_timestamp FROM cron WHERE bot_index = 0`);
        return stmt.get();
    } catch(err){
        console.log("db error: getCron, "+err);
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
        console.log("db error: setCron, "+err);
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
        console.log("db error: getRecordCount, "+err);
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

const setReport = (db: any, questionId: string, active: boolean, answered: boolean, finalized: boolean, disputed: boolean, timestamp_active: number, timestamp_finalized: number) => {
    try{
        const stmt = db.prepare(
            `UPDATE reports SET active = ?, answered = ?, finalized = ?, disputed = ?, timestamp_active = ?, timestamp_finalized = ?
            WHERE question_id = ?`
            );
        const info = stmt.run(Number(active), Number(answered),Number(finalized), Number(disputed), timestamp_active, timestamp_finalized, questionId);
    } catch(err) {
        console.log("db error: setReport, "+err);
    }
}

const getActiveEvidenceGroupId = (db: any, platform: string, groupId: string, evidenceIndex: string) => {
    try{
        const stmt = db.prepare( `SELECT question_id FROM reports WHERE platform = ? AND group_id = ? AND evidenceIndex = ? AND (NOT finalized = 1 OR finalized IS NULL)`);
        return stmt.get(platform, groupId, evidenceIndex)?.question_id;
    } catch(err) {
        console.log("db error: getActiveEvidenceGroupId" + err);
    }
}

const isInFederation = (db: any, platform: string, federationId: string) => {
    try{
        const stmt = db.prepare( `
            SELECT group_id
            FROM groups
            WHERE federation_id = ? AND platform = ?
        `);
        return stmt.get(federationId, platform)?.length > 0
    } catch (err){
        console.log("db error: getGroupsInFederation" + err);
    }
}

const getGroupsInFederation = (db: any, platform: string, federationId: string) => {
    try{
        const stmt = db.prepare( `
            SELECT group_id
            FROM groups
            WHERE federation_id = ? AND platform = ?
        `);
        return stmt.all(federationId, platform)
    } catch (err){
        console.log("db error: getGroupsInFederation" + err);
    }
}

const getGroupsInAndFollowingFederation = (db: any, platform: string, federationId: string) => {
    try{
        const stmt = db.prepare( `
            SELECT group_id
            FROM groups
            WHERE platform = ? AND (federation_id = ? OR federation_id_following = ?)
        `);
        return stmt.all(platform, federationId, federationId)
    } catch (err){
        console.log("db error: getGroupsInAndFollowingFederation" + err);
    }
}

const getLocalBanHistory = (db: any, platform: string, userId: string, group_id: string, finalized: boolean, timestamp_forgiven: number) => {
    const base = getLocalBanHistoryBase(db, platform, userId, group_id, finalized, timestamp_forgiven)
    if (!base)
        return [];

    // sqlit3 couldn't do recursive agregate queries
    // report ban depth is capped at 3 or 4 levels (1 day, 1 week, permaban)
    // just going a few inductive steps, could be more efficient in a full query
    const banLevel1 = getLocalBanHistoryInduction(db,platform,userId,group_id,base.timestamp, finalized)
    if(!banLevel1)
        return [base]
    const banLevel2 = getLocalBanHistoryInduction(db,platform,userId,group_id,banLevel1.timestamp, finalized)
    if(!banLevel2)
        return [base, banLevel1]
    const banLevel3 = getLocalBanHistoryInduction(db,platform,userId,group_id,banLevel2.timestamp, finalized)
    if(!banLevel2)
        return [base, banLevel1, banLevel2]

    return [base, banLevel1, banLevel2, banLevel3]
}

const getLocalBanHistoryBase = (db: any, platform: string, userId: string, group_id: string, finalized: boolean, timestamp_forgiven: number) => {
    try{
        const stmt = db.prepare(`
        SELECT question_id, timestamp_active, timestamp_finalized, timestamp_report as timestamp
        FROM reports
        WHERE platform = ? AND user_id = ? ${finalized? 'AND finalized = 1': ''} AND active = 1 AND timestamp_msg > ? AND group_id = ?
        ORDER BY timestamp_report ASC`)
        return stmt.get(platform, userId, timestamp_forgiven, group_id);
    } catch (err){
        console.log("db error: getLocalBanHistoryBase" + err);
    }
}

const getLocalBanHistoryInduction = (db: any, platform: string, userId: string, group_id: string, timestamp_last: number, finalized: boolean) => {
    try{
        const stmt = db.prepare(`
        SELECT question_id, timestamp_active, timestamp_finalized, timestamp_report as timestamp
        FROM reports
        WHERE platform = ? AND user_id = ? ${finalized? 'AND finalized = 1': ''} AND active = 1 AND group_id = ? AND timestamp_msg > ?
        ORDER BY timestamp_report ASC`)
        return stmt.get(platform, userId, group_id,timestamp_last);
    } catch (err){
        console.log("db error: getLocalBanHistoryInduction" + err);
    }
}

const getFederatedBanHistory = (db: any, platform: string, userId: string, federation_id: string, finalized: boolean, timestamp_forgiven: number) => {
    const base = getFederatedBanHistoryBase(db, platform, userId, federation_id, finalized, timestamp_forgiven)
    if (!base)
        return [];

    // sqlit3 couldn't do recursive agregate queries
    // report ban depth is capped at 3 or 4 levels (1 day, 1 week, permaban)
    // just going a few inductive steps, could be more efficient in a full query

    const banLevel1 = getFederatedBanHistoryInduction(db,platform,userId,federation_id,base.timestamp, finalized)
    if(!banLevel1)
        return [base]
    const banLevel2 = getFederatedBanHistoryInduction(db,platform,userId,federation_id,banLevel1.timestamp, finalized)
    if(!banLevel2)
        return [base, banLevel1]
    const banLevel3 = getFederatedBanHistoryInduction(db,platform,userId,federation_id,banLevel2.timestamp, finalized)
    if(!banLevel3)
        return [base, banLevel1, banLevel2]

    return [base, banLevel1, banLevel2, banLevel3]
    }

const getFederatedBanHistoryBase = (db: any, platform: string, userId: string, federation_id: string, finalized: boolean, timestamp_forgiven: number) => {
    try{
        /*
        SELECT question_id, timestamp_active, timestamp_report as timestamp
        FROM reports
        WHERE platform = ? AND user_id = ? ${finalized? 'AND finalized = 1': ''} AND active = 1 AND group_id = ?
        ORDER BY timestamp_report ASC`)*/
        const stmt = db.prepare(`
        SELECT question_id, timestamp_active, timestamp_finalized, timestamp_report as timestamp
        FROM reports
        WHERE platform = ? AND user_id = ? ${finalized? 'AND finalized = 1': ''} AND active = 1 AND timestamp_msg > ? AND group_id IN (
            SELECT group_id
            FROM groups
            WHERE federation_id = ? AND platform = ?
        )
        order by timestamp_report asc;`);
        return stmt.get(platform, userId, timestamp_forgiven, federation_id, platform);
    } catch (err){
        console.log("db error: getFederatedBanHistoryBase" + err);
    }
}

const getFederatedBanHistoryInduction = (db: any, platform: string, userId: string, federation_id: string, timestamp_last: number, finalized: boolean) => {
    try{
        const stmt = db.prepare(`
        SELECT question_id, timestamp_active, timestamp_finalized, timestamp_report as timestamp
        FROM reports
        WHERE platform = ? AND user_id = ? ${finalized? 'AND finalized = 1': ''} AND active = 1 AND timestamp_msg > ? AND group_id IN (
            SELECT group_id
            FROM groups
            WHERE federation_id = ? AND platform = ?
        )
        order by timestamp_report asc;`);
        return stmt.get(platform, userId,timestamp_last,federation_id,platform);
    } catch (err){
        console.log("db error: getFederatedBanHistoryInduction" + err);
    }
}

const getFederatedFollowingBanHistory = (db: any, platform: string, userId: string, group_id: string, federation_id: string, finalized: boolean, timestamp_forgiven: number) => {
    const base = getFederatedFollowingBanHistoryBase(db, platform, userId, group_id, federation_id, finalized, timestamp_forgiven)
    if (!base)
        return [];

    // sqlit3 couldn't do recursive agregate queries
    // report ban depth is capped at 3 or 4 levels (1 day, 1 week, permaban)
    // just going a few inductive steps, could be more efficient in a full query
    const banLevel1 = getFederatedFollowingBanHistoryInduction(db,platform,userId,group_id, federation_id,base.timestamp, finalized)
    if(!banLevel1)
        return [base]
    const banLevel2 = getFederatedFollowingBanHistoryInduction(db,platform,userId,group_id,federation_id,banLevel1.timestamp, finalized)
    if(!banLevel2)
        return [base, banLevel1]
    const banLevel3 = getFederatedFollowingBanHistoryInduction(db,platform,userId,group_id,federation_id,banLevel2.timestamp, finalized)
    if(!banLevel2)
        return [base, banLevel1, banLevel2]

    return [base, banLevel1, banLevel2, banLevel3]
    }

const getFederatedFollowingBanHistoryBase = (db: any, platform: string, userId: string, group_id: string, federation_id: string, finalized: boolean, timestamp_forgiven: number) => {
    try{
        const stmt = db.prepare(`
        SELECT question_id, timestamp_active, timestamp_finalized, timestamp_report as timestamp
        FROM reports
        WHERE platform = ? AND user_id = ? ${finalized? 'AND finalized = 1': ''} AND active = 1 AND timestamp_msg > ? AND (group_id = ? OR group_id IN (
            SELECT group_id
            FROM groups
            WHERE federation_id = ? AND platform = ?
        ))
        order by timestamp_report asc;`);
        return stmt.get(platform, userId, timestamp_forgiven, group_id, federation_id, platform);
    } catch (err){
        console.log("db error: getFederatedBanHistoryBase" + err);
    }
}

const getFederatedFollowingBanHistoryInduction = (db: any, platform: string, userId: string,  group_id: string, federation_id: string, timestamp_last: number, finalized: boolean) => {
    try{
        const stmt = db.prepare(`
        SELECT question_id, timestamp_active, timestamp_finalized, timestamp_report as timestamp
        FROM reports
        WHERE platform = ? AND user_id = ? ${finalized? 'AND finalized = 1': ''} AND active = 1 AND timestamp_msg > ? AND  (group_id = ? OR group_id IN (
            SELECT group_id
            FROM groups
            WHERE federation_id = ? AND platform = ?
        ))
        order by timestamp_report asc;`);
        return stmt.get(platform, userId,group_id, timestamp_last,federation_id,platform);
    } catch (err){
        console.log("db error: getFederatedBanHistoryInduction" + err);
    }
}
/* RECURSIVE ATTEMPT
const getFederatedBanHistory = (db: any, platform: string, userId: string, federationId: string) => {
    try{
        const stmt = db.prepare(`
        WITH calculatedBanHistory AS (
            SELECT question_id, MIN(timestamp_report) AS timestamp
            FROM reports
            WHERE user_id = ? AND finalized = 1 AND active = 1 AND group_id IN (
                SELECT group_id
                FROM groups
                WHERE federation_id = ? AND platform = ?
            )
            GROUP BY question_id

            UNION ALL

            SELECT question_id, MIN(timestamp_report)
            FROM reports
            WHERE user_id = ? AND finalized = 1 AND active = 1 AND timestamp_msg > timestamp AND group_id IN (
                SELECT group_id
                FROM groups
                WHERE federation_id = ? AND platform = ?
            )
            GROUP BY question_id
        )
        SELECT * FROM calculatedBanHistory
        `);
        return stmt.all(userId, federationId, platform,userId, federationId, platform);
    } catch (err){
        console.log("db error: getFederatedBanLevel" + err);
    }
}
*/


const getUsersWithQuestionsNotFinalized = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare( `SELECT DISTINCT user_id, username FROM reports WHERE platform = ? AND group_id = ? AND (NOT finalized = 1 OR finalized IS NULL)`);
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

const getWarn = (db:any, platform: string, groupId: string): number => {
    try{
        const stmt = db.prepare('SELECT warn_mode FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.warn_mode || 0;
    } catch(err){
        console.log("db error: getWarn");
        console.log(err);
    }
}

const getReportMessageTimestampAndActive = (db:any, question_id: string):  {timestamp_report: number, active: number, timestamp_msg: number} | undefined => {
    try{
        const stmt = db.prepare('SELECT timestamp_msg, active, timestamp_report FROM reports WHERE question_id = ?');
        return stmt.get(question_id);
    } catch(err){
        console.log("db error: getReportMessageTimestamp");
        console.log(err);
    }
}

const getTimestampFinalized = (db:any, question_id: string):  number | undefined => {
    try{
        const stmt = db.prepare('SELECT timestamp_finalized FROM reports WHERE question_id = ?');
        return stmt.get(question_id)?.timestamp_finalized;
    } catch(err){
        console.log("db error: getTimestampFinalized");
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

const getForgiveness = (db:any, platform: string, groupId: string, userId: string): any => {
    try{
        const stmt = db.prepare(`
        SELECT * FROM forgivness 
        WHERE platform = ? AND group_id = ? AND user_id = ?`);
        return stmt.get(platform, groupId, userId)?.timestamp || 0;
    } catch(err){
        console.log("db error: getForgiveness " + err);
    }
}

const setForgiveness = (db:any, platform: string, groupId: string, userId: string, timestamp: number) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO forgivness (platform, group_id, user_id, timestamp)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(platform, group_id, user_id) DO UPDATE SET 
            timestamp=?;`);
        const info = stmt.run(platform, groupId, userId, timestamp, timestamp);
    } catch(err) {
        console.log("db error: setRules");
        console.log(err);
    }
}

const setRulesCustom = (db:any, platform: string, groupId: string, rules: string, timestamp: number, msg_id: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO rules (platform, group_id, rules, timestamp, msg_id)
            VALUES (?, ?, ?, ?, ?);`);
        const info = stmt.run(platform, groupId, rules, timestamp, msg_id);
    } catch(err) {
        console.log("db error: setRulesCustom");
        console.log(err);
    }
}


const getRule = (db:any, platform: string, groupId: string, timestamp: number): any => {
    try{
        const stmt = db.prepare(`SELECT *
        FROM rules 
        WHERE platform = ? and group_id = ? and timestamp < ?
        ORDER BY timestamp DESC;`);
        return stmt.get(platform, groupId,timestamp);
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
    timestampMsg: number,
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
                    timestamp_msg, 
                    timestamp_report,
                    evidenceIndex,
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
                        ?,
                        ?);`);
            const info = stmt.run(
                questionId,
                platform,
                groupId,
                userId,
                username,
                msgId,
                timestampMsg,
                Math.floor(Date.now()/1000),
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
    getWarn,
    setWarn,
    getInviteURLChannel,
    setInviteURLChannel,
    getThreadIDWelcome,
    getGroupSettings,
    getMultilangGroup,
    setMultilangGroup,
    setThreadIDWelcome,
    setAllowance,
    getAllowance,
    getTitle,
    setRulesCustom,
    setEnforcementMode,
    setReport,
    setFederation,
    getFederatedBanHistoryBase,
    getFederatedFollowingBanHistoryBase,
    getLocalBanHistoryBase,
    getReportsUserInfoFederation,
    followFederation,
    addReport,
    setFederationChannelID,
    getUsersWithQuestionsNotFinalized,
    getQuestionId,
    getActiveEvidenceGroupId,
    setChannelID,
    getReportMessageTimestampAndActive,
    getReportsUserInfo,
    setAdminReportableMode,
    setCaptchaMode,
    getTimestampFinalized,
    setFederationInviteURLChannel,
    getChannelID,
    getActiveReportsInfo,
    setForgiveness,
    getForgiveness,
    leaveFederation,
    getGroupFederation,
    getFederationChannel,
    setTitle,
    getGroupFederationFollowing,
    joinFederation,
    getFederatedFollowingBanHistory,
    isInFederation,
    getLocalBanHistory,
    getReportsUserInfoActive,
    getFederatedInviteURLChannel,
    getFederatedBanHistory,
    getGroupsInAndFollowingFederation,
    getFederationGroups,
    getGreetingMode,
    eraseThreadID,
    getFederationName,
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