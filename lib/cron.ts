require('dotenv').config()
const ModeratorBot = require('node-telegram-bot-api');
import * as TelegramBot from "node-telegram-bot-api";
import {getFinalRecord, getCurrentRecord, setReportArbitration, getDisputedReports, setReport} from "./db";
//import {getModerateBilling} from "./ethers";
import request from "graphql-request";
import {BigNumber} from "ethers";


(async ()=> {
    const bot: TelegramBot = new ModeratorBot(process.env.BOT_TOKEN, {polling: false});  
    //const moderateBilling = getModerateBilling(process.env.MODERATE_BILLING, '1111111111111111111111111111111111111111111111111111111111111111');

    const reports = {};

    (await getDisputedReports()).forEach((report) => {
        reports[report.question_id] = report;
    });

    const query = `{
        questions(
          where: { 
              id_in: ${JSON.stringify(Object.keys(reports))},
              answer_not: null
          }
        ) {
          id
          answer
          finalize_ts
          arbitrationRequested
          disputeId
          ruling
        }
      }`;
    const result = await request(
        'https://api.thegraph.com/subgraphs/name/shotaronowhere/kleros-moderator-bot',
        query
    )
    for (const question of result.questions) {
        const answer = BigNumber.from(question.answer);

        if (!answer.eq(0) && !answer.eq(1)) {
            // "Invalid" or "Answered too soon"
            // TODO: what should we do?
            continue;
        }

        const report = reports[question.id];
        const reportHistory = await getFinalRecord(report.platform, report.group_id, report.user_id);
        const finalized = question.finalize_ts <= Math.ceil(+new Date() / 1000) + 300; // 300 buffer for graph syncing and finality
        const chatMember = await bot.getChatMember(report.group_id, report.user_id);
        const fromUsername = (chatMember.user.username || chatMember.user.first_name) + ' ID: ' + chatMember.user.id;
        if(question.arbitrationRequested === true){
            if(report.arbitrationRequested != true){
                await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: true});
                await bot.sendMessage(report.group_id, `Arbitration is requested. *${fromUsername}* is un-banned for the duration of the [dispute](https://court.kleros.io/cases/${BigNumber.from(question.disputeId).toNumber()}) (on Gnosis Chain).`, {parse_mode: 'Markdown'}); 
                await setReportArbitration(question.id, 0);
            } else if (question.ruling != null){
                const msgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
                if (question.ruling == 1){ // check rulings
                    await bot.sendMessage(report.group_id, `The dispute over *${fromUsername}*'s [message](${msgLink}) resolved.`, {parse_mode: 'Markdown'});
                    handleFinalizedTelegram(bot, fromUsername, report, question, 1, reportHistory);
                } 
                else if (question.ruling == 0){
                    await bot.sendMessage(report.group_id, `The dispute over *${fromUsername}*'s [message](${msgLink}) resolved.`, {parse_mode: 'Markdown'});
                    handleFinalizedTelegram(bot, fromUsername, report, question, 0, reportHistory);
                }
            }
            continue;
        }

        // only final records considered for now.
        const latestReportState = answer.toNumber();

        if (finalized){
            if (report.platform === 'telegram') {
                await bot.sendMessage(report.group_id, `The report on Reality is finalized.`, {parse_mode: 'Markdown'}); 
                const latestReportState = answer.toNumber();
                handleFinalizedTelegram(bot, fromUsername, report, question, latestReportState, reportHistory);
            } else {
                console.error(`Invalid platform: ${report.platform}`);
            }
        } else if (latestReportState !== report.active) {
            const appealUrl = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${question.id}\n`;
            if (latestReportState === 1) {
                // ban
                if (report.platform === 'telegram') {
                    // @ts-ignore
                    await bot.sendMessage(report.group_id, `The report on Reality is answered. *${fromUsername}* violated the rules. The answer can be [appealed](${appealUrl}).`, {parse_mode: 'Markdown'});
                    var penaltyDuration: number = 0;
                    switch(reportHistory){
                        case 0:{
                            penaltyDuration = 86400;
                            const paroleDate = Math.ceil(+new Date() / 1000) + 86400;
                            await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: false, until_date: paroleDate});
                            await bot.sendMessage(report.group_id, `*${fromUsername}* is subject to a 24 hour ban.`, {parse_mode: 'Markdown'});
                            break;
                        }
                        case 1:{
                            penaltyDuration = 604800;
                            const paroleDate = Math.ceil(+new Date() / 1000) + 604800;
                            await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: false, until_date: paroleDate});
                            await bot.sendMessage(report.group_id, `*${fromUsername}* is subject to a 7 day ban.`, {parse_mode: 'Markdown'});
                            break;
                        }
                        default:{
                            await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: false});
                            await bot.sendMessage(report.group_id, `*${fromUsername}* is banned.`, {parse_mode: 'Markdown'});
                            break;
                        }
                    }
                    await setReport(question.id, true, finalized,  Math.ceil(+new Date() / 1000), 0, penaltyDuration);
                } else {
                    console.error(`Invalid platform: ${report.platform}`);
                }
            } else {
                // unban

                if (report.platform === 'telegram') {
                    // @ts-ignore
                    const paroleDateOld = (await bot.getChatMember(report.group_id, report.user_id)).until_date;
                    const paroleDateNew = paroleDateOld - report.penaltyDuration;
                    await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: false, until_date: paroleDateNew});
                    await bot.sendMessage(report.group_id, `The report on Reality is answered. *${fromUsername}* did not violated the rules. The answer can be [appealed](${appealUrl}).`, {parse_mode: 'Markdown'});
                    await bot.sendMessage(report.group_id, `Any ban of *${fromUsername}* is removed.`, {parse_mode: 'Markdown'});
                } else {
                    console.error(`Invalid platform: ${report.platform}`);
                }
                await setReport(question.id, false, finalized, Math.floor(Date.now()/1000), 0, 0);

            }
        }
    }
})()


const handleFinalizedTelegram = async (bot: TelegramBot, fromUsername: string, report: any, question: any, latestReportState: number, reportHistory: number) => {
    await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: true}); // reset temporary mute
    if (latestReportState === 1){
        const activeTimestamp = latestReportState === report.active ? report.activeTimestamp : Math.ceil(+new Date() / 1000);
        switch(reportHistory){
            case 0:{
                await bot.sendMessage(report.group_id, `*${fromUsername}* violated the rules for the first time and is subject to a 1 day ban.`, {parse_mode: 'Markdown'}); 
                const paroleDate = Math.ceil(+new Date() / 1000) + 86400;
                await bot.banChatMember(report.group_id, report.user_id, {until_date: paroleDate});
                await setReport(question.id, true, true, activeTimestamp, 0, 86400);
                break;
            }
            case 1:{
                await bot.sendMessage(report.group_id, `*${fromUsername}* violated the rules for the second time and is subject to a 1 week ban.`, {parse_mode: 'Markdown'}); 
                const paroleDate = Math.ceil(+new Date() / 1000) + 604800;
                await bot.banChatMember(report.group_id, report.user_id, {until_date: paroleDate});
                await setReport(question.id, true, true, activeTimestamp, 0, 604800);
                break;
            }
            default:{
                await bot.sendMessage(report.group_id, `*${fromUsername}* violated the rules for the third time and is subject to a permanent ban.`, {parse_mode: 'Markdown'}); 
                await bot.banChatMember(report.group_id, report.user_id);
                await setReport(question.id, true, true, activeTimestamp, 0, 0);
                break;
            }
        }
    }
    else{
        await bot.sendMessage(report.group_id, `*${fromUsername}* did not violated the rules.`, {parse_mode: 'Markdown'});
        await setReport(question.id, false, true, report.activeTimestamp, 0, 0);
    }
}
