import * as TelegramBot from "node-telegram-bot-api";
import {getRule} from "../../db";
import langJson from "../assets/langNew.json";
import { groupSettings } from "../../../types";
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;
var myQueue;
myCache.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });

/*
 * /rules
 */
const regexp = /^\/rules/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    if (!myBot)
        myBot = bot
    if (!myQueue)
        myQueue = queue
    const ruleObj = getRule(db,'telegram', String(msg.chat.id),Math.floor(Date.now()/1000))
    var msgresponse;
    if (ruleObj?.msg_id){
        const MsgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + ruleObj.msg_id;
        console.log(MsgLink)
        msgresponse = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].rules}(${MsgLink}) ([backup](${settings.rules})).`,msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id, disable_web_page_preview: false}:{parse_mode: "Markdown", disable_web_page_preview: false})
        return val}catch{}}); 
        if(!msgresponse)
            return;
    } else {
        console.log(msg)
        msgresponse = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].rules}(${settings.rules}).`,msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id, disable_web_page_preview: false}:{parse_mode: "Markdown", disable_web_page_preview: false})
        return val}catch{}}); 
        if(!msgresponse)
            return;
    }
    myCache.set(msgresponse.message_id, msg.chat.id)
}

export {regexp, callback};