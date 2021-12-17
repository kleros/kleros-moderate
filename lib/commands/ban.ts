import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";

/*
 * /ban
 */
const regexp = /\/ban/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {

    if (!msg.reply_to_message) {
        await bot.sendMessage(msg.chat.id, `/ban must be used in a reply`);
        return;
    }

    const botUser = await bot.getMe();

    if (botUser.id === msg.reply_to_message.from.id) {
        await bot.sendMessage(msg.chat.id, `The Moderator Bot can't be banned.`);
        return;
    }

    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    //TODO: evidence is saved (how is it saved? What evidence?)

    if (user.status === 'creator' || user.status === 'administrator') {
        // TODO
        // A question is automatically created in Realitio with an answer in favor of banning the user.
        // Bond of the answer: 1 xDAI (initially the answer can be omitted).
    } else {
        // TODO
        // The user is required to create a question in Realitio and submit an answer with a minimum bond.
    }

    // the user gets notified and it is explained to them how to appeal.
    await bot.sendMessage(msg.chat.id, `*${msg.reply_to_message.from.username}* you have been banned, you can appeal here: {URL}`, {parse_mode: 'Markdown'});

    // TODO: If the user appeals (submits an answer to Realitio), the user gets automatically unbanned.

    //@ts-ignore
    await bot.banChatMember(msg.chat.id, String(msg.reply_to_message.from.id));
}

export {regexp, callback};