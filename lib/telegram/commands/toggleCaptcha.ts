import * as TelegramBot from "node-telegram-bot-api";
import {setCaptchaMode, setGreetingMode} from "../../db";
import * as toggleWelcome from "../../../lib/telegram/commands/toggleWelcome";
import langJson from "../assets/langNew.json";
import {groupSettings} from "../../../types";

/*
 * /welcome
 */
const regexp = /\/captcha/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        const botUser = await queue.add(async () => {try{const val = await bot.getChatMember(msg.chat.id, botId)
            return val}catch{}})
        if(!botUser)
        return
        if(botUser.status !== "administrator" || !botUser.can_restrict_members){
            const video = msg.chat.is_forum? 'QmSdP3SDoHCdW739xLDBKM3gnLeeZug77RgwgxBJSchvYV/guide_topics.mp4' : 'QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4'
            const msgerror = langJson[settings.lang].error.adminbot
            queue.add(async () => {try{await bot.sendVideo(msg.chat.id, `https://ipfs.kleros.io/ipfs/${video}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, caption: msgerror} : {caption: msgerror})}catch{}});
            return;
        }
        if (msg.chat.is_forum){
            if(!botUser.can_manage_topics){

                queue.add(async () => {try{await bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmSdP3SDoHCdW739xLDBKM3gnLeeZug77RgwgxBJSchvYV/guide_topics.mp4', {message_thread_id: msg.message_thread_id, caption: langJson[settings.lang].error.topics})}catch{}});
                return;
            }
            if (!settings.thread_id_welcome){
                toggleWelcome.createWelcomeThread(queue, db,settings,bot,msg)
            }
        }
        setCaptchaMode(db, 'telegram', String(msg.chat.id),settings.captcha? 0: 1)
        // if toggling on captcha, turn on greetings
        if (!settings.captcha)
            setGreetingMode(db, 'telegram', String(msg.chat.id),1)
        const msgcaptcha = settings.captcha? langJson[settings.lang].captcha.off : langJson[settings.lang].captcha.on
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, msgcaptcha, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})}catch{}});
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};