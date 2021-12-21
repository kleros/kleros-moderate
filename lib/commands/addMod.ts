import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";
import {addMod} from "../db";

const processCommand = async (bot: TelegramBot, chatId: number, userId: number, modUserId: number) => {
    const user = await bot.getChatMember(chatId, String(userId));

    if (user.status === 'creator' || user.status === 'administrator') {
        await addMod(chatId, modUserId);
        await bot.sendMessage(chatId, `[${modUserId}](tg://user?id=${modUserId}) is now a mod.`, {parse_mode: 'Markdown'});
    } else {
        await bot.sendMessage(chatId, `Only admins can execute this command.`);
    }
}

/*
 * /addmod
 */
const regexpReply = /^\/addmod$/

const callbackReply: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {

    if (!msg.reply_to_message) {
        await bot.sendMessage(msg.chat.id, `/addmod must be used in a reply`);
        return;
    }

    await processCommand(bot, msg.chat.id, msg.from.id, msg.reply_to_message.from.id);
}

/*
 * /addmod [userId]
 */
const regexpUserId = /^\/addmod (\d+)$/

const callbackUserId: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    await processCommand(bot, msg.chat.id, msg.from.id, Number(match[1]));
}

export {
    regexpReply, callbackReply,
    regexpUserId, callbackUserId
};