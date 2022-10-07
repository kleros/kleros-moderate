import * as TelegramBot from "node-telegram-bot-api";
import {setLang, setRules} from "../../db";
import langJson from "../assets/lang.json";

/*
 * /setlanguage ?
 */
const regexp = /\/setlanguage/
const regexpFull = /\/setlanguage (.+)/

const callback = async (db: any, lang: string, bot: TelegramBot, msg: TelegramBot.Message) => {
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));
    const match = msg.text.match(regexpFull);

    if (!match || match.length < 2){
        await bot.sendMessage(msg.chat.id, langJson[lang].errorMatchLanguage);
        return;
    }

    const langCode = match[1].toLowerCase();

    if (user.status === 'creator' || user.status === 'administrator') {
        if (langJson[langCode]) {
            await bot.sendMessage(msg.chat.id, langJson[langCode].confirmationLanguage);
            setLang(db, 'telegram', String(msg.chat.id),langCode);
            await setRules(db, 'telegram', String(msg.chat.id), langJson[lang].defaultRules, Math.floor(Date.now()/1000));
            await bot.sendMessage(msg.chat.id, `${langJson[lang].defaultRulesMsg1}(${langJson[lang].defaultRules}). ${langJson[lang].defaultRulesMsg2}.`, {parse_mode: "Markdown"});

        } else {
            await bot.sendMessage(msg.chat.id, `${langCode} `+ langJson[lang].errorLanguage);
        }
    } else {
        await bot.sendMessage(msg.chat.id, langJson[lang].errorAdminOnly);
    }
}

export {regexp, callback};