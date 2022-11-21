const Database = require('better-sqlite3');
import { groupSettings } from "../types";

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

const dbstart = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id) 
            VALUES (?, ?);`);
        const info = stmt.run(platform, groupId);
    } catch(err) {
        console.log("db error: set dbstart");
        console.log(err);
    }
}

const dbstarted = (db: any, platform: string, groupId: string) => {
    try{
        const stmt = db.prepare(
            `INSERT INTO groups (platform, group_id) 
            VALUES (?, ?);`);
        const info = stmt.run(platform, groupId);
    } catch(err) {
        console.log("db error: set dbstarted");
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

const getGroupSettings = (db: any, platform: string, groupId: string): groupSettings => {
    try{
        const stmt = db.prepare('SELECT * FROM groups WHERE platform = ? AND group_id = ?');
        return stmt.get(platform, groupId);
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

export {
    getInviteURL,
    setInviteURL,
    getInviteURLChannel,
    setInviteURLChannel,
    getThreadIDWelcome,
    getGroupSettings,
    setThreadIDWelcome,
    setChannelID,
    getChannelID,
    dbstart,
    dbstarted,
    getGreetingMode,
    eraseThreadID,
    setGreetingMode,
    setLang,
    getLang,
    setRules,
    setThreadID,
    getThreadIDNotifications,
    getThreadIDRules,
    getRule
}
