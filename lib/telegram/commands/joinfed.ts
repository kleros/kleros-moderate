import * as TelegramBot from "node-telegram-bot-api";
import { groupSettings } from "../../../types";
import {joinFederation,followFederation,getFederationName} from "../../db";
import langJson from "../assets/lang.json";

/*
 * /joinfed
 */
const regexp = /\/joinfed\s?(.+)?/

const callback = async (db: any, settings: groupSettings, bot: any, botId: string, msg: any, match: string[]) => {
    try{
        if (!match[1]){
            bot.sendMessage(settings.channelID, `Please specify a federation eg. \`/joinfed <federation_id>\`.`,msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown'}:{parse_mode: 'Markdown'});
        } else{
            const name = getFederationName(db, 'telegram',match[1].substring(0,65))
            if (!name)
                bot.sendMessage(settings.channelID, `Federation not found. The federation id of any group can be found by sending \`/fedinfo\` in a group.`,msg.chat.is_forum? {
                    message_thread_id: msg.message_thread_id,
                    parse_mode: 'Markdown'}:{parse_mode: 'Markdown'});
            if (msg.from.id === match[1])
                joinFederation(db, 'telegram', String(msg.chat.id), match[1].substring(0,65))
            else
                followFederation(db, 'telegram', String(msg.chat.id), match[1].substring(0,65))
        }
    } catch(e){
    console.log(e)
    }
}

export {regexp, callback};