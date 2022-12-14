import * as TelegramBot from "node-telegram-bot-api";
import {getRule, getInviteURLChannel, getChannelID} from "../../db";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;

myCache.on("expired",function(key,value){
    myBot.deleteMessage(value, key);
    });

/*
 * /notifications
 */
const regexp = /\/notifications/

const callback = async (db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    myBot = bot;
    const channel_invite = getInviteURLChannel(db, 'telegram', String(msg.chat.id));
    if(!channel_invite){
        const resp = await bot.sendMessage(msg.chat.id, `Notifications channel not set. Ask an admin to /setchannel.`,msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id}:{parse_mode: "Markdown"});     
        myCache.set(resp.message_id, msg.chat.id)   
    } else {
        const resp = await bot.sendMessage(msg.chat.id, `I notify this [channel](${channel_invite}) about moderation activity.`,msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id}:{parse_mode: "Markdown"});     
        myCache.set(resp.message_id, msg.chat.id)
    }
}

export {regexp, callback};