import * as TelegramBot from "node-telegram-bot-api";
import {setGreetingMode, setThreadIDWelcome} from "../../db";
import langJson from "../assets/lang.json";
import {groupSettings} from "../../../types";

/*
 * /welcome
 */
const regexp = /\/welcome/

const callback = async (db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        if (msg.chat.is_forum){
            const topicWelcome = await bot.createForumTopic(msg.chat.id, 'Welcome', {icon_custom_emoji_id: '4929292553544531969'});
            const msg1: TelegramBot.Message = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].greeting1}[Kleros Moderate](https://kleros.io/moderate/).`, {parse_mode: "Markdown", message_thread_id: topicWelcome.message_thread_id});
            bot.pinChatMessage(msg.chat.id, msg1.message_id, {message_thread_id: topicWelcome.message_thread_id})
            setThreadIDWelcome(db, 'telegram', String(msg.chat.id), String(topicWelcome.message_thread_id))
        }
        setGreetingMode(db, 'telegram', String(msg.chat.id),settings.greeting_mode? 0: 1)
        bot.sendMessage(msg.chat.id, settings.greeting_mode? "Welcome messages are off." : "Welcome messages are on.", msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {});
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};