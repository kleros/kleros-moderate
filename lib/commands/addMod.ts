import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";
import {addMod} from "../db";

/*
 * /addmod ?
 */
const regexp = /\/addmod (.+)/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    if (user.status === 'creator' || user.status === 'administrator') {
        // TODO: check that username exists?
        await addMod(msg.chat.id, match[1]);
        await bot.sendMessage(msg.chat.id, `${match[1]} is now a mod.`);
    } else {
        await bot.sendMessage(msg.chat.id, `Only admins can execute this command.`);
    }
}

export {regexp, callback};