import * as TelegramBot from "node-telegram-bot-api";
import {setLang, setRules} from "../../db";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";
/*
 * /setlanguage ?
 */
const regexp = /\/setlanguage/
const regexpFull = /\/setlanguage (.+)/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    const match = msg.text.match(regexpFull);
    const langCode = match? match[1].toLowerCase(): '';

    if (langJson[langCode]) {
        setLanguageConfirm(queue, db, bot, settings, langCode, msg)
    } else {
        const errorLanguage = `The language you requested is not yet available. Head to @KlerosModerateNews or @linguoKleros for information on how to add more translations!`
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, errorLanguage, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})}catch{}})
        const opts = msg.chat.is_forum? {
            message_thread_id: msg.message_thread_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                [
                    {
                        text: 'English',
                        callback_data: `0|${msg.from.id}`+'|'+`en`
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
                        text: 'English',
                        callback_data: `0|${msg.from.id}`+'|'+`en`
                    }
                ]
                ]
            }
        }
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id,'List of available languages',opts)}catch{}})
    }
}

const setLanguageConfirm = async (queue: any, db: any, bot: any, settings: groupSettings, langCode: string, msg: any) => {
    try{
        queue.add(async () => {try{await bot.deleteMessage(msg.chat.id, String(msg.message_id))}catch{}})
        setLang(db, 'telegram', String(msg.chat.id),langCode);
        setRules(db, 'telegram', String(msg.chat.id), langJson[langCode].defaultRules, Math.floor(Date.now()/1000));
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[langCode].confirmationLanguage, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})}catch{}});
        if (msg.chat.is_forum){
            const msgDefaultRules = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `${langJson[langCode].defaultRulesMsg1}(${langJson[langCode].defaultRules}). ${langJson[langCode].defaultRulesMsg2}.`, msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: settings.thread_id_rules}: {})
            return val}catch{}})
            const msgRules = await queue.add(async () => {try{const val = await bot.forwardMessage(msg.chat.id, msg.chat.id, msgDefaultRules.message_id, {message_thread_id: settings.thread_id_rules})
            return val}catch{}});
            queue.add(async () => {try{await bot.pinChatMessage(msg.chat.id, msgRules.message_id, {message_thread_id: settings.thread_id_rules})}catch{}})
        }
    } catch(e){
        console.log('setLanguageConfirm error '+e);
    }
}

export {regexp, callback, setLanguageConfirm};