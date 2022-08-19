require('dotenv').config()
const ModeratorBot = require('node-telegram-bot-api');
//import * as TelegramBot from "node-telegram-bot-api";
import {getFinalRecord, getCurrentRecord, setReportArbitration, getDisputedReports, setReport} from "./db";
//import {getModerateBilling} from "./ethers";
import request from "graphql-request";
import {BigNumber} from "ethers";


(async ()=> {
    const defaultRules = 'https://ipfs.kleros.io/ipfs/QmeYuhtdsbyrpYa3tsRFTb92jcvUJNb2CJ2NdLE5fsRyAX/Kleros%20Moderate%20Community%20Guideline.pdf';
    const bot = new ModeratorBot(process.env.BOT_TOKEN, {polling: false});  
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
    console.log(result);
    for (const question of result.questions) {
        const answer = BigNumber.from(question.answer);

        if (!answer.eq(0) && !answer.eq(1)) {
            // "Invalid" or "Answered too soon"
            // TODO: what should we do?
            continue;
        }

        const report = reports[question.id];
        console.log(await getCurrentRecord(report.platform, report.group_id, report.user_id));
        console.log(report);
        const reportHistoryFinal = await getFinalRecord(report.platform, report.group_id, report.user_id);
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
                    handleFinalizedTelegram(bot, fromUsername, report, question, 1, reportHistoryFinal);
                } 
                else if (question.ruling == 0){
                    await bot.sendMessage(report.group_id, `The dispute over *${fromUsername}*'s [message](${msgLink}) resolved.`, {parse_mode: 'Markdown'});
                    handleFinalizedTelegram(bot, fromUsername, report, question, 0, reportHistoryFinal);
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
                handleFinalizedTelegram(bot, fromUsername, report, question, latestReportState, reportHistoryFinal);
            } else {
                console.error(`Invalid platform: ${report.platform}`);
            }
        } else if (latestReportState !== report.active) {

            const appealUrl = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${question.id}\n`;
            if (latestReportState === 1) {
                // ban
                const reportHistoryCurrent = reportHistoryFinal + await getCurrentRecord(report.platform, report.group_id, report.user_id);
                await setReport(question.id, true, finalized,  Math.ceil(+new Date() / 1000), 0);
                console.log('current history count: '+reportHistoryCurrent);
                if (report.platform === 'telegram') {
                    // @ts-ignore
                    const msgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
                    await bot.sendMessage(report.group_id, `The question: \"Did *${fromUsername}*'s conduct due to this [message](${msgLink}) violate the [rules](${defaultRules})\" is answered with Yes. Do you think the answer is wrong? Please help [correct](${appealUrl}) the answer.`, {parse_mode: 'Markdown'});
                    switch(reportHistoryCurrent){
                        case 0:{
                            const paroleDate = Math.ceil(+new Date() / 1000) + 86400;
                            await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: false, until_date: paroleDate});
                            await bot.sendMessage(report.group_id, `*${fromUsername}* is subject to a 24 hour ban.`, {parse_mode: 'Markdown'});
                            break;
                        }
                        case 1:{
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
                } else {
                    console.error(`Invalid platform: ${report.platform}`);
                }
            } else {
                // unban
                await setReport(question.id, false, finalized, Math.floor(Date.now()/1000), 0);
                const reportHistoryCurrent = reportHistoryFinal + await getCurrentRecord(report.platform, report.group_id, report.user_id);

                if (report.platform === 'telegram') {
                    // @ts-ignore
                    const msgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
                    await bot.sendMessage(report.group_id, `The question: \"Did *${fromUsername}*'s conduct due to this [message](${msgLink}) violate the [rules](${defaultRules})\" is answered with No. Do you think the answer on is wrong? Please help [correct](${appealUrl}) the answer.`, {parse_mode: 'Markdown'});
                    switch(reportHistoryCurrent){
                        case 0:{
                            await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: true});
                            await bot.sendMessage(report.group_id, `All bans are lifted from *${fromUsername}*.`, {parse_mode: 'Markdown'});
                            break;
                        }
                        case 1:{
                            const paroleDate = Math.ceil(+new Date() / 1000) + 86400;
                            await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: false, until_date: paroleDate});
                            await bot.sendMessage(report.group_id, `The ban on *${fromUsername}* is lifted to 24 hours.`, {parse_mode: 'Markdown'});
                            break;
                        }
                        case 2:{
                            const paroleDate = Math.ceil(+new Date() / 1000) + 604800;
                            await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: false, until_date: paroleDate});
                            await bot.sendMessage(report.group_id, `The ban on *${fromUsername}* is lifted to 7 days.`, {parse_mode: 'Markdown'});
                            break;
                        }
                        default:{
                            await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: false});
                            await bot.sendMessage(report.group_id, `*${fromUsername}* is banned.`, {parse_mode: 'Markdown'});
                            break;
                        }
                    }
                } else {
                    console.error(`Invalid platform: ${report.platform}`);
                }
            }
        }
    }
})()


const handleFinalizedTelegram = async (bot: any, fromUsername: string, report: any, question: any, latestReportState: number, reportHistory: number) => {
    const msgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
    const defaultRules = 'https://ipfs.kleros.io/ipfs/QmeYuhtdsbyrpYa3tsRFTb92jcvUJNb2CJ2NdLE5fsRyAX/Kleros%20Moderate%20Community%20Guideline.pdf';
    await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: true}); // reset temporary mute
    if (latestReportState === 1){
        const activeTimestamp = latestReportState === report.active ? report.activeTimestamp : Math.ceil(+new Date() / 1000);
        switch(reportHistory){
            case 0:{
                await bot.sendMessage(report.group_id, `*${fromUsername}*'s conduct due to this [message](${msgLink}) violated the [rules](${defaultRules}) for the first time and is subject to a 1 day ban.`, {parse_mode: 'Markdown'}); 
                const paroleDate = Math.ceil(+new Date() / 1000) + 86400;
                await bot.banChatMember(report.group_id, report.user_id, {until_date: paroleDate});
                await setReport(question.id, true, true, activeTimestamp, 0);
                break;
            }
            case 1:{
                await bot.sendMessage(report.group_id, `*${fromUsername}*'s conduct due to this [message](${msgLink}) violated the [rules](${defaultRules}) for the second time and is subject to a 1 week ban.`, {parse_mode: 'Markdown'}); 
                const paroleDate = Math.ceil(+new Date() / 1000) + 604800;
                await bot.banChatMember(report.group_id, report.user_id, {until_date: paroleDate});
                await setReport(question.id, true, true, activeTimestamp, 0);
                break;
            }
            default:{
                await bot.sendMessage(report.group_id, `*${fromUsername}*'s conduct due to this [message](${msgLink}) violated the [rules](${defaultRules}) for the third time and is subject to a permanent ban.`, {parse_mode: 'Markdown'}); 
                await bot.banChatMember(report.group_id, report.user_id);
                await setReport(question.id, true, true, activeTimestamp, 0);
                break;
            }
        }
    }
    else{
        await bot.sendMessage(report.group_id, `*${fromUsername}*'s conduct due to this [message](${msgLink}) did not violate the [rules](${defaultRules}).`, {parse_mode: 'Markdown'});
        await setReport(question.id, false, true, report.activeTimestamp, 0);
    }
}
