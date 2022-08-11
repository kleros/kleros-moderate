import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {ipfsPublish, ipfsPublishBuffer} from "../../ipfs-publish";
import {getRealitioArbitrator} from "../../ethers";
import fetch from 'node-fetch';
import {getGroup, getActiveReportedUserAndGroupId} from "../../db";

const processCommand = async (bot: TelegramBot, msg: TelegramBot.Message, questionId: number|string, address: string, privateKey: string): Promise<string> => {
    const evidencePath = await upload(bot, msg, address);
    const evidenceJsonPath = await uploadEvidenceJson(msg, evidencePath, address);
    await bot.sendMessage(msg.chat.id, `Evidence submitted: https://ipfs.kleros.io${evidenceJsonPath}`);
    await submitEvidence(evidenceJsonPath, questionId,privateKey);

    return evidenceJsonPath;
}

const upload = async (bot: TelegramBot, msg: TelegramBot.Message, address: string): Promise<string> => {
    if (msg.reply_to_message.text){
        return await uploadTextEvidence(msg, address);
    } else if (msg.reply_to_message.location){
        //TODO
        //return await uploadLocationEvidence(msg, address);
    } else if (msg.reply_to_message.poll){
        //TODO
        //return await uploadPoll(msg, address);
    } else {
        var file: TelegramBot.File;
        if (msg.reply_to_message.sticker){
            console.log('sticker');
            file = await bot.getFile(msg.reply_to_message.sticker.file_id);
        } else if (msg.reply_to_message.photo){
            file = await bot.getFile(msg.reply_to_message.photo[0].file_id);   
        } else if (msg.reply_to_message.audio){
            file = await bot.getFile(msg.reply_to_message.audio.file_id);   
        } else if (msg.reply_to_message.voice){
            file = await bot.getFile(msg.reply_to_message.voice.file_id);   
        } else if (msg.reply_to_message.video){
            file = await bot.getFile(msg.reply_to_message.video.file_id);   
        } else if (msg.reply_to_message.video_note){
            file = await bot.getFile(msg.reply_to_message.video_note.file_id);   
        } else if (msg.reply_to_message.document){
            file = await bot.getFile(msg.reply_to_message.document.file_id);   
        }
        const filePath = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/`+file.file_path;
        console.log(file.file_path);
        const fileIPFS = await uploadFileEvidence(filePath, file.file_path.replace('/','_'));
        console.log(fileIPFS);
        return fileIPFS;
    }

}

const uploadFileEvidence = async (filePath: string, fileName: string): Promise<string> => {
    const enc = new TextEncoder();
    const file = await fetch(filePath)
        .then(res => res.buffer())
        .then(async buffer => { return await ipfsPublishBuffer(fileName,buffer); });
    return file;
}

const uploadTextEvidence = async (msg: TelegramBot.Message, address: string): Promise<string> => {
    const enc = new TextEncoder();
    const author = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name) + ' ID:'+msg.reply_to_message.from.id ;
    const fileName = `msg.txt`;
    const chatHistory = `Chat: ${msg.chat.title} (${Math.abs(msg.chat.id)})
    
Author: ${author} (${(new Date(msg.reply_to_message.date*1000)).toISOString()})

Message: ${msg.reply_to_message.text}`;

    const evidencePath = await ipfsPublish(`${fileName}`, enc.encode(chatHistory));

    return evidencePath;
}

const uploadEvidenceJson = async (msg: TelegramBot.Message, evidenceItem: string, address: string): Promise<string> => {
    const _name = 'Kleros Moderator Bot: Chat History';
    const author = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name) + ' ID:'+msg.reply_to_message.from.id ;
    const enc = new TextEncoder();
    const _description = `This is an automated message by the Kleros Moderator Bot with address ${address}. Check the bot account of the chat with /getaccount to make sure this evidence submission is not falsified.
    
    The attached file is a backup record of a message sent in the chat,
    
    ${msg.chat.title} (chatId: ${msg.chat.id}),
    
    and authored by ,
    
    ${author},
    
    at date,
    
    (${(new Date(msg.reply_to_message.date*1000)).toISOString()}).`;

    const evidence = {
        name: _name,
        description: _description,
        fileURI: evidenceItem
      };

      const evidenceJsonPath = await ipfsPublish(`evidence.json`, enc.encode(JSON.stringify(evidence)));

    return evidenceJsonPath;
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
const regexp = /\/addevidence/
const regexpFull = /\/addevidence (.+)/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const match = msg.text.match(regexpFull);

    if (!msg.reply_to_message || !match) {
        await bot.sendMessage(msg.chat.id, `/addevidence must be used in a reply`);
        return;
    }

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
        const evidencePath = await processCommand(bot, msg, match[1], group.address, group.private_key);
    } catch (e) {
        console.log(e);

        await bot.sendMessage(msg.chat.id, `An unexpected error has occurred: ${e.message}. Does the bot address has enough funds to pay the transaction?`);
    }
}

export {regexp, callback, processCommand, submitEvidence, upload};