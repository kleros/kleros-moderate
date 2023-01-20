import * as TelegramBot from "node-telegram-bot-api";
import {setLang, setRules} from "../../db";
import langJson from "../assets/langNew.json";
import { groupSettings } from "../../../types";
/*
 * /setlanguage ?
 */
const regexp = /\/lang/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
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
                ],
                [
                    {
                        text: 'Español',
                        callback_data: `0|${msg.from.id}`+'|'+`es`
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
                ],
                [
                    {
                        text: 'Español',
                        callback_data: `0|${msg.from.id}`+'|'+`es`
                    }
                ]
            ]
        }
    }
    queue.add(async () => {try{await bot.sendMessage(msg.chat.id,langJson[settings.lang].lang.select,opts)}catch{}})
}

const setLanguageConfirm = async (queue: any, db: any, bot: any, settings: groupSettings, langCode: string, msg: any) => {
    try{
        queue.add(async () => {try{await bot.deleteMessage(msg.chat.id, String(msg.message_id))}catch{}})
        if (settings.lang == langCode)
            return;
        setLang(db, 'telegram', String(msg.chat.id),langCode);
        setRules(db, 'telegram', String(msg.chat.id), langJson[langCode].defaultRules, Math.floor(Date.now()/1000));
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[settings.lang].lang.confirm, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})}catch{}});
        const msgDefaultRules = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `${langJson[langCode].lang.rules}(${langJson[langCode].defaultRules}). ${langJson[langCode].lang.setrules}.`, msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: settings.thread_id_rules}: {parse_mode: "Markdown"})
        return val}catch{}});
        if (msg.chat.is_forum){
            if(!msgDefaultRules)
                return
            const msgRules = await queue.add(async () => {try{const val = await bot.forwardMessage(msg.chat.id, msg.chat.id, msgDefaultRules.message_id, {message_thread_id: settings.thread_id_rules})
            return val}catch{}});
            if(!msgRules)
                return
            queue.add(async () => {try{await bot.pinChatMessage(msg.chat.id, msgRules.message_id, {message_thread_id: settings.thread_id_rules})}catch{}})
        }
    } catch(e){
        console.log('setLanguageConfirm error '+e);
    }
}

export {regexp, callback, setLanguageConfirm};