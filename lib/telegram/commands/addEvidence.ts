import * as TelegramBot from "node-telegram-bot-api";
import {Wallet} from "@ethersproject/wallet";
import {ipfsPublish, ipfsPublishBuffer} from "../../ipfs-publish";
import {getRealitioArbitrator} from "../../ethers";
import fetch from 'node-fetch';
import langJson from "../assets/lang.json";
import {getDisputedReportsInfo, getActiveEvidenceGroupId, setAllowance, getAllowance} from "../../db";

const processCommand = async (bot: TelegramBot, lang: string, msg: TelegramBot.Message, questionId: number|string, address: string, privateKey: string): Promise<string> => {
    const evidencePath = await upload(bot, lang, msg, address);
    const evidenceJsonPath = await uploadEvidenceJson(lang, msg, evidencePath, address);
    await bot.sendMessage(msg.chat.id, `${langJson[lang].addEvidence.submitted}(https://ipfs.kleros.io${evidencePath}).`, {parse_mode: "Markdown"});
    await submitEvidence(evidenceJsonPath, questionId,privateKey);

    return evidenceJsonPath;
}

const upload = async (bot: TelegramBot, lang: string, msg: TelegramBot.Message, address: string): Promise<string> => {
    if (msg.reply_to_message.text){
        return await uploadTextEvidence(lang, msg, address);
    } else if (msg.reply_to_message.location){
        return await uploadLocationEvidence(lang, msg, address);
    } else if (msg.reply_to_message.poll){
        return await uploadPollEvidence(lang, msg, address);
    } else {
        var file: TelegramBot.File;
        if (msg.reply_to_message.sticker){
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
        const fileIPFS = await uploadFileEvidence(filePath, file.file_path.replace('/','_'));
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

const uploadLocationEvidence = async (lang: string, msg: TelegramBot.Message, address: string): Promise<string> => {
    const enc = new TextEncoder();
    const author = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name) + ' ID:'+msg.reply_to_message.from.id ;
    const fileName = `${langJson[lang].addevidence.location}.txt`;
    const chatHistory = `${langJson[lang].addevidence.Chat}: ${msg.chat.title} (${String(msg.chat.id)})
    
${langJson[lang].addevidence.Author}: ${author} (${(new Date(msg.reply_to_message.date*1000)).toISOString()})

${langJson[lang].addevidence.Message} (${langJson[lang].addevidence.location}): ${langJson[lang].addevidence.latitude} - ${msg.reply_to_message.location.latitude}, ${langJson[lang].addevidence.longitude} - ${msg.reply_to_message.location.longitude}`;

    const evidencePath = await ipfsPublish(`${fileName}`, enc.encode(chatHistory));

    return evidencePath;
}

const uploadPollEvidence = async (lang: string, msg: TelegramBot.Message, address: string): Promise<string> => {
    const enc = new TextEncoder();
    const author = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name) + ' ID:'+msg.reply_to_message.from.id ;
    const fileName = `${langJson[lang].addevidence.Poll}.txt`;
    var chatHistory = `${langJson[lang].addevidence.Chat}: ${msg.chat.title} (${String(msg.chat.id)})
    
${langJson[lang].addevidence.Author}: ${author} (${(new Date(msg.reply_to_message.date*1000)).toISOString()})

${langJson[lang].addevidence.Message} (${langJson[lang].addevidence.Poll}): \n  ${langJson[lang].addevidence.Question} - ${msg.reply_to_message.poll.question} \n`;

    msg.reply_to_message.poll.options.forEach(option => {
        chatHistory += ` ${langJson[lang].addevidence.Option}:'+option.text+'\n`;
    });

    const evidencePath = await ipfsPublish(`${fileName}`, enc.encode(chatHistory));

    return evidencePath;
}

const uploadTextEvidence = async (lang: string, msg: TelegramBot.Message, address: string): Promise<string> => {
    const enc = new TextEncoder();
    const author = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name) + ' ID:'+msg.reply_to_message.from.id ;
    const fileName = `${langJson[lang].addevidence.Message}.txt`;
    const chatHistory = `${langJson[lang].addevidence.Chat}: ${msg.chat.title} (${String(msg.chat.id)})
    
${langJson[lang].addevidence.Author}: ${author} (${(new Date(msg.reply_to_message.date*1000)).toISOString()})

${langJson[lang].addevidence.Message}: ${msg.reply_to_message.text}`;

    const evidencePath = await ipfsPublish(`${fileName}`, enc.encode(chatHistory));

    return evidencePath;
}

