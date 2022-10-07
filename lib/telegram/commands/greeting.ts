import * as TelegramBot from "node-telegram-bot-api";
import {getRule, setRules} from "../../db";
import langJson from "../assets/lang.json";

/*
 * /getrules
 */


let greetingMap : Map<number, [number, number]> = new Map();

const callback = async (db: any, lang: string, bot: TelegramBot, msg: TelegramBot.Message) => {

    var rules = await getRule(db, 'telegram', String(msg.chat.id), Math.floor(Date.now()/1000));
    
    if (!rules){
        rules = langJson[lang].defaultRules;
        await setRules(db, 'telegram', String(msg.chat.id), rules, Math.floor(Date.now()/1000));
    }

    const previousMsgId = greetingMap?.get(msg.chat.id);
    if (previousMsgId){
        bot.deleteMessage(msg.chat.id, String(previousMsgId[0]));
        bot.deleteMessage(msg.chat.id, String(previousMsgId[1]));
    }

    const msg1: TelegramBot.Message = await bot.sendMessage(msg.chat.id, `${langJson[lang].greeting1}[Kleros Moderate](https://kleros.io/moderate/).`, {parse_mode: "Markdown"});
    const msg2: TelegramBot.Message = await bot.sendMessage(msg.chat.id, `${langJson[lang].greeting2}(${rules}). ${langJson[lang].greeting3}`, {parse_mode: "Markdown"});

    greetingMap.set(msg.chat.id, [msg1.message_id, msg2.message_id]);
}

export {callback};