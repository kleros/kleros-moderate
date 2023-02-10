import * as TelegramBot from "node-telegram-bot-api";
import {setForgiveness} from "../../db";
import { groupSettings } from "../../../types";
import langJson from "../assets/langNew.json";

/*
 * /report
 */
const regexp = /^\/forgive\s?(.+)?/
const NodeCache = require( "node-cache" );
const myCacheGarbageCollection = new NodeCache( { stdTTL: 90, checkperiod: 120 } );

var myBot;
var myQueue;

myCacheGarbageCollection.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });
const callback = async (queue: any, db:any, settings: groupSettings, bot: any, botId: number, msg: any, match: string[]) => {
    try{        
        if (!myBot)
            myBot = bot
        if (!myQueue)
            myQueue = queue
        if (!msg.reply_to_message) {
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, langJson[settings.lang].error.reply, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
                return val}catch{}});
            if (!resp)
                return
            myCacheGarbageCollection.set(resp.message_id, msg.chat.id)
            return;
        }
        const channelUserSusie = await queue.add(async () => {try{const val = await bot.getChatMember(msg.chat.id, botId)
            return val}catch(e){console.log(e)}});
        if(!channelUserSusie)
            return

        const forgivenUser = String(msg.reply_to_message.from.id);
        const currentTimeMs = Math.floor(Date.now()/1000);
        setForgiveness(db, 'telegram', String(msg.chat.id), forgivenUser,currentTimeMs)
        const permissions = await queue.add(async () => {try{const val = (await bot.getChat(msg.chat.id)).permissions
            return val}catch (e){console.log(e)}})
        console.log(permissions)
        if(!permissions)
            return
        queue.add(async () => {try{await bot.restrictChatMember(msg.chat.id, msg.reply_to_message.from.id, permissions)}catch{}});
        queue.add(async () => {try{await bot.unbanChatMember(msg.chat.id, msg.reply_to_message.from.id, {only_if_banned: true})}catch (e){console.log(e)}});
        queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, langJson[settings.lang].forgive, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
                return val}catch{}});
    } catch(e){
        console.log(e)       
    }
}

export {regexp, callback};