import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {Wallet} from "@ethersproject/wallet";
import {addReportRequest, getReportRequest, addReport, getRecordCount, getGroup, setInviteURL, getInviteURL, getQuestionId, getRule, getConcurrentReports, getAllowance, setAllowance} from "../../db";
import {upload} from "./addEvidence"
import {reportUser} from "../../bot-core";

/*
 * /report
 */
const regexp = /\/report\s?(.+)?/

const callback: CommandCallback = async (bot: any, msg: TelegramBot.Message, match: string[]) => {

    if (!msg.reply_to_message) {
        await bot.sendMessage(msg.chat.id, `/report must be used in a reply`);
        return;
    }
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));
    const isAdmin = user.status === 'creator' || user.status === 'administrator';
    const botUser = await bot.getMe();
    const botChatMember = await bot.getChatMember(msg.chat.id, String(botUser.id));
    const reportedChatMember = await bot.getChatMember(msg.chat.id, String(msg.reply_to_message.from.id));
    if (reportedChatMember.status === 'creator' || reportedChatMember.status === 'administrator') {
        await bot.sendMessage(msg.chat.id, `An admin can't be reported.`);
        return;
    }
    if (!botChatMember.can_restrict_members) {
        await bot.sendMessage(msg.chat.id, `The Moderator Bot needs to have the "can_restrict_members" permission to be able to enable to reports.`);
        return;
    }

    const fromUsername = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || `no-username-set`);
    const reportedUserID = String(msg.reply_to_message.from.id);
    const reportedQuestionId = await getQuestionId('telegram', String(msg.chat.id), reportedUserID, String(msg.reply_to_message.message_id));
    if (reportedQuestionId){
        await bot.sendMessage(msg.chat.id, `The message is already [reported](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${reportedQuestionId})`, {parse_mode: 'Markdown'});
        return;
    }

    const reportRequest = await getReportRequest('telegram', String(msg.chat.id), String(msg.reply_to_message.message_id)); 
    if (!isAdmin && reportRequest){
        const requestMsgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + reportRequest.msgRequestId;
        await bot.sendMessage(msg.chat.id, `This message report is already [requested](${requestMsgLink}).`, {parse_mode: 'Markdown'});
        return;
    }
    const reports = await getConcurrentReports('telegram', String(msg.chat.id), reportedUserID, msg.reply_to_message.date);

    if (reports.length > 0 && match[1] != 'confirm') {
        var reportInfo = `Are you sure the user *${fromUsername} (ID :${reportedUserID})* was not already reported for this behavior?\n\nDuplicate reports will result in lost deposits. Reported messages from the same user within 24 hours include: \n\n`;
        (reports).forEach((report) => {
            const privateMsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
            reportInfo += ` - [Message at ${new Date(report.timestamp*1000).toISOString()}](${privateMsgLink}): [Report](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${report.question_id})\n`;
        });
        reportInfo += `\nIf you are sure, type \'/report confirm\'`
        await bot.sendMessage(msg.chat.id, reportInfo, {parse_mode: 'Markdown'});
        return;
    } 


    const rules = await getRule('telegram', String(msg.chat.id), msg.reply_to_message.date);
    if (!rules){
        await bot.sendMessage(msg.chat.id, `No rules found for this message. Rules are not retroactive. Reports are only possible for messages after rules are set.`);
        return;
    }

    if (!rules) {
        await bot.sendMessage(msg.chat.id, `You need to /setrules before /report`);
        return;
    }
    
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        await bot.sendMessage(msg.chat.id, `This chat does not have a bot address. Execute /setaccount or /newaccount first.`);
        return;
    }

    const evidencepath = await upload(bot, msg, await (await new Wallet(process.env.PRIVATE_KEY)).address);
    const msgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + String(msg.reply_to_message.message_id);
    const msgBackup = 'ipfs.kleros.io'+evidencepath;

    if (!isAdmin){
        const reportAllowance = await getAllowance('telegram', String(msg.chat.id), String(msg.from.id));
        if ( reportAllowance === undefined ){
            setAllowance('telegram', String(msg.chat.id), String(msg.from.id), 2, 15, Math.ceil( new Date().getTime() / 1000));
        } else if ((Math.ceil( new Date().getTime() / 1000) < reportAllowance.timestamp_refresh + 28800) && reportAllowance.report_allowance == 0 ){
            await bot.sendMessage(msg.chat.id, `You have exhausted your daily report allowance.`);
            return;
        } else{
            const newReportAllowance = reportAllowance.report_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800) - 1;
            const newEvidenceAllowance = reportAllowance.evidence_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*5;
            const newRefreshTimestamp = reportAllowance.timestamp_refresh + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*28800;
            setAllowance('telegram', String(msg.chat.id), String(msg.from.id), newReportAllowance, newEvidenceAllowance, newRefreshTimestamp);
        }
        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                [
                    {
                    text: 'Confirm (1/3)',
                    callback_data: String(msg.reply_to_message.message_id)+'|'+String(msg.from.id)
                    }
                ]
                ]
            }
        };
        const reportRequestMsg = await bot.sendMessage(msg.chat.id, `Reports require atleast 3 confirmations.\n\n Should ${fromUsername} (ID: ${reportedUserID}) be repoted for breaking the [rules](${rules}) due to conduct over this [message](${msgLink}) ([ipfs backup](${msgBackup}))?`, opts);   
        addReportRequest('telegram',String(msg.chat.id),reportedUserID,fromUsername,String(msg.reply_to_message.message_id),msgBackup, String(reportRequestMsg.message_id));
    } else{
        reportMsg(bot, msg, fromUsername, reportedUserID, rules, String(msg.reply_to_message.message_id), msgBackup)
    }

    return;
}

