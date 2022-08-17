import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getPermissions, addReport, getGroup, getInviteURL, getQuestionId, getRules, getConcurrentReports, getAllowance, setAllowance} from "../../db";
import {upload, submitEvidence} from "./addEvidence"
import {reportUser} from "../../bot-core";

/*
 * /report
 */
const regexp = /\/report\s?(.+)?/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {

    if (!msg.reply_to_message) {
        await bot.sendMessage(msg.chat.id, `/report must be used in a reply`);
        return;
    }

    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));
    const hasReportingPermission = user.status === 'creator' || user.status === 'administrator';
    const res = await getPermissions('telegram', String(msg.chat.id));
    const permissionless = res == true;
    
    if (!permissionless && !hasReportingPermission){
        await bot.sendMessage(msg.chat.id, `You do not have reporting permission.`);
        return;
    }
    
    const botUser = await bot.getMe();
    const botChatMember = await bot.getChatMember(msg.chat.id, String(botUser.id));
    const adminList = await bot.getChatAdministrators(msg.chat.id);

    for (const admin of adminList){
        if (admin.user.id === msg.reply_to_message.from.id) {
            await bot.sendMessage(msg.chat.id, `An admin can't be reported.`);
            return;
        }
    }

    if (!botChatMember.can_restrict_members) {
        await bot.sendMessage(msg.chat.id, `The Moderator Bot needs to have the "can_restrict_members" permission to be able to enable to reports.`);
        return;
    }

    const fromUsername = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || `no-username-set`);
    const reportedUserID = String(msg.reply_to_message.from.id);
    const reportedQuestionId = await getQuestionId('telegram', String(msg.chat.id), reportedUserID, String(msg.reply_to_message.message_id));
    console.log(reportedQuestionId);
    if (reportedQuestionId){
        await bot.sendMessage(msg.chat.id, `The message is already [reported](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${reportedQuestionId})`, {parse_mode: 'Markdown'});
        return;
    }
    const reports = await getConcurrentReports('telegram', String(msg.chat.id), reportedUserID, msg.reply_to_message.date);
    console.log(reports);

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

    const rules = await getRules('telegram', String(msg.chat.id), msg.reply_to_message.date);
    if (!rules){
        await bot.sendMessage(msg.chat.id, `No rules found for this message. Rules are not retroactive. Reports are only possible for messages after rules are set.`);
        return;
    }

    if (!rules) {
        await bot.sendMessage(msg.chat.id, `You need to /setrules before /report`);
        return;
    }
    const group = await getGroup('telegram', String(msg.chat.id));
    const privateKey = group?.private_key || false;

    if (!privateKey) {
        await bot.sendMessage(msg.chat.id, `This chat does not have a bot address. Execute /setaccount or /newaccount first.`);
        return;
    }

    if (permissionless){
        if (!hasReportingPermission){
            const reportAllowance = await getAllowance('telegram', String(msg.chat.id), String(msg.from.id));
            console.log(reportAllowance);
            if ( reportAllowance === undefined ){
                setAllowance('telegram', String(msg.chat.id), String(msg.from.id), 2, 15, Math.ceil( new Date().getTime() / 1000));
            } else if ((Math.ceil( new Date().getTime() / 1000) < reportAllowance.timestamp_refresh + 28800) && reportAllowance.report_allowance == 0 ){
                await bot.sendMessage(msg.chat.id, `You have exhausted your daily report allowance.`);
            } else{
                const newReportAllowance = reportAllowance.report_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800) - 1;
                const newEvidenceAllowance = reportAllowance.evidence_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*5;
                const newRefreshTimestamp = reportAllowance.timestamp_refresh + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*28800;
                console.log(newReportAllowance);
                console.log(newEvidenceAllowance);
                setAllowance('telegram', String(msg.chat.id), String(msg.from.id), newReportAllowance, newEvidenceAllowance, newRefreshTimestamp);
            }
        }
    } else {
        if (!hasReportingPermission){
            await bot.sendMessage(msg.chat.id, `You do not have reporting permission.`);
            return;
        }   
    }

    try {
        const inviteURL = await getInviteURL('telegram', String(msg.chat.id));
        const inviteURLBackup = inviteURL? inviteURL: await bot.exportChatInviteLink(msg.chat.id);
        const evidencepath = await upload(bot, msg, group.address);
        const privateMsgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + String(msg.reply_to_message.message_id);
        const publicMsgLink = inviteURL + '/' + String(msg.reply_to_message.message_id);
        const msgLink = (!inviteURL || inviteURL == '')? privateMsgLink : publicMsgLink;
        const msgBackup = 'ipfs.kleros.io'+evidencepath;
        const {questionId, questionUrl: appealUrl} = await reportUser(
            !permissionless, 
            fromUsername, 
            reportedUserID, 
            'Telegram',
            msg.chat.title,
            inviteURLBackup, 
            String(msg.chat.id), 
            rules, 
            msgLink, 
            msgBackup, 
            privateKey);

        try {
            await submitEvidence(evidencepath[0], questionId, privateKey);
        } catch (e) {
            // let addEvidence fail, the question was created anyway
            console.log(e);

            await bot.sendMessage(msg.chat.id, `An unexpected error has occurred while adding the evidence: ${e.message}. Does the bot address has enough funds to pay the transaction?`);
        }

        await addReport(questionId, 'telegram', String(msg.chat.id), String(msg.reply_to_message.from.id), String(msg.reply_to_message.message_id), (hasReportingPermission && !permissionless));
        console.log('reportAdded');
        await bot.sendMessage(msg.chat.id, `*${fromUsername}  (ID :${reportedUserID}) *'s conduct due to this [message](${privateMsgLink}) is reported for breaking the [rules](${rules}).\n\nDid *${fromUsername}* break the rules? The [question](${appealUrl}) can be answered with a minimum bond of 5 DAI.`, {parse_mode: 'Markdown'});
    } catch (e) {
        console.log(e);

        await bot.sendMessage(msg.chat.id, `An unexpected error has occurred: ${e.reason}. Does the bot address has enough funds to pay the transaction?`);
        return;
    }
}

export {regexp, callback};