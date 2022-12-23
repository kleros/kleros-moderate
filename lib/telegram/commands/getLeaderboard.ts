import * as TelegramBot from "node-telegram-bot-api";
const escape = require('markdown-escape')
import langJson from "../assets/lang.json";
import {getLeaderboard} from "../../graph";
import { groupSettings } from "../../../types";
/*
 * /getaccount
 */
const regexp = /\/leaderboard/

/*

(sheriffs)

good samartian (>2/3 answered yes, >10 reports)
- perks: report as many as long as yes>total
- evidence 5*report limit

neighborhood watch (>1/3 answered yes > 3 reports)
- perks: 6 reports per day
- 30 pieces of evidence

community member (neutral)
- 3 reports per day
- 15 pieces of evidence

boy who cried wolf (>2/3 answered !yes, >10 reports)
- 1 report per day
- 5 pieces of evidence

*/

const callback = async (db: any, settings: groupSettings, bot: any, botid: number, msg: any) => {
    try{
        const reports = await getLeaderboard(msg.chat.id, String(botid));
        if (reports.length == 0){
            bot.sendMessage(msg.chat.id, "No active leaderboard", msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"}:{parse_mode: "Markdown"});
            return;
        }
        var reportMessage: string = langJson[settings.lang].getReports.reportMessage + ':\n\n';
    
        await reports.forEach(async (report) => {
            
            reportMessage += ` - ${report.status} ${report.countReportsMadeAndRespondedYes} ${report.user.userID}\n`;
        });
        bot.sendMessage(msg.chat.id, reportMessage, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown", disable_web_page_preview: true}:{parse_mode: "Markdown", disable_web_page_preview: true});
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};