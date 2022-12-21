import * as TelegramBot from "node-telegram-bot-api";
import { groupSettings } from "../../../types";
import {setFederation,getFederationName} from "../../db";
import langJson from "../assets/lang.json";
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
const regexp = /\/newfed\s?(.+)?/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: string, msg: any, match: string[]) => {
    try{
        if (!myBot)
            myBot = bot
        if (!myQueue)
            myQueue = queue
        if (msg.chat.type !== "private"){
            const opts = msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                    [
                        {
                            text: 'Create your federation',
                            url: `https://t.me/${process.env.BOT_USERNAME}?start=newfed`
                        }
                    ]
                    ]
                }
            }: {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                    [
                        {
                            text: 'Create your federation',
                            url: `https://t.me/${process.env.BOT_USERNAME}?start=newfed`
                        }
                    ]
                    ]
                }
            }
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `DM me for help with your federation : )`, opts)
            return val}catch{}}); 
            myCache.set(resp.message_id, msg.chat.id)       
            return;
        }
        const name = getFederationName(db, 'telegram',String(msg.from.id));
        console.log(name)
        if (name){
            queue.add(async () => {try{await bot.sendMessage(settings.channelID, `Your federation *${name}* with id \`${msg.from.id}\` already exists.`,msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown'}:{parse_mode: 'Markdown'})}catch{}});
            return
        }
        if (!match[1]){
            queue.add(async () => {try{await bot.sendMessage(settings.channelID, `Please name your federation eg: \`/newfed My New Federation\``,msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown'}:{parse_mode: 'Markdown'})}catch{}});
            return
        } else{
            const name = match[1].substring(0,65)
            setFederation(db, 'telegram',name, String(msg.from.id))
            queue.add(async () => {try{await bot.sendMessage(settings.channelID, `Your new federation is called *${match[1].substring(0,65)}* with id ${msg.from.id}. You can add groups to your federation by sending \`/joinfed ${msg.from.id}\` in each group.\n\nIt is highly reccomended to create a notification channel for your federation with \`/setfedchannel\` so moderation can easily be monitored throughout the federation in one place.`,msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown'}:{parse_mode: 'Markdown'})}catch{}});
        }
        //joinFederation(db, 'telegram', String(msg.chat.id), String(msg.from.id))
        //bot.sendMessage(msg.chat.id, 'Your group has joined the federation.', msg.chat.is_forum? {message_thread_id: msg.message_thread_id}:{})
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};