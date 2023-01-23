import * as TelegramBot from "node-telegram-bot-api";
import {Wallet} from "@ethersproject/wallet";
import { BigNumber} from "@ethersproject/bignumber";
import {ipfsPublish, ipfsPublishBuffer} from "../../utils/ipfs-publish";
import { setAllowance, getAllowance, getActiveEvidenceGroupId , existsQuestionId} from "../../db";
import fetch from 'node-fetch';
import { getQuestionsNotFinalized } from "../../graph";
import { groupSettings } from "../../../types";
import langJson from "../assets/langNew.json";
const _contract = require('../../abi/Realitio_v2_1_ArbitratorWithAppeals.json')
const Web3 = require('web3')
const web3 = new Web3(process.env.WEB3_PROVIDER_URL)
const ob = require('urbit-ob')

const contract_en = new web3.eth.Contract(
    _contract,
    process.env.REALITIO_ARBITRATOR_EN
  )

  const contract_es = new web3.eth.Contract(
    _contract,
    process.env.REALITIO_ARBITRATOR_EN
  )
var botAddress: string;
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;
var myQueue
myCache.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });

const processCommand = async (queue: any, bot: any, settings: groupSettings, msg: any, questionId: number|string, batchedSend: any ): Promise<string> => {
    const chatobj = await queue.add(async () => {try{const val = await bot.getChat(msg.chat.id)
        return val}catch{}});
    if (!chatobj)
        return
    const isPrivate = !chatobj.active_usernames;
    const evidencePath = await upload(queue, bot, settings.lang, msg,isPrivate);
    const evidenceJsonPath = await uploadEvidenceJson(settings.lang, msg, evidencePath,isPrivate);
    try{
        queue.add(async () => {try{
            const resp = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].addevidence.submitted}(https://ipfs.kleros.io${evidencePath}).`, msg.is_topic_message? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id}:{parse_mode: "Markdown"})
            return resp.message_id}catch{}});
    } catch(e){
        console.log(e)
    }
    submitEvidence(batchedSend, evidenceJsonPath, questionId, settings.lang);

    return evidenceJsonPath;
}

