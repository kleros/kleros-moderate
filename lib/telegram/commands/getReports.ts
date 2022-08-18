import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getDisputedReportsInfo} from "../../db";

/*
 * /getaccount
 */
const regexp = /\/getreports/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {

    const reports = await getDisputedReportsInfo('telegram', String(msg.chat.id));
    if (reports.length == 0){
        await bot.sendMessage(msg.chat.id, 'There are no active reports.');
        return;
    }

    var reportMessage: string = 'Active Reports:\n\n';

    await reports.forEach(async (report) => {
        console.log(report.active);
        const reportAnswer = report.active? 'broke the rules.' : 'did not break the rules.'
        const MsgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
        const msgTime = new Date(report.timestamp*1000).toISOString();
        reportMessage += ` - ${report.username} reported for message sent [${msgTime.substring(0,msgTime.length-4)}](${MsgLink}): [Report](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${report.question_id}), current answer, ${reportAnswer}\n`;
    });

    await bot.sendMessage(msg.chat.id, reportMessage, {parse_mode: "Markdown"});
    
}

export {regexp, callback};