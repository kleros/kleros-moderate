require('dotenv').config()
const ModeratorBot = require('node-telegram-bot-api');
import {openDb, getChannelID, getLang} from "./db";
import request from "graphql-request";
import {BigNumber} from "ethers";
import TelegramBot from "node-telegram-bot-api";
import langJson from "./telegram/assets/lang.json";
import {Wallet} from "@ethersproject/wallet";

const db = openDb();
const bot: TelegramBot = new ModeratorBot(process.env.BOT_TOKEN, {polling: false});  
const channelIDs : Map<number, string> = new Map();
const lang : Map<number, string> = new Map();

// Only need DB for
// - channelID
// - finalizedReportCount
// Can put in DB or make template
// - language (for new reports)
// - rules (for new reports)

(async ()=> {
    const botaddress = await (await new Wallet(process.env.PRIVATE_KEY)).address;
    const timestampLastUpdated = 0;
    const timestampNew = Math.floor(Date.now()/1000);
    const graphSyncingPeriod = 300;

    const reports = {};

    /*
      var moderationTypes: string = '';
      for (const lang in templates[process.env.CHAIN_ID]) 
        for (const template in templates[process.env.CHAIN_ID][lang])
            moderationTypes += '\"'+process.env.REALITY_ETH_V30+'-0x'+Number(templates[process.env.CHAIN_ID][lang][template]).toString(16)+"\",";
    */
    // dispute final
    // dispute appealsPossible
    // dispute disputesAppeal
    // dispute created
    // dispute appeal ruling funded
    // realityQuestionUnanswered and finalized
    // realityQuestionAnswered and finalized
    // realityQuestionAnswered and not finalized
    // jannies sheriff
    // jannies deputysheriff
    const lastPageUpdated = 0;
    const queryModeration = getQuery(lastPageUpdated, timestampLastUpdated, botaddress, timestampNew, graphSyncingPeriod)

    console.log(queryModeration);

    const moderationActions = await request(
        'https://api.thegraph.com/subgraphs/name/shotaronowhere/kleros-moderate-goerli',
        queryModeration
    );

    for (const data of moderationActions.disputesFinal) {
        const settings = getGroupSettings(data.moderationInfo.user.group.groupID);
        // settings[1] language
        try{
            const msgLink = data.message;
            const disputeURL = `https://resolve.kleros.io/${BigNumber.from(data.id).toNumber()}`;
            // check rulings, note down shift since reality uses 0,1 for no, yes and kleros uses 1,2 for yes, no
            const message = (data.finalRuling === 1)? 'broke the rules' : 'did not break the rules'
            try{
                await bot.sendMessage(settings[0], `The [dispute](${disputeURL}) over *${data.moderationInfo.user.username}*'s [message](${msgLink}) ([backup](${data.moderationInfo.messageBackup})) resolved. *${data.moderationInfo.user.username}* ${message}`, {parse_mode: 'Markdown'});
            } catch(e){
                console.log(e)
            }

        } catch(e){
            console.log(e)
        }
    }

    for (const data of moderationActions.disputesAppealPossible) {
        const settings = getGroupSettings(data.moderationInfo.user.group.groupID);
        // settings[1] language
        try{
            bot.sendMessage(settings[0], `The dispute id ${data.id} has concluded it's current round. The ruling is ${data.currentRuling}. An appeal is possible.`);
            //TODO
            //await bot.sendMessage(settings[0], `The current dispute over the [question](${realityURL}) about *${report.username}*'s conduct due to the [message](${msgLink}) ([backup](${report.msgBackup})) has concluded it's current round. *${report.username}*'s conduct ${disputeInfo[question.disputeId].currentRulling == 2? 'broke the rules': 'did not break the rules'} If you think the decision is incorrect, you can request an [appeal](https://resolve.kleros.io/cases/${BigNumber.from(question.disputeId).toNumber()})`, {parse_mode: 'Markdown'}); 
        } catch(e){
            console.log(e)
        }
    }

    for (const data of moderationActions.disputesCreated) {
        const settings = getGroupSettings(data.moderationInfo.user.group.groupID);
        // settings[1] language
        const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;
        const disputeURL = `https://resolve.kleros.io/${BigNumber.from(data.id).toNumber()}`;
        try{
            await bot.sendMessage(settings[0], `Arbitration is requested for the [question](${realityURL}) about *${data.moderationInfo.user.username}*'s conduct due to the [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})). Consequences of the report are lifted for the duration of the [dispute](${disputeURL}) (on Gnosis Chain).`, {parse_mode: 'Markdown'}); 
            handleTelegramUpdateRestrict(bot,settings[0],data,timestampNew, false);
        } catch (e){
            console.log(e)
        }
    }

    for (const data of moderationActions.disputesAppealFunded) {
        const settings = getGroupSettings(data.moderationInfo.user.group.groupID);
        // settings[1] language
        try{
            bot.sendMessage(settings[0], "An appeal has been funded");
        } catch(e){
            console.log(e)
        }
    }

    for(const data of moderationActions.realityQuestionUnansweredFinalized){
        const settings = getGroupSettings(data.user.group.groupID);
        // settings[1] language
        try{
            bot.sendMessage(settings[0], `The reality question ${data.id} was unanswered`);
        } catch(e){
            console.log(e)
        }
    }

    for(const data of moderationActions.realityQuestionAnsweredFinalized){
        const settings = getGroupSettings(data.moderationInfo.user.group.groupID);
        // settings[1] language
        try{
            //bot.sendMessage(settings[0], `The reality question ${data.id} is finalized with ${data.currentAnswer}`);
            
            await bot.sendMessage(settings[0], `The report on Reality is finalized.`, {parse_mode: 'Markdown'}); 
            // finalize
            await handleTelegramFinalize(bot, settings[0], data, timestampNew, botaddress);
        } catch(e){
            console.log(e)
        }
    }

    for(const data of moderationActions.realityQuestionAnsweredNotFinalized){
        const settings = getGroupSettings(data.moderationInfo.user.group.groupID);
        // settings[1] language
        try{
            bot.sendMessage(settings[0], `The reality question ${data.id} was answered with ${data.currentAnswer}`);
            const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;
            await bot.sendMessage(settings[0], `The question, \n\n\"Did *${data.moderationInfo.user.username}*'s conduct due to this [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})) violate the [rules](${data.moderationInfo.rules})?\",\n\nis answered with *Yes*.\n\nDo you think this answer is true? If not, you can [correct](${realityURL}) the answer.`, {parse_mode: 'Markdown'});
            handleTelegramUpdateRestrict(bot,settings[0], data,timestampNew, data.currentAnswer.equals("0x0000000000000000000000000000000000000000000000000000000000000001"));
        } catch(e){
            console.log(e)
        }
    }

    for(const data of moderationActions.sheriff){
        const settings = getGroupSettings(data.group.groupID);
        // settings[1] language
        try{
            bot.sendMessage(settings[0], `There's a new sheriff in town ${data.sheriff.userID}`);
        } catch(e){
            console.log(e)
        }
    }

    for(const data of moderationActions.deputySheriff){
        const settings = getGroupSettings(data.group.groupID);
        // settings[1] language
        try{
            bot.sendMessage(settings[0], `There's a new deputy sheriff in town ${data.sheriff.userID}`);
        } catch(e){
            console.log(e)
        }
    }

    return;

})()

