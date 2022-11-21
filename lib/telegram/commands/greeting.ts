import * as TelegramBot from "node-telegram-bot-api";
import langJson from "../assets/lang.json";
import {groupSettings} from "../../../types";

let greetingMap : Map<number, [number, number]> = new Map();

const callback = async (bot: any, settings: groupSettings, msg: any) => {
    const previousMsgId = greetingMap.get(msg.chat.id);
    if (previousMsgId){
        try{
            bot.deleteMessage(msg.chat.id, String(previousMsgId[0]));
            bot.deleteMessage(msg.chat.id, String(previousMsgId[1]));
        } catch (e){
            console.log(e)
        }
    }
    try{
        if(msg.chat.is_forum){
            bot.sendMessage(msg.chat.id, `Welcome [${msg.from.first_name}](tg://user?id=${msg.from.id}) ${langJson[settings.lang].greeting2}(${settings.rules}). ${langJson[settings.lang].greeting3}`, {message_thread_id: settings.thread_id_welcome, parse_mode: "Markdown"});
        } else {
            const msg1: TelegramBot.Message = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].greeting1}[Kleros Moderate](https://kleros.io/moderate/).`, {parse_mode: "Markdown"});
            const msg2: TelegramBot.Message = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].greeting2}(${settings.rules}). ${langJson[settings.lang].greeting3}`, {parse_mode: "Markdown"});
            greetingMap.set(msg.chat.id, [msg1.message_id, msg2.message_id]);
        }
    } catch(e){
        console.log(e)
    }
}

export {callback};