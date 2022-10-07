const Database = require('better-sqlite3');

export function openDb() {
    const db = new Database('database.db', { verbose: console.log });
    db.pragma('journal_mode = WAL');
    return db;
}

const createAccount = (db: any, address: string, privateKey: string, platform: string, userId: string) => {
        try{
            const stmt = db.prepare('INSERT INTO accounts (address, private_key, platform, user_id) VALUES (?, ?, ?, ?);');
            stmt.run(address, privateKey, platform, userId);
        } catch(err){
            console.log("db error: createAccount");
            console.log(err);
        }
}

const questionAnswered = (db: any, questionId: string) => {
    try{
        const stmt = db.prepare('SELECT COUNT(*) as total FROM reports WHERE question_id = ? AND bond_paid > 0;');
        const result = stmt.get(questionId);
        return result.total > 0;
    } catch(err) {
        console.log("db error: quesitonAnswered");
        console.log(err);
    }
}

const setAccount = (db: any, platform: string, groupId: string, address: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, address) 
                VALUES (?, ?, ?) 
                ON CONFLICT(platform, group_id) DO UPDATE SET 
                address=$address;`);
        const info = stmt.run(platform, groupId, address);
    } catch(err){
        console.log("db error: setAccount");
        console.log(err);
    }
}

const setPermissions = (db: any, platform: string, groupId: string, permission: boolean) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id, permission) 
            VALUES (?, ?, ?) 
            ON CONFLICT(platform, group_id) DO UPDATE SET 
            permission=?;`);
        const info = stmt.run(platform, groupId, Number(permission), Number(permission));
    } catch(err) {
        console.log("db error: setPermissions");
        console.log(err);
    }
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

const getPermissions = (db:any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT permission FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.permission || '';
    } catch(err){
        console.log("db error: getPermissions");
        console.log(err);
    }
}

