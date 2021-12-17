import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";
import {isMod, removeMod} from "../db";

/*
 * /removemod ?
 */
const regexp = /\/removemod (.+)/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    if (user.status === 'creator' || user.status === 'administrator') {

        if (await isMod(msg.chat.id, match[1])) {
            await removeMod(msg.chat.id, match[1]);
            await bot.sendMessage(msg.chat.id, `${match[1]} is no longer a mod.`);
        } else {
            await bot.sendMessage(msg.chat.id, `${match[1]} is not a mod, no change was made.`);
        }
    } else {
        await bot.sendMessage(msg.chat.id, `Only admins can execute this command.`);
    }
}

export {regexp, callback};