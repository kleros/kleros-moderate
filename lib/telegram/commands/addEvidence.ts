import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import ipfsPublish from "../../ipfs-publish";
import {getRealitioArbitrator} from "../../ethers";
import {getGroup, getActiveReportedUserAndGroupId} from "../../db";

const processCommand = async (msg: TelegramBot.Message, questionId: number|string, address: string, privateKey: string): Promise<string> => {

    const evidencePath = await uploadEvidence(msg, address);
    await submitEvidence(evidencePath[0], questionId,privateKey);

    return evidencePath[1];
}

const uploadEvidence = async (msg: TelegramBot.Message, address: string): Promise<string[]> => {
    const enc = new TextEncoder();
    const author = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name) + ' ID:'+msg.reply_to_message.from.id ;
    const fileName = `msg.txt`;
    const chatHistory = `Chat: ${msg.chat.title} (${Math.abs(msg.chat.id)})

Author: ${author} (${(new Date(msg.reply_to_message.date*1000)).toISOString()})

Message: ${msg.reply_to_message.text}`;

    const chatHistoryPath = await ipfsPublish(`${fileName}`, enc.encode(chatHistory));
    const _name = 'Kleros Moderator Bot: Chat History';
    const _description = `This is an automated message by the Kleros Moderator Bot with address ${address}.
    
    The attached file includes a selected transcript of chat messages.`;

    const evidence = {
        name: _name,
        description: _description,
        fileURI: chatHistoryPath,
      };

      const evidencePath = await ipfsPublish(`evidence.json`, enc.encode(JSON.stringify(evidence)));
      console.log('evidence path:'+evidencePath);
      console.log('evidence path:'+chatHistoryPath);
    return [evidencePath, chatHistoryPath];
}

const submitEvidence = async (evidencePath: string, questionId: number|string, privateKey: string) => {

    await getRealitioArbitrator(process.env.REALITIO_ARBITRATOR, privateKey)
        .submitEvidence(
            questionId,
            evidencePath
        )
}

/*
 * /addevidence [questionId]
 */
const regexp = /\/addevidence (.+)/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {

    if (!msg.reply_to_message) {
        await bot.sendMessage(msg.chat.id, `/addevidence must be used in a reply`);
        return;
    }

    //console.log(match);

    if (match.length < 2){
        await bot.sendMessage(msg.chat.id, `/addevidence must be followed by a question id`);
        return; 
    }

    const result = await getActiveReportedUserAndGroupId(match[1]);
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));
    if (!result){
        await bot.sendMessage(msg.chat.id, `The questionId is not active or does not exist.`);
        return;
    }

    const group = await getGroup('telegram', String(msg.chat.id));

    if (!group) {
        await bot.sendMessage(msg.chat.id, `This chat does not have a bot address. Execute /setaccount first.`);
        return;
    }

    const hasEvidencePermission = user.status === 'creator' || user.status === 'administrator' || String(user.user.id) === result.user_id;

    //if (user.status !== 'creator' && user.status !== 'administrator') {
    //    await bot.sendMessage(msg.chat.id, `Only admins can execute this command.`);
    //    return;
    //}

    try {
        const evidencePath = await processCommand(msg, match[1], group.address, group.private_key);
        await bot.sendMessage(msg.chat.id, `Evidence submitted: https://ipfs.kleros.io/${evidencePath}`);
    } catch (e) {
        console.log(e);

        await bot.sendMessage(msg.chat.id, `An unexpected error has occurred: ${e.message}. Does the bot address has enough funds to pay the transaction?`);
    }
}

export {regexp, callback, processCommand, submitEvidence, uploadEvidence};