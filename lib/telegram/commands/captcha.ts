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
        if (!msg.new_chat_participant?.id)
            return;
        const opts = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                [
                    {
                    text: 'I agree to follow the rules.',
                    callback_data: '5|'+String(msg.new_chat_participant?.id)
                }
                ]
                ]
            }
        };
        const optsThread = {
            parse_mode: 'Markdown',
            reply_to_message_id: msg.reply_to_message.message_id,
            message_thread_id: msg.message_thread_id,
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                [
                    {
                        text: 'I agree to follow the rules.',
                        callback_data: '5|'+String(msg.new_chat_participant?.id)
                    }
                ]
                ]
            }
        };
        const msg_welcome = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `Welcome [${msg.from.first_name}](tg://user?id=${msg.new_chat_participant?.id}) ${langJson[settings.lang].greeting2}(${settings.rules}). ${langJson[settings.lang].greeting3}`, msg.chat.is_forum? optsThread: opts)
        return val}catch{}});
        if(!msg_welcome)
        return
        myCache.set(msg_welcome.message_id, msg.chat.id)
    } catch(e){
        console.log(e)
    }
}

export {callback};