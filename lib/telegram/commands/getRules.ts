import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getRule} from "../../db";

/*
 * /getrules
 */
const regexp = /\/getrules/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const rules = await getRule('telegram', String(msg.chat.id), Math.floor(Date.now()/1000));
    if (rules)
        await bot.sendMessage(msg.chat.id, `User conduct is moderated according to these [rules](${rules}).`,{parse_mode: "Markdown"});        
    else
        await bot.sendMessage(msg.chat.id, 'No rules found for this chat.');        

}

export {regexp, callback};