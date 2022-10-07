import * as TelegramBot from "node-telegram-bot-api";
import {getRule} from "../../db";
import langJson from "../assets/lang.json";

/*
 * /getrules
 */
const regexp = /\/getrules/

const callback = async (db: any, lang: string, bot: TelegramBot, msg: TelegramBot.Message) => {
    const rules = await getRule(db, 'telegram', String(msg.chat.id), Math.floor(Date.now()/1000));
    if (rules)
        await bot.sendMessage(msg.chat.id, `${langJson[lang].rules}(${rules}).`,{parse_mode: "Markdown"});        
    else
        await bot.sendMessage(msg.chat.id, langJson[lang].noRules);        
}

export {regexp, callback};