const getLang = (db:any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT lang FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId)?.lang || '';
    } catch(err){
        console.log("db error: getLang");
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

const getRule = (db:any, platform: string, groupId: string, timestamp: number) => {
    try{
        const stmt = db.prepare(`SELECT rules
        FROM rules 
        WHERE platform = ? and group_id = ? and timestamp < ?
        ORDER BY timestamp DESC;`);
        return stmt.get(platform, groupId,timestamp)?.rules || '';
    } catch(err){
        console.log("db error: getRule");
        console.log(err);
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
    active: boolean,
    msgBackup: string,
    evidenceIndex: number,
    bond_paid: number,
    msgTimestamp: number
    ) => {
        try{
            const stmt = db.prepare(
                `INSERT INTO reports (question_id, 
                    platform, 
                    group_id, 
                    user_id, 
                    username,
                    msg_id, 
                    timestamp, 
                    active_timestamp, 
                    active, 
                    timeServed, 
                    finalized,
                    arbitrationRequested,
                    msgBackup,
                    evidenceIndex,
                    bond_paid) 
                    VALUES (?, 
                        ?, 
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
                msgTimestamp,
                active? Number(Math.floor(Date.now()/1000)): 0,
                0,
                Number(active),
                msgBackup,
                evidenceIndex,
                bond_paid);
        } catch(err) {
            console.log("db error: addReport");
            console.log(err);
        }

}

const getReportRequest = (db: any, platform: string, groupId: string, msgId: string) => {
    try{
        const stmt = db.prepare('SELECT * FROM reportRequests WHERE platform = ? AND group_id = ? AND msg_id = ?;');
        return stmt.get(platform, groupId,msgId);
    } catch(err){
        console.log("db error: getReportRequest");
        console.log(err);
    }
}

const addReportRequest = (
    db: any,
    platform: string, 
    groupId: string, 
    userId: string, 
    username: string, 
    msgId: string,
    msgBackup: string,
    msgRequestId: string
    ) => {
        try{
            const stmt = db.prepare(
                `INSERT INTO reportRequests ( 
                    platform, 
                    group_id, 
                    user_id, 
                    username,
                    msg_id, 
                    confirmations,
                    confirmed,
                    msgBackup,
                    msgRequestId) 
                    VALUES ($platform, 
                        ?, 
                        ?, 
                        ?,
                        ?, 
                        1,
                        0,
                        ?,
                        ?);`);
            const info = stmt.run(
                platform,
                groupId,
                userId,
                username,
                msgId,
                msgBackup,
                msgRequestId
            );
        } catch(err) {
            console.log("db error: addReportRequest");
            console.log(err);
        }
}

const setReport = (db: any, questionId: string, active: boolean, finalized: boolean, activeTimestamp: number, timeServed: number, bond_paid: number) => {
    try{
        const stmt = db.prepare(
            'UPDATE reports SET active = ?, finalized = ?, active_timestamp = ?, timeServed = ?, bond_paid = ? WHERE question_id = ?',
            );
        const info = stmt.run(Number(active), finalized, activeTimestamp, timeServed, bond_paid, questionId);
    } catch(err) {
        console.log("db error: setReport");
        console.log(err);
    }
}

const setReportArbitration = (db: any, questionId: string, timeServed: number) => {
    try{
        const stmt = db.prepare(
            `UPDATE reports SET 
            arbitrationRequested = 1, timeServed = ?, active = 0
            WHERE question_id = ?`,
            );
        const info = stmt.run(timeServed, questionId);
    } catch(err) {
        console.log("db error: setReportArbitration");
        console.log(err);
    }
}

const getDisputedReports = (db: any) => {
    try{
        const stmt = db.prepare('SELECT * FROM reports WHERE finalized = 0;');
        return stmt.all();
    } catch(err){
        console.log("db error: getDisputedReports");
        console.log(err);
    }
}

const getDisputedReportsInfo = (db:any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare('SELECT * FROM reports WHERE finalized = 0 AND group_id = ? AND platform = ? AND bond_paid > 0');
        return stmt.all(groupId, platform);
    } catch(err){
        console.log("db error: getDisputedReports");
        console.log(err);
    }
}

const getDisputedReportsUserInfo = (db:any, platform: string, groupId: string, userId: string) => {
    try{
        const stmt = db.prepare('SELECT * FROM reports WHERE user_id = ? AND group_id = ? AND platform = ?');
        return stmt.all(userId, groupId, platform);
    } catch(err){
        console.log("db error: getDisputedReportsUserInfo");
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

const getQuestionId = (db: any, platform: string, groupId: string, userId: string, msgId: string) => {
    try{
        const stmt = db.prepare(`SELECT question_id FROM reports WHERE platform = ? AND group_id = ? AND user_id = ? AND msg_id = ?`);
        return stmt.get(platform, groupId, userId, msgId)?.question_id || '';
    } catch{
        console.log("db error: getQuestionId");
    }
}

const getAllowance = (db: any, platform: string, groupId: string, userId: string): Promise<{report_allowance: number, evidence_allowance: number, timestamp_refresh: number,  question_id_last: string, timestamp_last_question: number} | undefined> => {
    try{
        const stmt = db.prepare('SELECT report_allowance, evidence_allowance, timestamp_refresh, question_id_last, timestamp_last_question FROM allowance WHERE user_id = ? AND group_id = ? AND platform = ?');
        return stmt.all(userId, groupId, platform);
    } catch{
        console.log("db error: getAllowance");
    }
}

const setAllowanceAsked = (
    db: any,
    questionIdLast: string,
    platform: string, 
    groupId: string, 
    userId: string) => {
        try{
            const stmt = db.prepare('UPDATE allowance SET question_id_last = ?, timestamp_last_question = ? WHERE platform = ? AND group_id = ? AND user_id = ?');
            const info = stmt.run(questionIdLast, Math.floor(Date.now()/1000), platform, groupId, userId);
        } catch {
            console.log("db error: setAllowanceAsked");
        }
}

const setAllowance = async(
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
                VALUES ($platform, $group_id, $user_id, $report_allowance, $evidence_allowance, $timestamp_refresh) 
                ON CONFLICT(platform, group_id, user_id) DO UPDATE SET 
                report_allowance=$report_allowance, evidence_allowance = $evidence_allowance, timestamp_refresh = $timestamp_refresh;`
            );
            const info = stmt.run(platform, groupId, userId, reportAllowance, evidenceAllowance, timeRefresh);
        } catch {
            console.log("db error: setAllowance");
        }
}

const getActiveEvidenceGroupId = (db: any, platform: string, groupId: string, evidenceIndex: number) => {
    try{
        const stmt = db.prepare( `SELECT question_id FROM reports WHERE platform = ? AND group_id = ? AND evidenceIndex = ? AND finalized = 0`);
        return stmt.get(platform, groupId, evidenceIndex);
    } catch(err) {
        console.log("db error: getActiveEvidenceGroupId");
        console.log(err);
    }
}

const getFinalRecord = (db: any, platform: string, groupId: string, userId: string) => {
    try{
        const stmt = db.prepare(
            `SELECT COUNT(*)  as total FROM reports 
            WHERE active = TRUE 
                AND finalized = TRUE 
                AND platform = ? 
                AND group_id = ? 
                AND user_id = ?`
        );
        return stmt.get(platform, groupId, userId)?.total || 0;
    } catch(err) {
        console.log("db error: getFinalRecord");
        console.log(err);
    }
}

const getRecordCount = async(db: any, platform: string, groupId: string) => {
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

const getCurrentRecord = async(db: any, platform: string, groupId: string, userId: string) => {
    try{
        const stmt = db.prepare(  
            `SELECT COUNT(*)  as total FROM reports 
            WHERE active = TRUE 
                AND platform = $platform 
                AND finalized = 0
                AND group_id = $group_id 
                AND user_id = $user_id`
        );
        return stmt.get(platform, groupId, userId)?.total || 0;
    } catch(err) {
        console.log("db error: getRecordCount");
        console.log(err);
    }
}

export {
    getInviteURL,
    getQuestionId,
    setInviteURL,
    setAccount,
    getRecordCount,
    setLang,
    getLang,
    getGroup,
    getActiveEvidenceGroupId,
    createAccount,
    setRules,
    getReportRequest,
    addReportRequest,
    setAllowanceAsked,
    questionAnswered,
    getPermissions,
    getAllowance,
    setAllowance,
    setPermissions,
    getRule,
    addReport,
    setReport,
    getDisputedReports,
    getDisputedReportsUserInfo,
    getDisputedReportsInfo,
    getConcurrentReports,
    getFinalRecord,
    getCurrentRecord,
    setReportArbitration
}
