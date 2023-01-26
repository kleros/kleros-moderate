import * as TelegramBot from "node-telegram-bot-api";
import {setGreetingMode, setThreadIDWelcome} from "../../db";
import langJson from "../assets/lang.json";
import {groupSettings} from "../../../types";

/*
 * /welcome
 */
const regexp = /\/welcome/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        if (msg.chat.is_forum && !settings.thread_id_welcome){
            await createWelcomeThread(queue, db, settings,bot,msg)
        }
        setGreetingMode(db, 'telegram', String(msg.chat.id),settings.greeting_mode? 0: 1)
        const msg_welcome = settings.lang === "en" ? settings.greeting_mode? "Welcome messages are off." : "Welcome messages are on." : settings.greeting_mode? "Los mensajes de bienvenida están desactivados." : "Los mensajes de bienvenida están encendidos."
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, msg_welcome, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})}catch{}});
    } catch(e){
        console.log(e)
    }
}

const createWelcomeThread = async (queue:any, db: any, settings: groupSettings, bot: any, msg: any) => {
    const topicWelcome = await queue.add(async () => {try{const val = await bot.createForumTopic(msg.chat.id, settings.lang === "en" ? 'Bienvenidos' : 'Welcome', {icon_custom_emoji_id: '4929292553544531969'})
    return val}catch{}});
    if(!topicWelcome)
    return
    const msg_welcome = settings.lang === "en" ? `This group is moderated with [Kleros Moderate](https://kleros.io/moderate/).` : "Este grupo está moderado con [Kleros Moderate](https://kleros.io/moderate/)."
    const msg1: TelegramBot.Message = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, msg_welcome, {parse_mode: "Markdown", message_thread_id: topicWelcome.message_thread_id})
    return val}catch{}});
    if(!msg1)
    return
    queue.add(async () => {try{await bot.pinChatMessage(msg.chat.id, msg1.message_id, {message_thread_id: topicWelcome.message_thread_id})}catch{}})
    setThreadIDWelcome(db, 'telegram', String(msg.chat.id), String(topicWelcome.message_thread_id))
}

export {regexp, callback, createWelcomeThread};