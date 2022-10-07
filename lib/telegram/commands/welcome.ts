import * as TelegramBot from "node-telegram-bot-api";
import {setRules, getRule} from "../../db";
import langJson from "../assets/lang.json";

/*
 * Welcome Message
 */

const callback = async (db: any, lang: string, bot: TelegramBot, myChatMember: TelegramBot.ChatMemberUpdated) => {
    try {
        const rules = await getRule(db, 'telegram', String(myChatMember.chat.id), Math.floor(Date.now()/1000));
    
        if (!rules){
            await bot.sendMessage(myChatMember.chat.id, `${langJson[lang].defaultRulesMsg1}(${langJson[lang].defaultRules}). ${langJson[lang].defaultRulesMsg2}.`, {parse_mode: "Markdown"});
            await setRules(db, 'telegram', String(myChatMember.chat.id), langJson[lang].defaultRules, Math.floor(Date.now()/1000));
        }
    } catch (error) {
        console.log(error);   
    }
}

export {callback};