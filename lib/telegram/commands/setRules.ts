import * as TelegramBot from "node-telegram-bot-api";
import { groupSettings } from "../../../types";
import {setRulesCustom} from "../../db";
import {ipfsPublish} from "../../ipfs-publish";
import langJson from "../assets/lang.json";

/*
 * /setrules [ipfs file path]
 */
const regexp = /\/setrules\s?(.+)?/

const validateUrl = (s: string): boolean => {
    try {
        new URL(s);
        return true;
    } catch (err) {
        return false;
    }
};

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: string, msg: any, match: string[]) => {
    try{
        if (msg.reply_to_message && !msg.reply_to_message.forum_topic_created) {
            const enc = new TextEncoder();
            const rulesPath = await ipfsPublish('rules.txt', enc.encode(msg.reply_to_message.text))
            const msg_id = msg.chat.is_forum? msg.is_topic_message? msg.message_thread_id: 1 : ''+msg.reply_to_message.message_id;
            const MsgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + msg_id;

            setRulesCustom(db, 'telegram', String(msg.chat.id), 'https://ipfs.kleros.io'+rulesPath, Math.floor(Date.now()/1000), msg_id);
            queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].rulesUpdated}(https://ipfs.kleros.io${rulesPath}).`, msg.chat.is_forum? {message_thread_id: settings.thread_id_rules, parse_mode: 'Markdown'}: {parse_mode: "Markdown"})}catch{}});
            if(msg.chat.is_forum){
                const msgRules = await queue.add(async () => {try{const val = await bot.forwardMessage(msg.chat.id, msg.chat.id, msg.reply_to_message.message_id, {message_thread_id: settings.thread_id_rules})
                return val}catch{}});
                if(!msgRules)
                return
                queue.add(async () => {try{await bot.pinChatMessage(msg.chat.id, msgRules.message_id, {message_thread_id: settings.thread_id_rules})}catch{}})
            }
        } else if (validateUrl(match[1])) {
            setRulesCustom(db, 'telegram', String(msg.chat.id), match[1], Math.floor(new Date().getTime()/1000), null);
            if(msg.chat.is_forum){
                    const msgRules = await queue.add(async () => {try{const val = await bot.forwardMessage(msg.chat.id, msg.chat.id, msg.message_id, {message_thread_id: settings.thread_id_rules})
                    return val}catch{}});
                    if(!msgRules)
                    return
                    await queue.add(async () => {try{await bot.reopenForumTopic(msg.chat.id, msgRules.message_id)}catch{}})
                    await queue.add(async () => {try{await bot.pinChatMessage(msg.chat.id, msgRules.message_id, {message_thread_id: settings.thread_id_rules})}catch{}})
                    await queue.add(async () => {try{await bot.closeForumTopic(msg.chat.id, settings.thread_id_rules)}catch{}})
            }
            queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].rulesUpdated}(${match[1]})`, msg.chat.is_forum? {message_thread_id: settings.thread_id_rules, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'})}catch{}});
        } else {
            queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[settings.lang].error.url, msg.chat.is_forum? {message_thread_id: settings.thread_id_rules}: {})}catch{}});
        }
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback, validateUrl};