import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getDisputedReportsInfo, getDisputedReportsUserInfo} from "../../db";

/*
 * /getaccount
 */
const regexp = /\/getreports/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {

    if(msg.reply_to_message){
        const reports = await getDisputedReportsUserInfo('telegram', String(msg.chat.id), String(msg.reply_to_message.from.id));
        const fromUsername = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || `no-username-set`);
        if (reports.length == 0){
            await bot.sendMessage(msg.chat.id, `No reports for user *${fromUsername}*.`, {parse_mode: "Markdown"});
            return;
        }
        var reportMessage: string = `Reports for ${fromUsername}:\n\n`;
        await reports.forEach(async (report) => {
            const reportAnswer = report.active? 'broke the rules.' : 'did not break the rules.';
            const MsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
            const msgTime = new Date(report.timestamp*1000).toISOString();
            const reportState = report.finalized? 'final' : 'current';
            reportMessage += ` - [Report](https://realityeth.github.io/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${report.question_id}), Evidence ID ${report.evidenceIndex}, [Message sent ${msgTime.substring(0,msgTime.length-4)}](${MsgLink}) ([backup](${report.msgBackup})), ${reportState} answer, ${reportAnswer}\n`;
        });
        await bot.sendMessage(msg.chat.id, reportMessage,  {parse_mode: "Markdown", disable_web_page_preview: true});
        return;
    }

    const reports = await getDisputedReportsInfo('telegram', String(msg.chat.id));
    if (reports.length == 0){
        await bot.sendMessage(msg.chat.id, 'There are no active answered reports.\n\nTo find all reports for a specific user, reply to their message with \'/getreports\'.');
        return;
    }

    var reportMessage: string = 'Active Answered Reports:\n\n';

    await reports.forEach(async (report) => {
        const reportAnswer = report.active? 'broke the rules.' : 'did not break the rules.'
        const MsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
        const msgTime = new Date(report.timestamp*1000).toISOString();
        reportMessage += ` - ${report.username} reported for message sent [${msgTime.substring(0,msgTime.length-4)}](${MsgLink}) ([backup](${report.msgBackup})): [Report](https://realityeth.github.io/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${report.question_id}), current answer, ${reportAnswer}\n`;
    });
    reportMessage += '\n\nTo find all reports for a specific user, reply to their message with \'/getreports\'.';
    await bot.sendMessage(msg.chat.id, reportMessage,  {parse_mode: "Markdown", disable_web_page_preview: true});
    
}

export {regexp, callback};