import * as TelegramBot from "node-telegram-bot-api";
import { groupSettings } from "../../../types";
import {leaveFederation} from "../../db";
import langJson from "../assets/langNew.json";

/*
 * /joinfed
 */
const regexp = /\/leavefed/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: string, msg: any, match: string[]) => {
    try{
        leaveFederation(db, 'telegram', String(msg.chat.id), String(msg.from.id))
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[settings.lang].fed.leave, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}:{})}catch{}})
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};