const upload = async (queue:any, bot: TelegramBot, lang: string, msg: TelegramBot.Message, isPrivate: boolean): Promise<string> => {

    if (msg.reply_to_message.text){
        return await uploadTextEvidence(lang, msg,isPrivate);
    } else if (msg.reply_to_message.location){
        return await uploadLocationEvidence(lang, msg,isPrivate);
    } else if (msg.reply_to_message.poll){
        return await uploadPollEvidence(lang, msg,isPrivate);
    } else {
        var file: TelegramBot.File;
        if (msg.reply_to_message.sticker){
            file = await queue.add(async () => {try{
                const val = await bot.getFile(msg.reply_to_message.sticker.file_id);
                return val
            }catch{}});
            if(!file)
                return
        } else if (msg.reply_to_message.photo){
            file = await queue.add(async () => {try{const val = await bot.getFile(msg.reply_to_message.photo[msg.reply_to_message.photo.length-1].file_id)
            return val}catch{}});   
            if(!file)
            return
        } else if (msg.reply_to_message.audio){
            file = await queue.add(async () => {try{const val = await bot.getFile(msg.reply_to_message.audio.file_id)
                return val}catch{}});   
            if(!file)
            return
        } else if (msg.reply_to_message.voice){
            file = await queue.add(async () => {try{const val = await bot.getFile(msg.reply_to_message.voice.file_id)
                return val}catch{}});   
                if(!file)
                return
        } else if (msg.reply_to_message.video){
            file = await queue.add(async () => {try{const val = await bot.getFile(msg.reply_to_message.video.file_id)
                return val}catch{}});   
                if(!file)
                return
        } else if (msg.reply_to_message.video_note){
            file = await queue.add(async () => {try{const val = await bot.getFile(msg.reply_to_message.video_note.file_id)
                return val}catch{}});   
                if(!file)
                return
        } else if (msg.reply_to_message.document){
            file = await queue.add(async () => {try{const val = await bot.getFile(msg.reply_to_message.document.file_id)
                return val}catch{}});   
                if(!file)
                return
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

const uploadLocationEvidence = async (lang: string, msg: TelegramBot.Message, isPrivate: boolean): Promise<string> => {
    const enc = new TextEncoder();
    var author = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name) + ' (ID:'+msg.reply_to_message.from.id+')' ;
    var chatmsg = `${msg.chat.title} (ID: ${msg.chat.id})`
    //if(isPrivate){
    //    const hashedUserID = web3.utils.sha3(String(msg.reply_to_message.from.id)+process.env.secret);
    //    author = ob.patp(hashedUserID.substring(0,8))
    //    chatmsg = `Private Telegram Group`
    //}
    const fileName = `${langJson[lang].addevidence.location}.txt`;
    var chatHistory = `${chatmsg}
    
${langJson[lang].addevidence.Author}: ${author} (${(new Date(msg.reply_to_message.date*1000)).toISOString()})

${langJson[lang].addevidence.Message} (${langJson[lang].addevidence.location}): ${langJson[lang].addevidence.latitude} - ${msg.reply_to_message.location.latitude}, ${langJson[lang].addevidence.longitude} - ${msg.reply_to_message.location.longitude}`;

var textReason = ''
const match = msg.text.match(regexpFull);
if (match){
    var remainderMatch = match[1].split(' ')
    remainderMatch.shift();
    const reason = remainderMatch.join(' ')
    textReason = reason.length > 0? `${langJson[lang].addevidence.explain}: ${reason}` : ''
}

chatHistory += `\n\n${textReason}`;
    const evidencePath = await ipfsPublish(`${fileName}`, enc.encode(chatHistory));

    return evidencePath;
}

const uploadPollEvidence = async (lang: string, msg: TelegramBot.Message, isPrivate: boolean): Promise<string> => {
    var author = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name) + ' ID:'+msg.reply_to_message.from.id ;
    var chatmsg = `${msg.chat.title} (${langJson[lang].addevidence.Chat} ID: ${msg.chat.id})`
    /*if(isPrivate){
        const hashedUserID = web3.utils.sha3(String(msg.reply_to_message.from.id)+process.env.secret);
        author = ob.patp(hashedUserID.substring(0,8))
        chatmsg = `Private Telegram Group`
    }*/
    const enc = new TextEncoder();
    const fileName = `${langJson[lang].addevidence.Poll}.txt`;
    var chatHistory = `${chatmsg}
    
${langJson[lang].addevidence.Author}: ${author} (${(new Date(msg.reply_to_message.date*1000)).toUTCString()})

${langJson[lang].addevidence.Message} (${langJson[lang].addevidence.Poll}): \n  ${langJson[lang].addevidence.Question} - ${msg.reply_to_message.poll.question} \n`;

    msg.reply_to_message.poll.options.forEach(option => {
        chatHistory += ` ${langJson[lang].addevidence.Option}:'+${option.text}+'\n`;
    });

    var textReason = ''
    const match = msg.text.match(regexpFull);
    if (match){
        var remainderMatch = match[1].split(' ')
        remainderMatch.shift();
        const reason = remainderMatch.join(' ')
        textReason = reason.length > 0? `Evidence Submitted with explanation: ${reason}` : ''
    }

    chatHistory += `\n\n${textReason}`;

    const evidencePath = await ipfsPublish(`${fileName}`, enc.encode(chatHistory));

    return evidencePath;
}

const uploadTextEvidence = async (lang: string, msg: TelegramBot.Message, isPrivate: boolean): Promise<string> => {
    var author = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name) + ' (ID:'+msg.reply_to_message.from.id+')' ;
    var chatmsg = `${msg.chat.title} ( ID: ${msg.chat.id})`
    /*if(isPrivate){
        const hashedUserID = web3.utils.sha3(String(msg.reply_to_message.from.id)+process.env.secret);
        author = ob.patp(hashedUserID.substring(0,8))
        chatmsg = `Private Telegram Group`
    }*/

    const enc = new TextEncoder();
    const match = msg.text.match(regexpFull);
    var textReason = ''
    if (match){
        var remainderMatch = match[1].split(' ')
        remainderMatch.shift();
        const reason = remainderMatch.join(' ')
        textReason = reason.length > 0? `${langJson[lang].addevidence.explain}: ${reason}` : ''
    }
    const fileName = `${langJson[lang].addevidence.Message}.txt`;
    const chatHistory = `${chatmsg}
    
${langJson[lang].addevidence.Author}: ${author} (${(new Date(msg.reply_to_message.date*1000)).toUTCString()})

${langJson[lang].addevidence.Message}: ${msg.reply_to_message.text}

${textReason}`;

    const evidencePath = await ipfsPublish(`${fileName}`, enc.encode(chatHistory));

    return evidencePath;
}

