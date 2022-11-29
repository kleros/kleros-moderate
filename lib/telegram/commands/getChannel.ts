import * as TelegramBot from "node-telegram-bot-api";
import {getRule, getInviteURLChannel} from "../../db";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";

/*
 * /getrules
 */
const regexp = /\/getchannel/

const callback = async (db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    const channel_invite = getInviteURLChannel(db, 'telegram', msg.chat.id);
    bot.sendMessage(msg.chat.id, `I notify this [channel](${channel_invite}) about moderation activity.`,msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id}:{parse_mode: "Markdown"});        
}

export {regexp, callback};