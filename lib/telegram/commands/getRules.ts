import * as TelegramBot from "node-telegram-bot-api";
import {getRule} from "../../db";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";

/*
 * /getrules
 */
const regexp = /\/getrules/

const callback = async (db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    const rules = await getRule(db, 'telegram', String(msg.chat.id), Math.floor(Date.now()/1000));
    if (rules)
        await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].rules}(${rules}).`,msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id}:{parse_mode: "Markdown"});        
    else
        await bot.sendMessage(msg.chat.id, langJson[settings.lang].noRules, msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id}:{parse_mode: "Markdown"});
}

export {regexp, callback};