const uploadEvidenceJson = async (lang: string, msg: TelegramBot.Message, evidenceItem: string, isPrivate: boolean): Promise<string> => {
    var author = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name) + ' ID:'+msg.reply_to_message.from.id ;
    var chatmsg = `${msg.chat.title} (${langJson[lang].addevidence.Chat} ID: ${msg.chat.id})`
    /*if(isPrivate){
        const hashedUserID = web3.utils.sha3(String(msg.reply_to_message.from.id)+process.env.secret);
        author = ob.patp(hashedUserID.substring(0,8))
        chatmsg = 'Private Telegram Group'
    }*/
    const _name = `Kleros Moderator Bot: ${langJson[lang].addevidence.Chat} ${langJson[lang].addevidence.History}`;
    const match = msg.text.match(regexpFull);
    var remainderMatch = match[1].split(' ')
    remainderMatch.shift();
    const reason = remainderMatch.join(' ')
    console.log(reason)
    const textReason = reason.length > 0? `${langJson[lang].addevidence.explain}: ${reason}` : ''
    const enc = new TextEncoder();
    if (!botAddress)
        botAddress = process.env.TRANSACTION_BATCHER_CONTRACT_ADDRESS
    const _description = `${langJson[lang].addevidence.Desc1}. 
    
    ${langJson[lang].addevidence.Chat}: ${chatmsg}
    ${langJson[lang].addevidence.Author}: ${author}
    ${langJson[lang].addevidence.Date}: (${(new Date(msg.reply_to_message.date*1000)).toUTCString()}).
    ${textReason}`;

    const evidence = {
        name: _name,
        description: _description,
        fileURI: evidenceItem
      };

      const evidenceJsonPath = await ipfsPublish(`${langJson[lang].addevidence.Evidence}.json`, enc.encode(JSON.stringify(evidence)));

    return evidenceJsonPath;
}

const submitEvidence = async (batchedSend: any, evidencePath: string, questionId: number|string, lang: string) => {
    const contract = lang === 'es' ? contract_es : contract_en
    batchedSend({
        args: [        
            questionId,
            evidencePath],
        method: contract.methods.submitEvidence,
        to: contract.options.address
      });
}

/*
 * /evidence [questionId]
 */
