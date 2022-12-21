import * as TelegramBot from "node-telegram-bot-api";
import {setCaptchaMode, setGreetingMode} from "../../db";
import * as toggleWelcome from "../../../lib/telegram/commands/toggleWelcome";
import langJson from "../assets/lang.json";
import {groupSettings} from "../../../types";

/*
 * /welcome
 */
const regexp = /\/captcha/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        if (msg.chat.is_forum && !settings.thread_id_welcome){
            toggleWelcome.createWelcomeThread(queue, db,settings,bot,msg)
        }
        setCaptchaMode(db, 'telegram', String(msg.chat.id),settings.captcha? 0: 1)
        // if toggling on captcha, turn on greetings
        if (!settings.captcha)
            setGreetingMode(db, 'telegram', String(msg.chat.id),1)
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, settings.captcha? "Captcha is off." : "Captcha is on.", msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})}catch{}});
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};