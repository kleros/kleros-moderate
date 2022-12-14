import * as TelegramBot from "node-telegram-bot-api";
import {setAdminReportableMode} from "../../db";
import langJson from "../assets/lang.json";
import {groupSettings} from "../../../types";

/*
 * /welcome
 */
const regexp = /\/adminreportable/

const callback = async (db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        setAdminReportableMode(db, 'telegram', String(msg.chat.id),settings.admin_reportable? 0: 1)
        bot.sendMessage(msg.chat.id, settings.admin_reportable? "Admins are immune from reports." : "Admins are now held accountable like regular users.", msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {});
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};