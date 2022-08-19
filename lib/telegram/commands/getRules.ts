import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getRule} from "../../db";

/*
 * /getrules
 */
const regexp = /\/getrules/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const rules = await getRule('telegram', String(msg.chat.id), Math.floor(Date.now()/1000));

    try {
        await bot.sendMessage(msg.chat.id, rules || 'No rules found for this chat.');        
    } catch (error) {
        console.log(error);
    }
}

export {regexp, callback};