import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {isBotOwner, setChatBot} from "../../db";

/*
 * /setbot [bot-address]
 */
const regexp = /\/setbot\s?(.+)?/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    if (user.status !== 'creator' && user.status !== 'administrator') {
        await bot.sendMessage(msg.chat.id, 'Only admins can execute this command.');
        return;
    }

    if (!match[1]) {
        await bot.sendMessage(msg.chat.id, 'Bot address is empty. Try again with /setbot [bot-address]');
        return;
    }

    if (!await isBotOwner(msg.from.id, match[1])) {
        await bot.sendMessage(msg.chat.id, 'You are not the owner of this bot.');
        return;
    }

    await setChatBot(msg.chat.id, match[1]);

    await bot.sendMessage(msg.chat.id, 'Chat bot updated');
}

export {regexp, callback};