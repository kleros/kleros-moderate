import * as TelegramBot from "node-telegram-bot-api";
import {setLang, setRules} from "../../db";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";
/*
 * /setlanguage ?
 */
const regexp = /\/setlanguage/
const regexpFull = /\/setlanguage (.+)/

const callback = async (db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    const match = msg.text.match(regexpFull);
    const langCode = match? match[1].toLowerCase(): '';

    if (langJson[langCode]) {
        setLanguageConfirm(db, bot, settings, langCode, msg)
    } else {
        const errorLanguage = `The language you requested is not yet available. Head to @SusieSupportChannel or linguo for information on how to add more translations!`
        await bot.sendMessage(msg.chat.id, errorLanguage, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
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
        await bot.sendMessage(msg.chat.id,'List of available languages',opts)
    }
}

const setLanguageConfirm = async (db: any, bot: any, settings: groupSettings, langCode: string, msg: any) => {
    setLang(db, 'telegram', String(msg.chat.id),langCode);
    setRules(db, 'telegram', String(msg.chat.id), langJson[langCode].defaultRules, Math.floor(Date.now()/1000));
    bot.sendMessage(msg.chat.id, langJson[langCode].confirmationLanguage, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {});
    const msgDefaultRules = await bot.sendMessage(msg.chat.id, `${langJson[langCode].defaultRulesMsg1}(${langJson[langCode].defaultRules}). ${langJson[settings.lang].defaultRulesMsg2}.`, msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: settings.thread_id_rules}: {})
    const msgRules = await bot.forwardMessage(msg.chat.id, msg.chat.id, msgDefaultRules.message_id, {message_thread_id: settings.thread_id_rules});
    bot.pinChatMessage(msg.chat.id, msgRules.message_id, {message_thread_id: settings.thread_id_rules})
}

export {regexp, callback, setLanguageConfirm};