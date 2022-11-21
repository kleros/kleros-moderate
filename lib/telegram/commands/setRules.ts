import * as TelegramBot from "node-telegram-bot-api";
import { groupSettings } from "../../../types";
import {setRules} from "../../db";
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

const callback = async (db: any, settings: groupSettings, bot: any, botId: string, msg: any, match: string[]) => {
    try{
        const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));
        const chat = await bot.getChat(msg.chat.id);
        if (user.status === 'creator' || user.status === 'administrator') {
            if (msg.reply_to_message && !msg.reply_to_message.forum_topic_created) {
                const enc = new TextEncoder();
                const rulesPath = await ipfsPublish('rules.txt', enc.encode(msg.reply_to_message.text))
                setRules(db, 'telegram', String(msg.chat.id), 'https://ipfs.kleros.io'+rulesPath, new Date().getTime()/1000);
                bot.sendMessage(msg.chat.id, `The community rules are [updated](https://ipfs.kleros.io${rulesPath}).`, msg.chat.is_forum? {message_thread_id: settings.thread_id_rules, parse_mode: 'Markdown'}: {parse_mode: "Markdown"});
                if(msg.chat.is_forum){
                    const msgRules = await bot.forwardMessage(msg.chat.id, msg.chat.id, msg.reply_to_message.message_id, {message_thread_id: settings.thread_id_rules});
                    bot.pinChatMessage(msg.chat.id, msgRules.message_id, {message_thread_id: settings.thread_id_rules})
                }
            } else if (validateUrl(match[1])) {
                setRules(db, 'telegram', String(msg.chat.id), match[1], Math.floor(new Date().getTime()/1000));
                if(msg.chat.is_forum){
                        const msgRules = await bot.forwardMessage(msg.chat.id, msg.chat.id, msg.message_id, {message_thread_id: settings.thread_id_rules});
                        bot.pinChatMessage(msg.chat.id, msgRules.message_id, {message_thread_id: settings.thread_id_rules})
                }
                await bot.sendMessage(msg.chat.id, langJson[settings.lang].rulesUpdated, msg.chat.is_forum? {message_thread_id: settings.thread_id_rules}: {});
            } else {
                await bot.sendMessage(msg.chat.id, langJson[settings.lang].errorRules, msg.chat.is_forum? {message_thread_id: settings.thread_id_rules}: {});
            }
        } else {
            await bot.sendMessage(msg.chat.id, langJson[settings.lang].errorAdminOnly, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {});
        }
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback, validateUrl};