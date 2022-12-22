import * as TelegramBot from "node-telegram-bot-api";
import {getRule, getInviteURLChannel, getFederatedInviteURLChannel, getChannelID} from "../../db";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;
var myQueue;
myCache.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });

/*
 * /notifications
 */
const regexp = /\/notifications/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    if (!myBot)
        myBot = bot
    if (!myQueue)
        myQueue = queue
    const channel_invite = getInviteURLChannel(db, 'telegram', String(msg.chat.id));
    if(settings.federation_id || settings.federation_id_following){
        const inviteurl = getFederatedInviteURLChannel(db, 'telegram', settings.federation_id);
        const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `The notifications for this group's federation are sent to this [channel](${inviteurl}).`,msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id}:{parse_mode: "Markdown"})
        return val}catch{}});     
        if(!resp)
        return
        myCache.set(resp.message_id, msg.chat.id)  
    }
    if(!channel_invite && !msg.chat.is_forum){
        const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `Notifications channel for this group is not set. Ask an admin to \`/setchannel\`.`,msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id}:{parse_mode: "Markdown"})
        return val}catch{}});     
        if(!resp)
        return
        myCache.set(resp.message_id, msg.chat.id)   
    } else {
        const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `I notify this [channel](${channel_invite}) about moderation activity.`,msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id, disable_web_page_preview: true}:{parse_mode: "Markdown", disable_web_page_preview: true})
        return val}catch{}});     
        if(!resp)
        return
        myCache.set(resp.message_id, msg.chat.id)
    }
}

export {regexp, callback};