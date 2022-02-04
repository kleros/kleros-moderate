import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {isAccountOwner, setChatAccount} from "../../db";

/*
 * /setaccount [address]
 */
const regexp = /\/setaccount\s?(.+)?/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    if (user.status !== 'creator' && user.status !== 'administrator') {
        await bot.sendMessage(msg.chat.id, 'Only admins can execute this command.');
        return;
    }

    if (!match[1]) {
        await bot.sendMessage(msg.chat.id, 'Account address is empty. Try again with /setaccount [address]');
        return;
    }

    if (!await isAccountOwner(String(msg.from.id), 'telegram', match[1])) {
        await bot.sendMessage(msg.chat.id, 'You are not the owner of this address.');
        return;
    }

    await setChatAccount(msg.chat.id, match[1]);

    await bot.sendMessage(msg.chat.id, 'Bot account updated');
}

export {regexp, callback};