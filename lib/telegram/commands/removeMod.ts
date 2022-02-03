import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {removeMod} from "../../db";

const processCommand = async (bot: TelegramBot, chatId: number, userId: number, modUserId: number) => {
    const user = await bot.getChatMember(chatId, String(userId));

    if (user.status === 'creator' || user.status === 'administrator') {
        await removeMod(chatId, modUserId);
        await bot.sendMessage(chatId, `[${modUserId}](tg://user?id=${modUserId}) is no longer a mod.`, {parse_mode: 'Markdown'});
    } else {
        await bot.sendMessage(chatId, `Only admins can execute this command.`);
    }
}


/*
 * /removemod
 */
const regexpReply = /^\/removemod$/

const callbackReply: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {

    if (!msg.reply_to_message) {
        await bot.sendMessage(msg.chat.id, `/removemod must be used in a reply`);
        return;
    }

    await processCommand(bot, msg.chat.id, msg.from.id, msg.reply_to_message.from.id);
}

/*
 * /removemod [userId]
 */
const regexpUserId = /^\/removemod (\d+)$/

const callbackUserId: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    await processCommand(bot, msg.chat.id, msg.from.id, Number(match[1]));
}

export {
    regexpReply, callbackReply,
    regexpUserId, callbackUserId
};