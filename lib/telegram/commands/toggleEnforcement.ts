import * as TelegramBot from "node-telegram-bot-api";
import {setEnforcementMode} from "../../db";
import langJson from "../assets/langNew.json";
import {groupSettings} from "../../../types";

/*
 * /welcome
 */
const regexp = /\/trial/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        const botUser = await queue.add(async () => {try{const val = await bot.getChatMember(msg.chat.id, botId)
            return val}catch{}})
        if(!botUser)
        return
        if(botUser.status !== "administrator" || !botUser.can_restrict_members){
            const video = msg.chat.is_forum? 'QmSdP3SDoHCdW739xLDBKM3gnLeeZug77RgwgxBJSchvYV/guide_topics.mp4' : 'QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4'
            const msg_error = langJson[settings.lang].error.adminbot
            queue.add(async () => {try{await bot.sendVideo(msg.chat.id, `https://ipfs.kleros.io/ipfs/${video}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, caption: msg_error} : {caption: msg_error})}catch{}});
            return;
        }
        setEnforcementMode(db, 'telegram', String(msg.chat.id),settings.enforcement? 0: 1)
        // if toggling on captcha, turn on greetings
        const msg_enforcement = settings.enforcement? langJson[settings.lang].enforcement.off : langJson[settings.lang].enforcement.on
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, msg_enforcement, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})}catch{}});
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};