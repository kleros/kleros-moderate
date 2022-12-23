import * as TelegramBot from "node-telegram-bot-api";
import langJson from "../assets/lang.json";
import {groupSettings} from "../../../types";

const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;
var myQueue;

myCache.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });

const callback = async (queue: any, bot: any, settings: groupSettings, msg: any) => {
    if (!myBot)
        myBot = bot
    if (!myQueue)
        myQueue = queue
    try{
        const opts = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                [
                    {
                    text: 'I agree to follow the rules.',
                    callback_data: '5|'+String(msg.from.id)
                    }
                ]
                ]
            }
        };
        const optsThread = {
            parse_mode: 'Markdown',
            message_thread_id: settings.thread_id_welcome,
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                [
                    {
                        text: 'I agree to follow the rules.',
                        callback_data: '5|'+String(msg.from.id)
                    }
                ]
                ]
            }
        };
        let msg_welcome;
        if(settings.captcha){
            const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false};
            queue.add(async () => {try{await bot.restrictChatMember(msg.chat.id, msg.from.id, options)}catch{}});
            msg_welcome = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `Hi 👋 Welcome [${msg.from.first_name}](tg://user?id=${msg.from.id}). ${langJson[settings.lang].greeting2}(${settings.rules}).`, msg.chat.is_forum? optsThread: opts)
            return val}catch{}});
        } else if (settings.greeting_mode){
            msg_welcome = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `Hi 👋 Welcome [${msg.from.first_name}](tg://user?id=${msg.from.id}). ${langJson[settings.lang].greeting2}(${settings.rules}).`, msg.chat.is_forum? {message_thread_id: settings.thread_id_welcome,disable_web_page_preview: true}: {disable_web_page_preview: true})
            return val}catch{}});
        }
        if(!msg_welcome)
            return
        myCache.set(msg_welcome.message_id, msg.chat.id)
    } catch(e){
        console.log(e)
    }
}

export {callback};