const regexp = /\/evidence/
const regexpFull = /\/evidence (.+)/
const regexpFullReason = /\/evidence (.+) (.+)/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botID: number, msg: any, matchh: string[], batchedSend: any) => {
    if (!myBot)
    myBot = bot
    if (!myQueue)
    myQueue = queue
    if (!msg.reply_to_message) {
        try{
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `/evidence ${langJson[settings.lang].error.reply}`, msg.is_topic_message? {message_thread_id: msg.message_thread_id}:{})
            return val}catch{}})
            if(!resp)
            return
            myCache.set(resp.message_id, msg.chat.id)
        } catch (e){
            console.log(e)
        }
        return;
    }

    const match = msg.text.match(regexpFull);
    const opts = msg.is_topic_message? {
        parse_mode: 'Markdown',
        message_thread_id: msg.message_thread_id,
        reply_markup: {
            inline_keyboard: [
            [
                {
                    text: 'DM me for help',
                    url: `https://t.me/${process.env.BOT_USERNAME}?start=addevidencehelp${msg.chat.id}`
                }
            ]
            ]
        }
    } : {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
            [
                {
                    text: 'DM me for help',
                    url: `https://t.me/${process.env.BOT_USERNAME}?start=addevidencehelp${msg.chat.id}`
                }
            ]
            ]
        }
    }
    //TODO Evidence IDs and button callback UX
    if (!match || match.length < 2){
        try{
            const msgresponse = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, langJson[settings.lang].addevidence.ID, opts)
            return val}catch{}})            
            if(!msgresponse)
            return
            myCache.set(msgresponse.message_id, msg.chat.id)
        } catch(e){
            console.log(e)
        }
        //const questions = await getQuestionsNotFinalized(botAddress)
        //bot.sendMessage(msg.chat.id, `Did you mean `+ JSON.stringify(questions));
        //bot.sendMessage(msg.chat.id, `/addevidence ${langJson[settings.lang].addevidence.error1} ${langJson[settings.lang].addevidence.id}`, msg.is_topic_message? {message_thread_id: msg.message_thread_id}:{})
        //const errorMsg = await errorMessage(db, lang, bot, msg);
        //await bot.sendMessage(msg.chat.id, errorMsg, {parse_mode: "Markdown", disable_web_page_preview: true});
        return; 
    }
    const remainderMatch = match[1].split(' ')
    const evidenceID = getActiveEvidenceGroupId(db, 'telegram', String(msg.chat.id), remainderMatch[0]);
    if (!evidenceID){
        try{
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, langJson[settings.lang].addevidence.errorId, opts)
                return val}catch{}})
                if(!resp)
                return
            myCache.set(resp.message_id, msg.chat.id)
        } catch(e){
            console.log(e)
        }
        //const errorMsg = await errorMessage(db, lang, bot, msg);
        //await bot.sendMessage(msg.chat.id, errorMsg, {parse_mode: "Markdown", disable_web_page_preview: true});
        return;
    }
    const reportAllowance = getAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id));
    if (!reportAllowance){
        setAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id), 3, 14, Math.ceil( new Date().getTime() / 1000));
    } else if ((Math.ceil( new Date().getTime() / 1000) < reportAllowance.timestamp_refresh + 5760) && reportAllowance.evidence_allowance == 0 ){
        try{
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, langJson[settings.lang].addevidence.allowance)
                return val}catch{}});
                if(!resp)
                return
            myCache.set(resp.message_id, msg.chat.id)
        } catch (e){
            console.log(e)
        }
    } else{
        const newReportAllowance = reportAllowance.report_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800);
        const newEvidenceAllowance = reportAllowance.evidence_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*5 - 1;
        const newRefreshTimestamp = reportAllowance.timestamp_refresh + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*28800;
        setAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id), Math.min(newReportAllowance,3), Math.min(newEvidenceAllowance,15), newRefreshTimestamp);
    }

    try {
        const evidencePath = await processCommand(queue, bot, settings, msg, evidenceID,batchedSend);
    } catch (e) {
        console.log(e);
    }
}
/*
const errorMessage = async (db: any, lang: string, bot: TelegramBot, msg: TelegramBot.Message): Promise<string> => {
    const reports = await getDisputedReportsInfo(db, 'telegram', String(msg.chat.id));

    var reportMessage: string = `${langJson[lang].addevidence.msg1}:\n\n`;

    await reports.forEach(async (report) => {
        const MsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
        const msgTime = new Date(report.timestamp*1000).toISOString();
        reportMessage += ` - ${report.username} ${langJson[lang].addevidence.msg2} [${msgTime.substring(0,msgTime.length-4)}](${MsgLink}) ([${langJson[lang].socialConsensus.consensus5}](${report.msgBackup})): ${langJson[lang].addevidence.id} ${report.evidenceIndex}\n`;
    });

    return reportMessage;
}
*/
export {regexp, callback, processCommand, submitEvidence, upload};