import * as TelegramBot from "node-telegram-bot-api";
import {Wallet} from "@ethersproject/wallet";
import {setInviteURL, getInviteURL, getRule} from "../../db";
import { getQuestionId } from "../../graph";
import { groupSettings } from "../../../types";
import {upload} from "./addEvidence"
import {reportUser} from "../../bot-core";
import langJson from "../assets/lang.json";
const escape = require('markdown-escape');
/*
 * /report
 */
const regexp = /\/report\s?(.+)?/
let evidenceIndexMap : Map<number, number> = new Map<number, number>();
let inviteURLMap : Map<number, string> = new Map<number, string>();
var botAddress: string;

const callback = async (db:any, settings: groupSettings, bot: any, botId: number, msg: TelegramBot.Message, match: string[]) => {

    if (!msg.reply_to_message) {
        await bot.sendMessage(msg.chat.id, `/report ${langJson[settings.lang].errorReply}`);
        return;
    }

    if (msg.reply_to_message.from.id === botId){
        await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].report.errorModBot}`);
    }

    // WHO WATCHES THE WATCHMEN??
    //const reportedChatMember = await bot.getChatMember(msg.chat.id, String(msg.reply_to_message.from.id));
    //if (reportedChatMember.status === 'creator' || reportedChatMember.status === 'administrator') {
    //    await bot.sendMessage(msg.chat.id, `${langJson[lang].report.errorAdmin}`);
    //    return;
    //}
    const fromUsername = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || `no-username-set`);
    const reportedUserID = String(msg.reply_to_message.from.id);

    // replace with graph, maybe also hashmap for fast
    const reportedQuestionId = await getQuestionId(botAddress, 'Telegram', String(msg.chat.id), reportedUserID, String(msg.reply_to_message.message_id));

    if (reportedQuestionId){
        await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].report.reported}(https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${reportedQuestionId})`, {parse_mode: 'Markdown'});
        return;
    }

    // replace with hashmap ?
    // only keep track of last 24 hours
    //const reportRequest 
    //= await getReportRequest(db, 'telegram', String(msg.chat.id), String(msg.reply_to_message.message_id));
/*
    if (reportRequest){
        const requestMsgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + reportRequest.msgRequestId;
        await bot.sendMessage(msg.chat.id, `${langJson[lang].report.reported}(${requestMsgLink}).`, {parse_mode: 'Markdown'});
        return;
    }*/