const uploadEvidenceJson = async (lang: string, msg: TelegramBot.Message, evidenceItem: string, address: string): Promise<string> => {
    const _name = `Kleros Moderator Bot: ${langJson[lang].addevidence.Chat} ${langJson[lang].addevidence.History}`;
    const author = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name) + ' ID:'+msg.reply_to_message.from.id ;
    const enc = new TextEncoder();
    const _description = `${langJson[lang].addevidence.Desc1} ${address}. 
    
    ${langJson[lang].addevidence.Desc2},
    
    ${msg.chat.title} (${langJson[lang].addevidence.Chat} Id: ${msg.chat.id}),
    
    ${langJson[lang].addevidence.Author},
    
    ${author},
    
    ${langJson[lang].addevidence.Date},
    
    (${(new Date(msg.reply_to_message.date*1000)).toISOString()}).`;

    const evidence = {
        name: _name,
        description: _description,
        fileURI: evidenceItem
      };

      const evidenceJsonPath = await ipfsPublish(`${langJson[lang].addevidence.Evidence}.json`, enc.encode(JSON.stringify(evidence)));

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

const callback = async (db: any, lang: string, bot: TelegramBot, msg: TelegramBot.Message) => {
    const match = msg.text.match(regexpFull);

    if (!msg.reply_to_message) {
        await bot.sendMessage(msg.chat.id, `/addevidence ${langJson[lang].errorReply}`);
        return;
    }

    if (!match || match.length < 2){
        await bot.sendMessage(msg.chat.id, `/addevidence ${langJson[lang].addEvidence.error1} ${langJson[lang].addEvidence.id}`);
        const errorMsg = await errorMessage(db, lang, bot, msg);
        await bot.sendMessage(msg.chat.id, errorMsg, {parse_mode: "Markdown", disable_web_page_preview: true});
        return; 
    }

    const result = await getActiveEvidenceGroupId(db, 'telegram', String(msg.chat.id), Number(match[1]));
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));
    const isAdmin = user.status === 'creator' || user.status === 'administrator';
    if (result == null){
        await bot.sendMessage(msg.chat.id, langJson[lang].errorId);
        const errorMsg = await errorMessage(db, lang, bot, msg);
        await bot.sendMessage(msg.chat.id, errorMsg, {parse_mode: "Markdown", disable_web_page_preview: true});
        return;
    }
    if(!isAdmin){
        const reportAllowance = await getAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id));
        if (reportAllowance === undefined){
            setAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id), 3, 14, Math.ceil( new Date().getTime() / 1000));
        } else if ((Math.ceil( new Date().getTime() / 1000) < reportAllowance.timestamp_refresh + 5760) && reportAllowance.evidence_allowance == 0 ){
            await bot.sendMessage(msg.chat.id, langJson[lang].errorAllowance);
        } else{
            const newReportAllowance = reportAllowance.report_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800);
            const newEvidenceAllowance = reportAllowance.evidence_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*5 - 1;
            const newRefreshTimestamp = reportAllowance.timestamp_refresh + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*28800;
            setAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id), Math.min(newReportAllowance,3), Math.min(newEvidenceAllowance,15), newRefreshTimestamp);
        }
    }

    try {
        const evidencePath = await processCommand(bot, lang, msg, match[1], await (await new Wallet(process.env.PRIVATE_KEY)).address, process.env.PRIVATE_KEY);
    } catch (e) {
        console.log(e);

        await bot.sendMessage(msg.chat.id, `${langJson[lang].errorTxn}: ${e.message}.`);
    }
}

const errorMessage = async (db: any, lang: string, bot: TelegramBot, msg: TelegramBot.Message): Promise<string> => {
    const reports = await getDisputedReportsInfo(db, 'telegram', String(msg.chat.id));

    var reportMessage: string = `${langJson[lang].addEvidence.msg1}:\n\n`;

    await reports.forEach(async (report) => {
        const MsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
        const msgTime = new Date(report.timestamp*1000).toISOString();
        reportMessage += ` - ${report.username} ${langJson[lang].addEvidence.msg2} [${msgTime.substring(0,msgTime.length-4)}](${MsgLink}) ([${langJson[lang].socialConsensus.consensus5}](${report.msgBackup})): ${langJson[lang].addEvidence.id} ${report.evidenceIndex}\n`;
    });

    return reportMessage;
}
export {regexp, callback, processCommand, submitEvidence, upload};