require('dotenv').config()
const ModeratorBot = require('node-telegram-bot-api');
import {getRecord, getDisputedReports, setReport} from "./db";
//import {getModerateBilling} from "./ethers";
import request from "graphql-request";
import {BigNumber} from "ethers";

(async ()=> {
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

        const latestReportState = answer.toNumber();

        const report = reports[question.id];
        const finalized = question.finalize_ts <= Math.ceil(+new Date() / 1000);

        const chatMember = await bot.getChatMember(report.app_group_id, report.app_user_id);
        const fromUsername = (chatMember.User.username || chatMember.Userfirst_name) + 'ID: ' + chatMember.User.id;
        const reportHistory = await getRecord(report.app_user_id);

        if (finalized){
            if (report.app_type === 'telegram') {
                await bot.restrictChatMember(report.app_group_id, report.app_user_id, {can_send_messages: true});
                if (latestReportState === 1){
                    const timeServed = latestReportState === report.active ? report.timeServed + Math.ceil(+new Date() / 1000) - report.activeTimestamp : report.timeServed;
                    const activeTimestamp = latestReportState === report.active ? report.activeTimestamp : Math.ceil(+new Date() / 1000);
                    switch(reportHistory){
                        case 0:{
                            await bot.sendMessage(report.app_group_id, `The report on Reality has finalized. *${fromUsername}* has violated the rules (/getrules) for the first time and is subject to a 1 day ban.`, {parse_mode: 'Markdown'}); 
                            if (timeServed  < 86400){
                                const paroleDate = Math.ceil(+new Date() / 1000) + 86400 - timeServed;
                                await bot.banChatMember(report.app_group_id, report.app_user_id, {until_date: paroleDate});
                            }
                            await setReport(question.id, true, finalized, activeTimestamp, report.timeServed);
                            break;
                        }
                        case 1:{
                            await bot.sendMessage(report.app_group_id, `The report on Reality has finalized. *${fromUsername}* has violated the rules (/getrules) for the second time and is subject to a 1 week ban.`, {parse_mode: 'Markdown'}); 
                            if (timeServed  < 604800){
                                const paroleDate = Math.ceil(+new Date() / 1000) + 604800 - timeServed;
                                await bot.banChatMember(report.app_group_id, report.app_user_id, {until_date: paroleDate});
                            }
                            await setReport(question.id, true, finalized, activeTimestamp, report.timeServed);
                            break;
                        }
                        default:{
                            await bot.sendMessage(report.app_group_id, `The report on Reality has finalized. *${fromUsername}* has violated the rules (/getrules) for the third time and is subject to a permanent ban.`, {parse_mode: 'Markdown'}); 
                            await bot.banChatMember(report.app_group_id, report.app_user_id);
                            await setReport(question.id, true, finalized, activeTimestamp, report.timeServed);
                            break;
                        }
                    }
                }
                else{
                    await bot.sendMessage(report.app_group_id, `The report request on Reality has finalized. *${fromUsername}* has not violated the rules (/getrules).`, {parse_mode: 'Markdown'});
                    await setReport(question.id, false, finalized, report.activeTimestamp, report.timeServed);
                }
            } else {
                console.error(`Invalid app_type: ${report.app_type}`);
            }
        } else if (latestReportState !== report.active) {
            const appealUrl = `https://realityeth.github.io/#!/network/100/question/${process.env.REALITITY_ETH_V30}-${question.id}\n`;
            if (latestReportState === 1) {
                // ban
                if (report.app_type === 'telegram') {
                    // @ts-ignore
                    await bot.sendMessage(report.app_group_id, `The user report quesiton on Reality has been answered. *${fromUsername}* has violated the rules (/getrules). You can appeal here ${appealUrl}`, {parse_mode: 'Markdown'});
                    await bot.restrictChatMember(report.app_group_id, report.app_user_id, {can_send_messages: false});
                } else {
                    console.error(`Invalid app_type: ${report.app_type}`);
                }

                await setReport(question.id, true, finalized, Math.floor(Date.now()/1000), report.timeServed);
            } else {
                // unban

                if (report.app_type === 'telegram') {
                    // @ts-ignore
                    await bot.restrictChatMember(msg.chat.id, String(msg.reply_to_message.from.id), {can_send_messages: true});
                    await bot.sendMessage(report.app_group_id, `The report request on Reality has been answered. *${fromUsername}* has not violated the rules (/getrules). You can appeal here ${appealUrl}`, {parse_mode: 'Markdown'});
                } else {
                    console.error(`Invalid app_type: ${report.app_type}`);
                }
                const timeServed = report.timeServed + Math.floor(Date.now()/1000) - report.activeTimestamp;
                await setReport(question.id, false, finalized, Math.floor(Date.now()/1000), timeServed);

            }
        }
    }
})()