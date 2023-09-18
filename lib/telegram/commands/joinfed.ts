import * as TelegramBot from "node-telegram-bot-api";
import { groupSettings } from "../../../types";
import {joinFederation,followFederation,getFederationName} from "../../db";
import langJson from "../assets/langNew.json";
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;
var myQueue;

myCache.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });

/*
 * /joinfed
 */
const regexp = /\/joinfed\s?(.+)?/

const callback = async (queue: any, db: any, settings: groupSettings, bot: TelegramBot, botId: string, msg: any, match: string[]) => {
    try{
        if (!myBot)
            myBot = bot
        if (!myQueue)
            myQueue = queue
        if (!match[1]){
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(settings.channelID, langJson[settings.lang].fed.specify,msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown'}:{parse_mode: 'Markdown'})
            return val}catch{}});
            if (!resp)
                return resp
            myCache.set(resp.message_id, msg.chat.id)
        } else{
            const name = getFederationName(db, 'telegram',match[1])
            if (!name){
                const resp = await queue.add(async () => {try{const val = await bot.sendMessage(settings.channelID, langJson[settings.lang].fed.notfound,msg.chat.is_forum? {
                    message_thread_id: msg.message_thread_id,
                    parse_mode: 'Markdown'}:{parse_mode: 'Markdown'})
                    return val}catch{}});
                    if (!resp)
                    return resp
                myCache.set(resp.message_id, msg.chat.id)
                }
            else if (msg.from.id == match[1]){
                queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].fed.joined} *${name}*.`,msg.chat.is_forum? {message_thread_id: msg.message_thread_id,parse_mode: 'Markdown'}:{parse_mode: 'Markdown'})}catch{}});
                joinFederation(db, 'telegram', String(msg.chat.id), match[1])
            }
            else{
                queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].fed.following} *${name}*.`,msg.chat.is_forum? {message_thread_id: msg.message_thread_id,parse_mode: 'Markdown'}:{parse_mode: 'Markdown'})}catch{}});
                followFederation(db, 'telegram', String(msg.chat.id), match[1])
            }
        }
    } catch(e){
    console.log(e)
    }
}

export {regexp, callback};