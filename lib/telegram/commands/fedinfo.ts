import * as TelegramBot from "node-telegram-bot-api";
import { groupSettings } from "../../../types";
import {getFederationName,getGroupFederation,getGroupFederationFollowing} from "../../db";
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
const regexp = /\/fedinfo\s?(.+)?/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: string, msg: any, match: string[]) => {
    try{
        if (!myBot)
            myBot = bot
        if (!myQueue)
            myQueue = queue
        // TODO private fed info
        const fed_id = getGroupFederation(db, 'telegram',String(msg.chat.id));
        const fed_id_following = getGroupFederationFollowing(db, 'telegram',String(msg.chat.id));
        let resp;
        if (fed_id || fed_id_following){
            const name = getFederationName(db, 'telegram', fed_id ?? fed_id_following);
            if (settings.lang === 'en')
                resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `This group is ${fed_id? 'in': 'following'} the *${name}* federation with id \`${fed_id ?? fed_id_following}\``,  msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown'} : {parse_mode: 'Markdown'})
                return val}catch{}})
            else if (settings.lang === 'es')
                resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `Este grupo ${fed_id? 'está en la': 'sigue a la '} federación *${name}* con id \`${fed_id ?? fed_id_following}\``,  msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown'} : {parse_mode: 'Markdown'})
                return val}catch{}})
            if(!resp)
            return
        } else
            resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, langJson[settings.lang].fed.nofed, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown'} : {parse_mode: 'Markdown'})
            return val}catch{}});
            if(!resp)
            return
        myCache.set(resp.message_id,msg.chat.id)
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};