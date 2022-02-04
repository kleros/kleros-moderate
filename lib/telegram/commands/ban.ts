import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {addBan, getChatBot, getRules, isMod} from "../../db";
import {processCommand as addEvidenceCommand} from "./addEvidence"
import {realityBan} from "../../reality-ban";

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

    const botChatMember = await bot.getChatMember(msg.chat.id, String(botUser.id));

    if (!botChatMember.can_restrict_members) {
        await bot.sendMessage(msg.chat.id, `The Moderator Bot needs to have the "can_restrict_members" permission to be able to ban users.`);
        return;
    }

    if (botUser.id === msg.reply_to_message.from.id) {
        await bot.sendMessage(msg.chat.id, `The Moderator Bot can't be banned.`);
        return;
    }

    const rules = await getRules(msg.chat.id);

    if (!rules) {
        await bot.sendMessage(msg.chat.id, `You need to /setrules before /ban`);
        return;
    }

    const privateKey = (await getChatBot(msg.chat.id))?.private_key || false;

    if (!privateKey) {
        await bot.sendMessage(msg.chat.id, `This chat does not have a bot address. Execute /setbot first.`);
        return;
    }

    try {
        const fromUsername = msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || String(msg.reply_to_message.from.id);

        const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

        const isAdmin = user.status === 'creator' || user.status === 'administrator';
        const isModerator = await isMod(msg.chat.id, msg.from.id);

        const hasBanningPermission = isAdmin || isModerator;

        const {questionId, questionUrl: appealUrl} = await realityBan(hasBanningPermission, fromUsername, rules, privateKey);

        try {
            await addEvidenceCommand(msg, questionId, privateKey);
        } catch (e) {
            // let addEvidence fail, the question was created anyway
            console.log(e);

            await bot.sendMessage(msg.chat.id, `An unexpected error has occurred while adding the evidence: ${e.message}. Does the bot address has enough funds to pay the transaction?`);
        }

        await addBan(questionId, msg.chat.id, msg.reply_to_message.from.id, hasBanningPermission);

        if (hasBanningPermission) {
            // the user gets notified and it is explained to them how to appeal.
            await bot.sendMessage(msg.chat.id, `*${fromUsername}* you have been banned, you can appeal here: ${appealUrl}`, {parse_mode: 'Markdown'});

            // @ts-ignore
            await bot.banChatMember(msg.chat.id, String(msg.reply_to_message.from.id), {revoke_messages: false});
        } else {
            // the user first needs to answer and provide a bond
            await bot.sendMessage(msg.chat.id, `For the ban to be applied you need to provide an answer with a bond of 1 DAI: ${appealUrl}`, {parse_mode: 'Markdown'});
        }
    } catch (e) {
        console.log(e);

        await bot.sendMessage(msg.chat.id, `An unexpected error has occurred: ${e.reason}. Does the bot address has enough funds to pay the transaction?`);
        return;
    }
}

export {regexp, callback};