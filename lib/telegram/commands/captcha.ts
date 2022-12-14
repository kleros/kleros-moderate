import * as TelegramBot from "node-telegram-bot-api";
import langJson from "../assets/lang.json";
import {groupSettings} from "../../../types";

const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;

myCache.on("expired",function(key,value){
    myBot.deleteMessage(value, key);
    });

const callback = async (bot: any, settings: groupSettings, msg: any) => {
    myBot = bot
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
            reply_to_message_id: msg.reply_to_message.message_id,
            message_thread_id: msg.message_thread_id,
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
        const msg_welcome = bot.sendMessage(msg.chat.id, `Welcome [${msg.from.first_name}](tg://user?id=${msg.from.id}) ${langJson[settings.lang].greeting2}(${settings.rules}). ${langJson[settings.lang].greeting3}`, msg.chat.is_forum? optsThread: opts);
        myCache.set(msg_welcome.message_id, msg.chat.id)
    } catch(e){
        console.log(e)
    }
}

export {callback};