/*
    const reports = await getConcurrentReports(db, 'telegram', String(msg.chat.id), reportedUserID, msg.reply_to_message.date);

    if (reports.length > 0 && match[1] != langJson[lang].socialConsensus.confirm) {
        var reportInfo = `${langJson[lang].report.info1} *${escape(fromUsername)} (ID :${reportedUserID})* ${langJson[lang].report.info2} \n\n`;
        (reports).forEach((report) => {
            const privateMsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
            reportInfo += ` - [${langJson[lang].addEvidence.Message} ${new Date(report.timestamp*1000).toISOString()}](${privateMsgLink}): [${langJson[lang].getReports.reportMessage3}](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${report.question_id})\n`;
        });
        reportInfo += `\n${langJson[lang].report.sure} \'/report ${langJson[lang].socialConsensus.confirm}\'`
        await bot.sendMessage(msg.chat.id, reportInfo, {parse_mode: 'Markdown'});
        return;
    } 
*/

    const rules = await getRule(db, 'telegram', String(msg.chat.id), msg.reply_to_message.date);

    if (!rules){
        await bot.sendMessage(msg.chat.id, langJson[settings.lang].report.norules);
        return;
    }
    
    if (!botAddress)
        botAddress = await (await new Wallet(process.env.PRIVATE_KEY)).address

    const evidencepath = await upload(bot, settings.lang, msg, botAddress);
    const msgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + String(msg.reply_to_message.message_id);
    const msgBackup = 'https://ipfs.kleros.io'+evidencepath;
    // TODO report
    /*
    const reportAllowance = await getAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id));
    if(reportAllowance != undefined && reportAllowance.question_id_last){
        const isQuestionAnswered = await questionAnswered(db, reportAllowance.question_id_last);
        const lastReport = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${reportAllowance.question_id_last}`;
        if(!isQuestionAnswered && Math.floor(Date.now()/1000) < reportAllowance.timestamp_last_question + 259200){
            await bot.sendMessage(msg.chat.id, `${langJson[lang].report.allowance1}(${lastReport}) ${langJson[lang].report.allowance2}`, {parse_mode: 'Markdown'});
            return;
        }
    }*/
    /*
    if ( reportAllowance === undefined ){
        setAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id), 2, 15, Math.ceil( new Date().getTime() / 1000));
    } else if ((Math.ceil( new Date().getTime() / 1000) < reportAllowance.timestamp_refresh + 28800) && reportAllowance.report_allowance == 0 ){
        await bot.sendMessage(msg.chat.id, langJson[lang].report.noallowance);
        return;
    } else{
        const newReportAllowance = reportAllowance.report_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800) - 1;
        const newEvidenceAllowance = reportAllowance.evidence_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*5;
        const newRefreshTimestamp = reportAllowance.timestamp_refresh + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*28800;
        setAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id), Math.min(newReportAllowance,3), Math.min(newEvidenceAllowance,15), newRefreshTimestamp);
    }*/
    const opts = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
            [
                {
                text: langJson[settings.lang].socialConsensus.confirm + ' (1/3)',
                callback_data: String(msg.reply_to_message.from.id)+'|'+String(msg.reply_to_message.message_id)+'|'+String(msg.from.id)
                }
            ]
            ]
        }
    };
    const reportRequestMsg = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].socialConsensus.consensus1}\n\n ${langJson[settings.lang].socialConsensus.consensus2} [${escape(fromUsername)}](tg://user?id=${reportedUserID}) ${langJson[settings.lang].socialConsensus.consensus3}(${rules}) ${langJson[settings.lang].socialConsensus.consensus4}(${msgLink}) ([${langJson[settings.lang].socialConsensus.consensus5}](${msgBackup}))?`, opts);   
    return;
}
const reportMsg = async (settings: groupSettings, db: any, bot: TelegramBot, msg: TelegramBot.Message, fromUsername: string, reportedUserID: string, rules: string, msgId: string, msgBackup: string, reportedBy: string, batchedSend: any) => {
    try {
        var inviteURL = inviteURLMap.get(msg.chat.id)
        if (!inviteURL){
            inviteURL = await getInviteURL(db, 'telegram', String(msg.chat.id));
            if (!inviteURL){
                inviteURL = await bot.exportChatInviteLink(msg.chat.id);
                await setInviteURL(db, 'telegram', String(msg.chat.id), inviteURL);
            }
            inviteURLMap.set(msg.chat.id, inviteURL)
        }

        const msgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + msgId;

        var evidenceIndex = evidenceIndexMap.get(msg.chat.id) + 1;
        if (!evidenceIndex)
            evidenceIndex = 1//await getRecordCount(db, 'telegram', String(msg.chat.id))+1;
        evidenceIndexMap.set(msg.chat.id, evidenceIndex);

        
        const {questionId, questionUrl: appealUrl} = await reportUser(
            batchedSend,
            settings.lang,
            false, 
            fromUsername, 
            reportedUserID, 
            'Telegram',
            msg.chat.title,
            inviteURL, 
            String(msg.chat.id), 
            rules, 
            msgLink, 
            msgBackup,
            reportedBy);
        
        await bot.sendMessage(settings.channelID, `*${escape(fromUsername)}  (ID :${reportedUserID}) *'s conduct due to this [message](${msgLink}) ([backup](${msgBackup})) is reported for breaking the [rules](${rules}).\n\nDid *${escape(fromUsername)}* break the rules? The [question](${appealUrl}) can be answered with a minimum bond of 5 DAI.\n\n To save a record, reply to messages you want saved with the command below,\n/addevidence ${evidenceIndex}`, {parse_mode: 'Markdown'});

        return questionId;
    } catch (e) {
        console.log(e);

        await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].errorTxn}. ${e.reason}. `);
        return;
    }
}

export {regexp, callback, reportMsg};