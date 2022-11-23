import * as TelegramBot from "node-telegram-bot-api";
const escape = require('markdown-escape')
import langJson from "../assets/lang.json";
import {getDisputedReportsUserInfo } from "../../db";
/*
 * /getaccount
 */
const regexp = /\/getreports/

const callback = async (db: any, lang: string, bot: any, msg: any) => {
    try{
        if(msg.reply_to_message){
            const reports = await getDisputedReportsUserInfo(db, 'telegram', String(msg.chat.id), String(msg.reply_to_message.from.id));
            const fromUsername = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || `no-username-set`);
            if (reports.length == 0){
                bot.sendMessage(msg.chat.id, `${langJson[lang].getReports.noReports} *${escape(fromUsername)}*.`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"}:{parse_mode: "Markdown"});
                return;
            }
            var reportMessage: string = `${langJson[lang].getReports.ReportsFor} ${escape(fromUsername)}:\n\n`;
            await reports.forEach(async (report) => {
                const reportAnswer = report.active? langJson[lang].getReports.broke : langJson[lang].getReports.nobreak;
                const MsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
                const msgTime = new Date(report.timestamp*1000).toISOString();
                const reportState = report.finalized? langJson[lang].getReports.reportFinal : langJson[lang].getReports.reportCurrent;
                reportMessage += ` - [${langJson[lang].getReports.report}](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${report.question_id}), ${langJson[lang].addEvidence.Evidence} ID ${report.evidenceIndex}, [${langJson[lang].addEvidence.MessageSent} ${msgTime.substring(0,msgTime.length-4)}](${MsgLink}) ([${langJson[lang].socialConsensus.consensus5}](${report.msgBackup})), ${reportState} ${langJson[lang].answer}, ${reportAnswer}\n`;
            });
            bot.sendMessage(msg.chat.id, reportMessage , msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown", disable_web_page_preview: true}:{parse_mode: "Markdown", disable_web_page_preview: true});
            return;
        } else {
            bot.sendMessage(msg.chat.id, "Please reply to a user to find their history", msg.chat.is_forum? {message_thread_id: msg.message_thread_id}:{})
        }
    } catch(e){
        console.log(e)
    }
/*
    const reports = getDisputedReportsInfo(db, 'telegram', String(msg.chat.id));
    if (reports.length == 0){
        bot.sendMessage(msg.chat.id, langJson[lang].getReports.noActiveReports + '\n\n' + langJson[lang].getReports.specificUser, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"}:{parse_mode: "Markdown"});
        return;
    }*/
/*
    var reportMessage: string = langJson[lang].getReports.reportMessage + ':\n\n';

    await reports.forEach(async (report) => {
        const reportAnswer = report.active? langJson[lang].getReports.broke : langJson[lang].getReports.nobreak
        const MsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
        const msgTime = new Date(report.timestamp*1000).toISOString();
        reportMessage += ` - ${report.username} ${langJson[lang].getReports.reportMessage1} [${msgTime.substring(0,msgTime.length-4)}](${MsgLink}) ([${langJson[lang].getReports.reportMessage2}](${report.msgBackup})): [${langJson[lang].getReports.reportMessage3}](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${report.question_id}), ${langJson[lang].getReports.reportMessage4}, ${reportAnswer}\n`;
    });
    reportMessage += '\n\n'
    reportMessage += langJson[lang].getReports.specificUser;
    bot.sendMessage(msg.chat.id, reportMessage, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown", disable_web_page_preview: true}:{parse_mode: "Markdown", disable_web_page_preview: true});
    */
}

export {regexp, callback};