import * as TelegramBot from "node-telegram-bot-api";
import {getRule} from "../../db";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";

/*
 * /rules
 */
const regexp = /\/rules/

const callback = async (db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    bot.sendMessage(msg.chat.id, `${langJson[settings.lang].rules}(${settings.rules}).`,msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id}:{parse_mode: "Markdown"});        
}

export {regexp, callback};