import * as TelegramBot from "node-telegram-bot-api";
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

const callback = async (db: any, lang: string, bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    if (user.status === 'creator' || user.status === 'administrator') {
        if (msg.reply_to_message) {
            const enc = new TextEncoder();

            const rulesPath = await ipfsPublish('rules.txt', enc.encode(msg.reply_to_message.text))

            await setRules(db, 'telegram', String(msg.chat.id), 'https://ipfs.kleros.io'+rulesPath, new Date().getTime()/1000);

            await bot.sendMessage(msg.chat.id, langJson[lang].rulesUpdated);
        } else {
            if (validateUrl(match[1])) {
                await setRules(db, 'telegram', String(msg.chat.id), match[1], Math.floor(new Date().getTime()/1000));
                await bot.sendMessage(msg.chat.id, langJson[lang].rulesUpdated);
            } else {
                await bot.sendMessage(msg.chat.id, langJson[lang].errorRules);
            }
        }
    } else {
        await bot.sendMessage(msg.chat.id, langJson[lang].errorAdminOnly);
    }
}

export {regexp, callback, validateUrl};