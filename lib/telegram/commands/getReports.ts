import * as TelegramBot from "node-telegram-bot-api";
const escape = require('markdown-escape')
import langJson from "../assets/lang.json";
import {getReportsUserInfo ,getActiveReportsInfo,getReportsUserInfoFederation, getInviteURL,getLocalBanHistory, getFederatedBanHistory, getFederatedFollowingBanHistory, getTitle} from "../../db";
import { groupSettings } from "../../../types";
import {calcPenalty} from "../../cron"
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;
var myQueue;
myCache.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });
/*
 * /getreports
 */
const regexp = /\/info/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botid: number, msg: any) => {
    if (!myBot)
        myBot = bot
    if (!myQueue)
        myQueue = queue
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
                            url: `https://t.me/${process.env.BOT_USERNAME}?start=getreport${msg.chat.id}${(msg.reply_to_message && !msg.reply_to_message.forum_topic_created)? msg.reply_to_message.from.id: ''}${(settings.federation_id ?? settings.federation_id_following + 'following') ?? ''}`
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
                            url: `https://t.me/${process.env.BOT_USERNAME}?start=getreport${msg.chat.id}${(msg.reply_to_message && !msg.reply_to_message.forum_topic_created)? msg.reply_to_message.from.id: ''}${(settings.federation_id ?? settings.federation_id_following) ?? ''}`
                        }
                    ]
                    ]
                }
            }
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `DM me for report info : )`, opts)
            return val}catch{}});       
            if(!resp)
            return
            myCache.set(resp?.message_id, msg.chat.id) 
            return;
        }

        let group_id: string;
        let user_id: string;
        let federation_id: string;
        
        if(msg.text.length > 45){
            group_id = msg.text.substring(16,30)
            user_id = msg.text.substring(30,40)
            federation_id = msg.text.substring(40)
        } else if (msg.text.length > 16){
            group_id = msg.text.substring(16,30)
        } else
            return;
        
        if(user_id){
            const banHistory = federation_id? (msg.text.length > 55 ? getFederatedFollowingBanHistory(db,'telegram',user_id,group_id,federation_id,false) : getFederatedBanHistory(db, 'telegram',user_id,federation_id,false)): getLocalBanHistory(db,'telegram',user_id,group_id,false)
            const reports = getReportsUserInfo(db, 'telegram', group_id, user_id);
            const user = await queue.add(async () => {try{const val = await bot.getChatMember(group_id, user_id)
                return val}catch{}})
            if(!user)
            return
            const fromUsername = (user.user.username || user.user.first_name || `no-username-set`);
            const ban_level = banHistory.length
            var reportMessage: string = ""
            var max_timestamp = 0
            for (const ban of banHistory){
                if (ban.timestamp_active > max_timestamp)
                    max_timestamp = ban.timestamp_active
                else if (ban.timestamp_finalized > max_timestamp)
                    max_timestamp = ban.timestamp_finalized
            }

            if (ban_level > 0){
                const date_lastreport = new Date(banHistory[ban_level-1].timestamp*1000).toUTCString()
                const date_parole = new Date(1000*calcPenalty(ban_level, max_timestamp)).toUTCString()
                reportMessage += `*${escape(fromUsername)}* broke the rules atleast ${ban_level} time(s), and is banned until ${date_parole}.\n\n`
            }
            reportMessage += `*${langJson[settings.lang].getReports.ReportsFor} ${escape(fromUsername)}*:\n\n`;
            if (reports.length === 0){
                reportMessage += `${langJson[settings.lang].getReports.noReports}.\n`
            }
            reports.forEach( report => {
                const reportAnswer = report.answered? (report.active? langJson[settings.lang].getReports.broke : langJson[settings.lang].getReports.nobreak) : 'unanswered';
                const MsgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + report.msg_id;
                const msgTimehours = new Date(report.timestamp_msg*1000).toUTCString();
                const reportState = report.finalized? langJson[settings.lang].getReports.reportFinal : langJson[settings.lang].getReports.reportCurrent;
                reportMessage += ` - [${langJson[settings.lang].getReports.reportMessage3}](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${report.question_id}), [Message](${MsgLink}), Sent ${msgTimehours.substring(0,12)}([${langJson[settings.lang].socialConsensus.consensus5}](${report.msgBackup})), ${reportState} ${langJson[settings.lang].answer}, ${reportAnswer}${report.finalized? ".":`, \`/evidence ${report.evidenceIndex}\`.`}\n`;
            });
            if(federation_id){
                const reportsFederation = getReportsUserInfoFederation(db, 'telegram', user_id, federation_id,group_id);
                reportMessage += `\n*Federal reports for ${escape(fromUsername)}*:\n\n`
                if (reportsFederation.length == 0){
                    reportMessage += `${langJson[settings.lang].getReports.noReports}.\n`
                }
                for(const report of reportsFederation) {
                    // TODO getTitle
                    const chatname = (await queue.add(async () => {try{const val = await bot.getChat(report.group_id)
                    return val}catch{}}))?.title
                    const invite_url = getInviteURL(db,'telegram',report.group_id)
                    const reportAnswer = report.answered? (report.active? langJson[settings.lang].getReports.broke : langJson[settings.lang].getReports.nobreak) : 'unanswered';
                    const MsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
                    const msgTimehours = new Date(report.timestamp_msg*1000).toUTCString();
                    const reportState = report.finalized? langJson[settings.lang].getReports.reportFinal : langJson[settings.lang].getReports.reportCurrent;
                    reportMessage += ` - [${langJson[settings.lang].getReports.reportMessage3}](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${report.question_id}), [message](${MsgLink}), sent in [${chatname}](${invite_url}), at ${msgTimehours.substring(0,12)}([${langJson[settings.lang].socialConsensus.consensus5}](${report.msgBackup})), ${reportState} ${langJson[settings.lang].answer}, ${reportAnswer}\n`;                }
            }
            queue.add(async () => {try{await bot.sendMessage(msg.chat.id, reportMessage , msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown", disable_web_page_preview: true}:{parse_mode: "Markdown", disable_web_page_preview: true})}catch{}});
            return;
        } else {
            const reports = getActiveReportsInfo(db, 'telegram', group_id);
            if (reports.length == 0){
                queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[settings.lang].getReports.noActiveReports + '\n\n' + langJson[settings.lang].getReports.specificUser, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"}:{parse_mode: "Markdown"})}catch{}});
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
            queue.add(async () => {try{await bot.sendMessage(msg.chat.id, reportMessage, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown", disable_web_page_preview: true}:{parse_mode: "Markdown", disable_web_page_preview: true})}catch{}});
        }
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};