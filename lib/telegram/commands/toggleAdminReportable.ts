import * as TelegramBot from "node-telegram-bot-api";
import {setAdminReportableMode} from "../../db";
import langJson from "../assets/lang.json";
import {groupSettings} from "../../../types";

/*
 * /welcome
 */
const regexp = /\/adminreportable/

const callback = async (queue, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        setAdminReportableMode(db, 'telegram', String(msg.chat.id),settings.admin_reportable? 0: 1)
        const msgToggle = settings.lang === "en" ? settings.admin_reportable? "Admins are immune from reports." : "Admins are now held accountable like regular users." : settings.admin_reportable? "Los administradores son inmunes a los informes." : "Los administradores son ahora responsables como los usuarios normales."
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, msgToggle, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})}catch{}});
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};