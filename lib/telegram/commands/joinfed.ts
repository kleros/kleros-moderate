import * as TelegramBot from "node-telegram-bot-api";
import { groupSettings } from "../../../types";
import {joinFederation} from "../../db";
import langJson from "../assets/lang.json";

/*
 * /joinfed
 */
const regexp = /\/joinfed/

const callback = async (db: any, settings: groupSettings, bot: any, botId: string, msg: any, match: string[]) => {
    try{
        joinFederation(db, 'telegram', String(msg.chat.id), String(msg.from.id))
        bot.sendMessage(msg.chat.id, 'Your group has joined the federation.', msg.chat.is_forum? {message_thread_id: msg.message_thread_id}:{})
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};