const getGroupSettings = async (chatId: number): Promise<[string, string]> => {
        var language = lang.get(chatId);
        if (!language){
            language = getLang(db, 'telegram', String(chatId));
            lang.set(chatId, language);
        }
        var channelId = channelIDs.get(chatId)
        if (!channelId){
            channelId = getChannelID(db, 'telegram', String(chatId))
            if (channelId === '0'){
                channelIDs.set(chatId, String(chatId));
                channelId = String(chatId)
            }else
                channelIDs.set(chatId, channelId);
        }
        return [channelId, language]
}


const handleTelegramUpdateRestrict = async (bot: TelegramBot, channelID: string, moderationInfo: any, timestampNew: number, restrict: boolean) => {
    try{
        if (restrict){
            var duration: string;
            if(moderationInfo.user.history.countBrokeRulesArbitrated == 1)
                duration = 'first time and is subject to a 1 day';
            else if (moderationInfo.user.history.countBrokeRulesArbitrated == 2)
                duration = 'second time and is subject to a 1 week';
            else
                duration = 'third time and is subject to a 1 year';

            await bot.sendMessage(channelID, `*${moderationInfo.user.username}*'s conduct due to this [message](${moderationInfo.message}) ([backup](${moderationInfo.messsageBackup})) violated the [rules](${moderationInfo.rulesUrl}) for the ${duration} ban.`, {parse_mode: 'Markdown'}); 
            await bot.banChatMember(moderationInfo.user.group.groupID, moderationInfo.user.userID, Number(moderationInfo.user.history.timestampParole));
        } else {
            const options = timestampNew > Number(moderationInfo.user.history.timestampParole)? {can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true, can_change_info: false, can_pin_messages: false}: {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false, until_date: Number(moderationInfo.user.userHistory.timestampParole)};
            await bot.restrictChatMember(moderationInfo.user.group.groupID, moderationInfo.user.userID, options);
            if (timestampNew > Number(moderationInfo.user.history.timestampParole))
                await bot.sendMessage(channelID, `*${moderationInfo.user.userID}* has no other active reports. All bans are lifted.`, {parse_mode: 'Markdown'});
            else {
                const date = new Date(Number(moderationInfo.user.history.timestampParole) * 1000).toISOString();
                await bot.sendMessage(moderationInfo.user.group.groupID, `*${moderationInfo.user.username}* has other active reports. The ban on *${moderationInfo.user.username}* is reduced and now expires on ${date}`, {parse_mode: 'Markdown'});
            }
        }
    } catch(e){
        console.log(e)
        await bot.sendMessage(moderationInfo.user.group.groupID, `My admin rights are limited. I am unable to lift the ban/mute duration for *${moderationInfo.user.username}*. Please ask an admin.`);
    }
}