const reportMsg = async (bot: TelegramBot, msg: TelegramBot.Message, fromUsername: string, reportedUserID: string, rules: string, msgId: string, msgBackup: string) => {
    try {

        const inviteURL = await getInviteURL('telegram', String(msg.chat.id));
        const inviteURLBackup = inviteURL? inviteURL: await bot.exportChatInviteLink(msg.chat.id);
        if (!inviteURL)
            await setInviteURL('telegram', String(msg.chat.id), inviteURLBackup);
            
        const msgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + msgId;

        const {questionId, questionUrl: appealUrl} = await reportUser(
            false, 
            fromUsername, 
            reportedUserID, 
            'Telegram',
            msg.chat.title,
            inviteURLBackup, 
            String(msg.chat.id), 
            rules, 
            msgLink, 
            msgBackup);

        try {
            //await submitEvidence(evidencepath[0], questionId, privateKey);
        } catch (e) {
            // let addEvidence fail, the question was created anyway
            console.log(e);

            //await bot.sendMessage(msg.chat.id, `An unexpected error has occurred while adding the evidence: ${e.message}. Does the bot address has enough funds to pay the transaction?`);
        }
        const evidenceIndex = await getRecordCount('telegram', String(msg.chat.id));
        await addReport(questionId, 'telegram', String(msg.chat.id), reportedUserID, fromUsername , msgId, false, msgBackup, evidenceIndex, 0);
        
        await bot.sendMessage(msg.chat.id, `*${fromUsername}  (ID :${reportedUserID}) *'s conduct due to this [message](${msgLink}) ([backup](${msgBackup})) is reported for breaking the [rules](${rules}).\n\nDid *${fromUsername}* break the rules? The [question](${appealUrl}) can be answered with a minimum bond of 5 DAI.\n\n To save a record, reply to messages you want saved with the command below,`, {parse_mode: 'Markdown'});
        await bot.sendMessage(msg.chat.id, `/addevidence ${evidenceIndex}`, {parse_mode: 'Markdown'});
    } catch (e) {
        console.log(e);

        await bot.sendMessage(msg.chat.id, `An unexpected error has occurred: ${e.reason}. Does the bot address has enough funds to pay the transaction?`);
        return;
    }
}

export {regexp, callback, reportMsg};