require('dotenv').config()
const ModeratorBot = require('node-telegram-bot-api');
//import * as TelegramBot from "node-telegram-bot-api";
import {openDb, getFinalRecord, getRule, getCurrentRecord, setReportArbitration, getDisputedReports, setReport} from "./db";
//import {getModerateBilling} from "./ethers";
import request from "graphql-request";
import {BigNumber} from "ethers";


(async ()=> {
    const t0 = Date.now();
    const bot = new ModeratorBot(process.env.BOT_TOKEN, {polling: false});  

    const reports = {};

    (await getDisputedReports()).forEach((report) => {
        reports[report.question_id] = report;
    });

    const query = `{
        questions(
          where: { 
              id_in: ${JSON.stringify(Object.keys(reports))}
          }
        ) {
          id
          answer
          finalize_ts
          arbitrationRequested
          disputeId
          bond
          ruling
        }
      }`;
    const result = await request(
        'https://api.thegraph.com/subgraphs/name/shotaronowhere/kleros-moderator-bot',
        query
    )
    for (const question of result.questions) {
        console.log((Date.now()-t0)/1000);
        const answer = question.answer == null? null : BigNumber.from(question.answer);
        const report = reports[question.id];
        const msgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
        const appealUrl = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${question.id}\n`;
        const reportHistoryFinal = await getFinalRecord(report.platform, report.group_id, report.user_id);
        const finalized = question.finalize_ts <= Math.ceil(+new Date() / 1000) + 60; // 1 min buffer for graph syncing and finality
        if(question.arbitrationRequested === true){
            if(report.arbitrationRequested != true){
                //await bot.restrictChatMember(report.group_id, report.user_id, {can_send_messages: true});

                await setReport(question.id, false, true, report.activeTimestamp, 0, question.bond);
                const reportHistoryCurrent = await getCurrentRecord(report.platform, report.group_id, report.user_id);
                await bot.sendMessage(report.group_id, `Arbitration is requested for the [question](${appealUrl}) about *${report.username}*'s conduct due to the [message](${msgLink}) ([backup](${report.msgBackup})). Consequences of the report are lifted for the duration of the [dispute](https://court.kleros.io/cases/${BigNumber.from(question.disputeId).toNumber()}) (on Gnosis Chain).`, {parse_mode: 'Markdown'}); 
                if(reportHistoryCurrent == 0){
                    const options = {can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true, can_change_info: false, can_pin_messages: false};
                    await bot.restrictChatMember(report.group_id, report.user_id, options);
                } else
                    handleCurrentTelegramUnrestrict(bot, report, reportHistoryCurrent+reportHistoryFinal);
                await setReportArbitration(question.id, 0);
            } else if (question.ruling != null){
                const msgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
                if (question.ruling == 1){ // check rulings
                    await bot.sendMessage(report.group_id, `The dispute over *${report.username}*'s [message](${msgLink}) ([backup](${report.msgBackup})) resolved.`, {parse_mode: 'Markdown'});
                    handleFinalizedTelegram(bot, report, question, 1, reportHistoryFinal);
                }  else{
                    await bot.sendMessage(report.group_id, `The dispute over *${report.username}*'s [message](${msgLink}) ([backup](${report.msgBackup})) resolved.`, {parse_mode: 'Markdown'});
                    handleFinalizedTelegram(bot, report, question, 2, reportHistoryFinal);
                }
            }
            continue;
        }
        const rules = await getRule('telegram', String(report.group_id), Math.floor(Date.now()/1000));

        // only final records considered for now.
        if (answer == null && !finalized)
            continue;
        const latestReportState = (answer == null)? 2: answer.toNumber();


        if (finalized){
            if (report.platform === 'telegram') {
                await bot.sendMessage(report.group_id, `The report on Reality is finalized.`, {parse_mode: 'Markdown'}); 
                handleFinalizedTelegram(bot, report, question, latestReportState, reportHistoryFinal);
            } else {
                console.error(`Invalid platform: ${report.platform}`);
            }
        } else if (question.bond != report.bond_paid) {
            if (latestReportState === 1) {
                // ban
                await setReport(question.id, true, finalized,  Math.ceil(+new Date() / 1000), 0, question.bond);
                const reportHistoryCurrent = reportHistoryFinal + await getCurrentRecord(report.platform, report.group_id, report.user_id);
                if (report.platform === 'telegram') {
                    // @ts-ignore
                    const msgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
                    await bot.sendMessage(report.group_id, `The question, \n\n\"Did *${report.username}*'s conduct due to this [message](${msgLink}) ([backup](${report.msgBackup})) violate the [rules](${rules})?\",\n\nis answered with *Yes*.\n\nDo you think this answer is true? If not, you can [correct](${appealUrl}) the answer.`, {parse_mode: 'Markdown'});
                    switch(reportHistoryCurrent){
                        case 1:{
                            const paroleDate = Math.ceil(+new Date() / 1000) + 86400;
                            const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false, until_date: paroleDate};
                            await bot.restrictChatMember(report.group_id, report.user_id, options);
                            await bot.sendMessage(report.group_id, `*${report.username}* is subject to a 24 hour ban.`, {parse_mode: 'Markdown'});
                            break;
                        }
                        case 2:{
                            const paroleDate = Math.ceil(+new Date() / 1000) + 604800;
                            const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false, until_date: paroleDate};
                            await bot.restrictChatMember(report.group_id, report.user_id, options);
                            await bot.sendMessage(report.group_id, `*${report.username}* is subject to a 7 day ban.`, {parse_mode: 'Markdown'});
                            break;
                        }
                        default:{
                            const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false};
                            await bot.restrictChatMember(report.group_id, report.user_id, options);
                            await bot.sendMessage(report.group_id, `*${report.username}* is banned.`, {parse_mode: 'Markdown'});
                            break;
                        }
                    }
                } else {
                    console.error(`Invalid platform: ${report.platform}`);
                }
            } else {
                // unban
                await setReport(question.id, false, finalized, Math.floor(Date.now()/1000), 0, question.bond);
                const reportHistoryCurrent = reportHistoryFinal + await getCurrentRecord(report.platform, report.group_id, report.user_id);

                if (report.platform === 'telegram') {
                    // @ts-ignore
                    const msgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
                    await bot.sendMessage(report.group_id, `The question, \n\n\"Did *${report.username}*'s conduct due to this [message](${msgLink}) ([backup](${report.msgBackup})) violate the [rules](${rules})?\",\n\nis answered with *No*.\n\nDo you think this answer is true? If not, you can [correct](${appealUrl}) the answer.`, {parse_mode: 'Markdown'});
                    handleCurrentTelegramUnrestrict(bot, report, reportHistoryCurrent);
                } else {
                    console.error(`Invalid platform: ${report.platform}`);
                }
            }
        }
    }
})()

