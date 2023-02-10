import * as TelegramBot from "node-telegram-bot-api";
import langJson from "../assets/langNew.json";
import {groupSettings} from "../../../types";
import {getMultilangGroup, getRule} from "../../db"

const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;
var myQueue;

myCache.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });

const callback = async (db: any, queue: any, bot: any, settings: groupSettings, msg: any) => {
    if (!myBot)
        myBot = bot
    if (!myQueue)
        myQueue = queue

    if(!msg.new_chat_member)
        return
    console.log('WELCOME!')
    const lang_code = msg?.from?.language_code
    let msg_greeting = ''
    if (true || lang_code !== settings.lang && (lang_code === 'en' || lang_code === 'es')){
        const invite_url = getMultilangGroup(db, 'telegram',String(msg.chat.id), 'en')
        if (invite_url)
            msg_greeting = '\n\n'+langJson[settings.lang].greeting.multilang+'('+invite_url+').\n\n'
    }
    try{
        const opts = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                [
                    {
                    text: langJson[settings.lang].greeting.captcha,
                    callback_data: '5|'+String(msg.new_chat_member?.id)
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
                        text: langJson[settings.lang].greeting.captcha,
                        callback_data: '5|'+String(msg.new_chat_member?.id)
                    }
                ]
                ]
            }
        };
        const ruleObj = getRule(db,'telegram', String(msg.chat.id),Math.floor(Date.now()/1000))
        const MsgLink = ruleObj? 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + ruleObj.msg_id : '';  
        const new_member_name = (msg.new_chat_member?.username || msg.new_chat_member?.first_name || `no-username-set`);
        const msg_greeting_full = `${langJson[settings.lang].greeting.greeting0} [${new_member_name}](tg://user?id=${msg.new_chat_member?.id}). ${msg_greeting}${langJson[settings.lang].greeting.greeting1}(${MsgLink}) ([backup](${settings.rules})). ${langJson[settings.lang].greeting.greeting2}`
        console.log('full')
        let msg_welcome;


        if(settings.captcha){
            const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false};
            queue.add(async () => {try{await bot.restrictChatMember(msg.chat.id, msg.new_chat_member?.id, options)}catch (e){console.log(e)}});  
            msg_welcome = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, msg_greeting_full, msg.chat.is_forum? optsThread: opts)
            return val}catch(e){console.log(e)}});
        } else if (settings.greeting_mode){
            msg_welcome = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, msg_greeting_full, msg.chat.is_forum? {message_thread_id: settings.thread_id_welcome,disable_web_page_preview: true}: {disable_web_page_preview: true})
            return val}catch(e){console.log(e)}});
        }
        if(!msg_welcome)
            return
        myCache.set(msg_welcome.message_id, msg.chat.id)
    } catch(e){
        console.log(e)
    }
}

export {callback};