const handleTelegramFinalize = async (bot: TelegramBot, channelID: string, realityCheck: any, timestampNew: number, botaddress: string) => {
    const finalizedCount = await getFinalizedCount(realityCheck.moderationInfo.user, timestampNew, botaddress);
    if (finalizedCount == 1){

    }
    var duration: string;
    if(finalizedCount == 1)
        duration = 'first time and is subject to a 1 day';
    else if (finalizedCount == 2)
        duration = 'second time and is subject to a 1 week';
    else
        duration = 'third time and is subject to a 1 year';
    try{
        await bot.sendMessage(channelID, `*${realityCheck.moderationInfo.user.username}*'s conduct due to this [message](${realityCheck.moderationInfo.message}) ([backup](${realityCheck.moderationInfo.messsageBackup})) violated the [rules](${realityCheck.moderationInfo.rulesUrl}) for the ${duration} ban.`, {parse_mode: 'Markdown'}); 
        await bot.banChatMember(realityCheck.moderationInfo.user.group.groupID, realityCheck.moderationInfo.userID, Number(realityCheck.moderationInfo.user.history.timestampParole));
    
    } catch(e){
        await bot.sendMessage(channelID, `My admin rights are limited. I am unable to lift any active mute on *${realityCheck.moderationInfo.user.username}*. Please ask an admin to remove any mute related to this question.`);
    }
}


const getFinalizedCount = async (moderationInfo: any, timestampNew: number, botaddress: string): Promise<number> => {
    const queryOptimisticallyFinalized =`{
        realityChecks(where: {deadline_lt: ${timestampNew}, currentAnswer: "0x0000000000000000000000000000000000000000000000000000000000000001", moderationInfo_: {askedBy: "${botaddress}", user: "${moderationInfo.user}"}}) {
            id
        }
    }`;
    const moderationActions = await request(
        'https://api.thegraph.com/subgraphs/name/shotaronowhere/kleros-moderate-goerli',
        queryOptimisticallyFinalized
    );
    return moderationInfo.user.history.countBrokeRulesArbitrated + moderationActions.data.length;
}

const getQuery = (lastPageUpdated: number, timestampLastUpdated: number, botaddress: string, timestampNew: number, graphSyncingPeriod: number): string => {
    const moderationInfoContent = `        id
                message
                messageBackup
                moderationType
                rulesUrl
                user {
                    username
                    userID
                    group {
                        groupID
                    }
                    history{
                        timestampParole
                        countBrokeRulesArbitrated
                    }
                }`;
    const moderationInfo = `moderationInfo {
        ${moderationInfoContent}
            }`;
return `{
        disputesFinal: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastAppealPossible_gt: ${timestampLastUpdated}, finalRuling_not: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            finalRuling
        }
        disputesAppealPossible: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastAppealPossible_gt: ${timestampLastUpdated}, finalRuling: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            currentRuling
            ${moderationInfo}
        }
        disputesAppeal: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastAppeal_gt: ${timestampLastUpdated}, finalRuling: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            currentRuling
            ${moderationInfo}
        }
        disputesCreated: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastUpdated_gt: ${timestampLastUpdated}, finalRuling: null, currentRuling: null, rulingFunded: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            ${moderationInfo}
        }
        disputesAppealFunded: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastUpdated_gt: ${timestampLastUpdated}, rulingFunded_not: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            rulingFunded
            ${moderationInfo}
        }
        realityQuestionUnansweredFinalized: moderationInfos(first: 1000, skip: ${lastPageUpdated*1000}, where: {deadline_gt: ${timestampLastUpdated}, deadline_lt: ${timestampNew}, reality: null, askedBy: "${botaddress}"}) {
            ${moderationInfoContent}
        }
        realityQuestionAnsweredFinalized: realityChecks(first: 1000, skip: ${lastPageUpdated*1000}, where: {deadline_gt: ${timestampLastUpdated}, deadline_lt: ${timestampNew - graphSyncingPeriod}, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            currentAnswer
            timeServed
            ${moderationInfo}
        }
        realityQuestionAnsweredNotFinalized: realityChecks(first: 1000, skip: ${lastPageUpdated*1000}, where: {deadline_gt: ${timestampNew}, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            currentAnswer
            ${moderationInfo}
        }
        sheriffs: jannies(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastUpdatedSheriff_gt: ${timestampLastUpdated}, group_: {botAddress: "${botaddress}"}}) {
            id
            group{
                groupID
            }
            sheriff{
                userID
            }
        }
        deputySheriffs: jannies(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastUpdatedDeputySheriff_gt: ${timestampLastUpdated}, group_: {botAddress: "${botaddress}"}}) {
            id
            group{
                groupID
            }
            deputySheriff{
                userID
            }
        }
    }`;
}