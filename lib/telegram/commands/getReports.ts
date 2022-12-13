import * as TelegramBot from "node-telegram-bot-api";
const escape = require('markdown-escape')
import langJson from "../assets/lang.json";
import {getReportsUserInfo ,getActiveReportsInfo} from "../../db";
import { groupSettings } from "../../../types";
/*
 * /getaccount
 */
const regexp = /\/getreports/

const callback = async (db: any, settings: groupSettings, bot: any, botid: number, msg: any) => {
    try{
        if (msg.chat.type !== "private"){
            const opts = msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                    [
                        {
                            text: 'Get Report Info',
                            url: `https://t.me/${process.env.BOT_USERNAME}?start=getreport${msg.chat.id}${(msg.reply_to_message && !msg.reply_to_message.forum_topic_created)? msg.reply_to_message.from.id: ''}`
                        }
                    ]
                    ]
                }
            }: {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                    [
                        {
                            text: 'Get Report Info',
                            url: `https://t.me/${process.env.BOT_USERNAME}?start=getreport${msg.chat.id}${(msg.reply_to_message && !msg.reply_to_message.forum_topic_created)? msg.reply_to_message.from.id: ''}`
                        }
                    ]
                    ]
                }
            }
            bot.sendMessage(msg.chat.id, `DM me for report info : )`, opts);        
            return;
        }

        let group_id: string;
        let user_id: string
        if(msg.text.length > 35){
            group_id = msg.text.substring(16,30)
            user_id = msg.text.substring(30)
        } else if (msg.text.length > 16){
            group_id = msg.text.substring(16,30)

        } else
            return;

        if(user_id){
            const reports = getReportsUserInfo(db, 'telegram', group_id, user_id);
            const user = await bot.getChatMember(group_id, user_id)
            const fromUsername = (user.user.username || user.user.first_name || `no-username-set`);
            if (reports.length == 0){
                bot.sendMessage(msg.chat.id, `${langJson[settings.lang].getReports.noReports} *${escape(fromUsername)}*.`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"}:{parse_mode: "Markdown"});
                return;
            }
            var reportMessage: string = `${langJson[settings.lang].getReports.ReportsFor} ${escape(fromUsername)}:\n\n`;
            reports.forEach( (report) => {
                console.log(report)
                const reportAnswer = report.answered? (report.active? langJson[settings.lang].getReports.broke : langJson[settings.lang].getReports.nobreak) : 'unanswered';
                const MsgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + report.msg_id;
                const msgTime = new Date(report.timestamp_msg*1000).toDateString();
                const msgTimehours = new Date(report.timestamp_msg*1000).toUTCString();
                const reportState = report.finalized? langJson[settings.lang].getReports.reportFinal : langJson[settings.lang].getReports.reportCurrent;
                reportMessage += ` - [${langJson[settings.lang].getReports.reportMessage3}](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${report.question_id}), [${langJson[settings.lang].addevidence.MessageSent}](${MsgLink}) ${msgTime}, ${msgTimehours} ([${langJson[settings.lang].socialConsensus.consensus5}](${report.msgBackup})), ${reportState} ${langJson[settings.lang].answer}, ${reportAnswer}, \`/addevidence ${report.evidenceIndex}\`\n`;
            });
            bot.sendMessage(msg.chat.id, reportMessage , msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown", disable_web_page_preview: true}:{parse_mode: "Markdown", disable_web_page_preview: true});
            return;
        } else {
            const reports = getActiveReportsInfo(db, 'telegram', group_id);
            if (reports.length == 0){
                bot.sendMessage(msg.chat.id, langJson[settings.lang].getReports.noActiveReports + '\n\n' + langJson[settings.lang].getReports.specificUser, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"}:{parse_mode: "Markdown"});
                return;
            }
            var reportMessage: string = langJson[settings.lang].getReports.reportMessage + ':\n\n';
        
            await reports.forEach(async (report) => {
                const reportAnswer = report.active? langJson[settings.lang].getReports.broke : langJson[settings.lang].getReports.nobreak
                const MsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
                const msgTime = new Date(report.timestamp_msg*1000).toISOString();
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