import * as TelegramBot from "node-telegram-bot-api";
import langJson from "../assets/lang.json";
import {groupSettings} from "../../../types";

const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 900, checkperiod: 1200 } );
var myBot;

myCache.on("expired",function(key,value){
    myBot.deleteMessage(key, value.msg1);
    myBot.deleteMessage(key, value.msg2);
    });

const callback = async (bot: any, settings: groupSettings, msg: any) => {
    myBot = bot
    try{
        if(msg.chat.is_forum){
            bot.sendMessage(msg.chat.id, `Welcome [${msg.from.first_name}](tg://user?id=${msg.from.id}) ${langJson[settings.lang].greeting2}(${settings.rules}). ${langJson[settings.lang].greeting3}`, {message_thread_id: settings.thread_id_welcome, parse_mode: "Markdown"});
        } else {
            const msg1: TelegramBot.Message = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].greeting1}[Kleros Moderate](https://kleros.io/moderate/).`, {parse_mode: "Markdown"});
            const msg2: TelegramBot.Message = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].greeting2}(${settings.rules}). ${langJson[settings.lang].greeting3}`, {parse_mode: "Markdown"});
            myCache.set(msg.chat.id, {"msg1": msg1.message_id, "msg2": msg2.message_id});
        }
    } catch(e){
        console.log(e)
    }
}

export {callback};