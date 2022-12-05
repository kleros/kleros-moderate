import * as TelegramBot from "node-telegram-bot-api";
const escape = require('markdown-escape')
import langJson from "../assets/lang.json";
import {getDisputedReportsUserInfo ,getDisputedReportsInfo} from "../../db";
import { groupSettings } from "../../../types";
/*
 * /getaccount
 */
const regexp = /\/getreports/

const callback = async (db: any, settings: groupSettings, bot: any, botid: number, msg: any) => {
    try{
        if(msg.reply_to_message){
            const reports = getDisputedReportsUserInfo(db, 'telegram', String(msg.chat.id), String(msg.reply_to_message.from.id));
            const fromUsername = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || `no-username-set`);
            if (reports.length == 0){
                bot.sendMessage(msg.chat.id, `${langJson[settings.lang].getReports.noReports} *${escape(fromUsername)}*.`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"}:{parse_mode: "Markdown"});
                return;
            }
            var reportMessage: string = `${langJson[settings.lang].getReports.ReportsFor} ${escape(fromUsername)}:\n\n`;
            reports.forEach( (report) => {
                console.log(report)
                const reportAnswer = report.active? langJson[settings.lang].getReports.broke : langJson[settings.lang].getReports.nobreak;
                const MsgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + report.msg_id;
                const msgTime = new Date(report.timestamp*1000).toDateString();
                const msgTimehours = new Date(report.timestamp*1000).toUTCString();
                const reportState = report.finalized? langJson[settings.lang].getReports.reportFinal : langJson[settings.lang].getReports.reportCurrent;
                if (report.active_timestamp === 0)
                    reportMessage += ` - [${langJson[settings.lang].getReports.reportMessage3}](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${report.question_id}), [${langJson[settings.lang].addevidence.MessageSent}](${MsgLink}) ${msgTime}, ${msgTimehours} ([${langJson[settings.lang].socialConsensus.consensus5}](${report.msgBackup})), ${reportState} ${langJson[settings.lang].answer}, ${reportAnswer}, \`/addevidence ${report.evidenceIndex}\`\n`;
                else
                reportMessage += ` - [${langJson[settings.lang].getReports.reportMessage3}](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${report.question_id}), [${langJson[settings.lang].addevidence.MessageSent}](${MsgLink}) ${msgTime}, ${msgTimehours} ([${langJson[settings.lang].socialConsensus.consensus5}](${report.msgBackup})), unanswered, \`/addevidence ${report.evidenceIndex}\`\n`;

            });
            bot.sendMessage(msg.chat.id, reportMessage , msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown", disable_web_page_preview: true}:{parse_mode: "Markdown", disable_web_page_preview: true});
            return;
        } else {
            const reports = getDisputedReportsInfo(db, 'telegram', String(msg.chat.id));
            if (reports.length == 0){
                bot.sendMessage(msg.chat.id, langJson[settings.lang].getReports.noActiveReports + '\n\n' + langJson[settings.lang].getReports.specificUser, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"}:{parse_mode: "Markdown"});
                return;
            }
            var reportMessage: string = langJson[settings.lang].getReports.reportMessage + ':\n\n';
        
            await reports.forEach(async (report) => {
                const reportAnswer = report.active? langJson[settings.lang].getReports.broke : langJson[settings.lang].getReports.nobreak
                const MsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
                const msgTime = new Date(report.timestamp*1000).toISOString();
                reportMessage += ` - ${report.username} ${langJson[settings.lang].getReports.reportMessage1} [${msgTime.substring(0,msgTime.length-4)}](${MsgLink}) ([${langJson[settings.lang].getReports.reportMessage2}](${report.msgBackup})): [${langJson[settings.lang].getReports.reportMessage3}](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${report.question_id}), ${langJson[settings.lang].getReports.reportMessage4}, ${reportAnswer}\n`;
            });
            reportMessage += '\n\n'
            reportMessage += langJson[settings.lang].getReports.specificUser;
            bot.sendMessage(msg.chat.id, reportMessage, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown", disable_web_page_preview: true}:{parse_mode: "Markdown", disable_web_page_preview: true});
        }
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};