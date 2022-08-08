import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {addReport, getGroup, getInviteURL, getRules, getConcurrentReports} from "../../db";
import {uploadEvidence, submitEvidence} from "./addEvidence"
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

    if (!hasReportingPermission){
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
        await bot.sendMessage(msg.chat.id, `The Moderator Bot needs to have the "can_restrict_members" permission to be able to ban users.`);
        return;
    }

    const fromUsername = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || `no-username-set`);
    const reportedUserID = String(msg.reply_to_message.from.id);
    const reports = await getConcurrentReports(reportedUserID, msg.reply_to_message.date);

    if (reports.length > 0 && match[1] != 'confirm') {
        var reportInfo = `Are you sure the user ${fromUsername}(ID :${reportedUserID}) has not already been reported for this behavior? Note that any subsequent reports for the same behavior will result in lost deposits. The following lists the user's reported messages within a 24 hour time window of the message you reported\n`;
        (reports).forEach((report) => {
            reportInfo += `https://reality.eth.limo/app/#!/network/100/question/${process.env.REALITITY_ETH_V30}-${report.question_id}\n`;
        });
        reportInfo += `If you are sure, report the message again followed by \'confirm\' e.g. /report confirm`
        await bot.sendMessage(msg.chat.id, reportInfo);
        return;
    } 

    const rules = await getRules('telegram', String(msg.chat.id));

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
    try {
        const inviteURL = await getInviteURL(String(msg.chat.id), 'telegram');
        const inviteURLBackup = inviteURL? inviteURL: await bot.exportChatInviteLink(msg.chat.id);
        const evidencepath = await uploadEvidence(msg, group.address);
        const msgLink = inviteURL + '/' + msg.reply_to_message.message_id;
        const msgBackup = 'ipfs.kleros.io'+evidencepath[1];
        const {questionId, questionUrl: appealUrl} = await reportUser(
            hasReportingPermission, 
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

        await addReport(questionId, msg.reply_to_message.date, 'telegram', String(msg.chat.id), String(msg.reply_to_message.from.id), hasReportingPermission);

        if (hasReportingPermission) {
            // the user gets notified and it is explained to them how to appeal.
            await bot.sendMessage(msg.chat.id, `*${fromUsername}* you have been banned, you can appeal here: ${appealUrl}
            
            To add evidence to the case, reply to a message with ther addevidence command followed by the questionID ${questionId}. This command ensure that messages, if deleted persist. In case messages have already been deleted, please gather witnesses from this group to make a public statement about the deleted messages in this chat.
            `, {parse_mode: 'Markdown'});

            // @ts-ignore
            //await bot.banChatMember(msg.chat.id, String(msg.reply_to_message.from.id), {revoke_messages: false});
            await bot.restrictChatMember(msg.chat.id, String(msg.reply_to_message.from.id), {can_send_messages: false});
        } else {
            // the user first needs to answer and provide a bond
            await bot.sendMessage(msg.chat.id, `For the report to be applied you need to provide an answer with a bond of 1 DAI: ${appealUrl}`, {parse_mode: 'Markdown'});
        }
    } catch (e) {
        console.log(e);

        await bot.sendMessage(msg.chat.id, `An unexpected error has occurred: ${e.reason}. Does the bot address has enough funds to pay the transaction?`);
        return;
    }
}

export {regexp, callback};