const handleCurrentTelegramUnrestrict = async (bot: any, report: any, reportHistoryCurrent: number) => {

    switch(reportHistoryCurrent){
        case 0:{
            const options = {can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true, can_change_info: false, can_pin_messages: false};
            await bot.restrictChatMember(report.group_id, report.user_id, options);
            await bot.sendMessage(report.group_id, `*${report.username}* does not have pending reports and all bans are lifted.`, {parse_mode: 'Markdown'});
            break;
        }
        case 1:{
            const paroleDate = Math.ceil(+new Date() / 1000) + 86400;
            const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false, until_date: paroleDate};
            await bot.restrictChatMember(report.group_id, report.user_id, options);
            await bot.sendMessage(report.group_id, `The ban on *${report.username}* is lifted to 24 hours.`, {parse_mode: 'Markdown'});
            break;
        }
        case 2:{
            const paroleDate = Math.ceil(+new Date() / 1000) + 604800;
            const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false, until_date: paroleDate};
            await bot.restrictChatMember(report.group_id, report.user_id, options);
            await bot.sendMessage(report.group_id, `The ban on *${report.username}* is lifted to 7 days.`, {parse_mode: 'Markdown'});
            break;
        }
        default:{
            const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false};
            await bot.restrictChatMember(report.group_id, report.user_id, options);
            await bot.sendMessage(report.group_id, `*${report.username}* is banned.`, {parse_mode: 'Markdown'});
            break;
        }
    }
}

const handleFinalizedTelegram = async (bot: any, report: any, question: any, latestReportState: number, reportHistory: number) => {
    const msgLink = 'https://t.me/c/' + report.group_id.substring(4) + '/' + report.msg_id;
    const rules = await getRule('telegram', String(report.group_id), Math.floor(Date.now()/1000));
    const bond = question.bond == null? 0: question.bond;
    if (latestReportState === 1){
        const activeTimestamp = latestReportState === report.active ? report.activeTimestamp : Math.ceil(+new Date() / 1000);
        switch(reportHistory){
            case 0:{
                await bot.sendMessage(report.group_id, `*${report.username}*'s conduct due to this [message](${msgLink}) ([backup](${report.msgBackup})) violated the [rules](${rules}) for the first time and is subject to a 1 day ban.`, {parse_mode: 'Markdown'}); 
                const paroleDate = Math.ceil(+new Date() / 1000) + 86400;
                await bot.banChatMember(report.group_id, report.user_id, {until_date: paroleDate});
                await setReport(question.id, true, true, activeTimestamp, 0, bond);
                break;
            }
            case 1:{
                await bot.sendMessage(report.group_id, `*${report.username}*'s conduct due to this [message](${msgLink}) ([backup](${report.msgBackup})) violated the [rules](${rules}) for the second time and is subject to a 1 week ban.`, {parse_mode: 'Markdown'}); 
                const paroleDate = Math.ceil(+new Date() / 1000) + 604800;
                await bot.banChatMember(report.group_id, report.user_id, {until_date: paroleDate});
                await setReport(question.id, true, true, activeTimestamp, 0, bond);
                break;
            }
            default:{
                await bot.sendMessage(report.group_id, `*${report.username}*'s conduct due to this [message](${msgLink}) ([backup](${report.msgBackup})) violated the [rules](${rules}) for the third time and is subject to a permanent ban.`, {parse_mode: 'Markdown'}); 
                await bot.banChatMember(report.group_id, report.user_id);
                await setReport(question.id, true, true, activeTimestamp, 0, bond);
                break;
            }
        }
    } else{
        await setReport(question.id, false, true, report.activeTimestamp, 0, bond);
        const reportHistoryCurrent = await getCurrentRecord(report.platform, report.group_id, report.user_id);
        await bot.sendMessage(report.group_id, `*${report.username}*'s conduct due to this [message](${msgLink}) ([backup](${report.msgBackup})) did not violate the [rules](${rules}).`, {parse_mode: 'Markdown'}); 
        if(reportHistoryCurrent == 0){
            const options = {can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true, can_change_info: false, can_pin_messages: false};
            await bot.restrictChatMember(report.group_id, report.user_id, options);
        } else
            handleCurrentTelegramUnrestrict(bot, report, reportHistoryCurrent+reportHistory);
    }
}
