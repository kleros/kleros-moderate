import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getChatBot} from "../../db";

/*
 * /getbot
 */
const regexp = /\/getbot/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatBot = await getChatBot(msg.chat.id);

    await bot.sendMessage(msg.chat.id, chatBot ? `Bot address: ${chatBot.address}` : 'Bot address not set.');
}

export {regexp, callback};