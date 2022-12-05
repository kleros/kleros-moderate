require('dotenv').config()
import {openDb, getGroupSettings, getRule, getCron, setCron, getReportMessageTimestampAndActive, setBanHistory, setReport, getBanHistory} from "./db";
import request from "graphql-request";
import {BigNumber} from "ethers";
import TelegramBot from "node-telegram-bot-api";
import langJson from "./telegram/assets/lang.json";
import {Wallet} from "@ethersproject/wallet";
import {groupSettings, groupSettingsUnderspecified} from "../types";
const ModeratorBot = require('node-telegram-bot-api');
const NodeCache = require( "node-cache" );
const Web3 = require('web3')
const realitio_bot = require('./realitioReporting')
const myCache = new NodeCache( { stdTTL: 900, checkperiod: 1200 } );
const db = openDb();
const bot: TelegramBot = new ModeratorBot(process.env.BOT_TOKEN, {polling: false});  

// Only need DB for
// - channelID
// - finalizedReportCount
// Can put in DB or make template
// - language (for new reports)
// - rules (for new reports)

(async ()=> {
    const botaddress = await (await new Wallet(process.env.PRIVATE_KEY)).address;
    var history = getCron(db)
    const web3 = new Web3(process.env.WEB3_PROVIDER_URL)
    const privateKey = process.env.PRIVATE_KEY
    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.add(account)
    const currentTime = Math.floor(Date.now()/1000)
    const currentBlock = await web3.eth.getBlockNumber()
    if (!history)
        history = {
            last_timestamp: currentTime,
            last_block: currentBlock
        }
    const graphSyncingPeriod = 300;
    const timestampNew = currentTime
    const timestampLastUpdated = history.last_timestamp
    const reports = {};

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

    //console.log(queryModeration);
    //console.log('graphtime');
    //console.log(queryModeration)
    const moderationActions = await request(
        'https://api.thegraph.com/subgraphs/name/shotaronowhere/kleros-moderate-goerli',
        queryModeration
    );
    console.log(JSON.stringify(moderationActions))
    
    for (const data of moderationActions.disputesFinal) {
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        // settings[1] language
        try{
            const msgLink = data.moderationInfo.message;
            const disputeURL = `https://resolve.kleros.io/cases/${BigNumber.from(data.id).toNumber()}`;
            // check rulings, note down shift since reality uses 0,1 for no, yes and kleros uses 1,2 for no, yes
            const message = (data.finalRuling === 2)? 'broke the rules' : 'did not break the rules'
            console.log(data.finalRuling)
            try{
                bot.sendMessage(settings.channelID, `The [dispute](${disputeURL}) over *${data.moderationInfo.UserHistory.user.username}*'s [message](${msgLink}) ([backup](${data.moderationInfo.messageBackup})) resolved. *${data.moderationInfo.UserHistory.user.username}* ${message}`, {parse_mode: 'Markdown'});
                handleTelegramUpdate(db, bot,settings, data.moderationInfo,timestampNew, data.finalRuling === 2, true);
            } catch(e){
                console.log(e)
            }

        } catch(e){
            console.log(e)
        }
    }

    for (const data of moderationActions.disputesAppealPossible) {
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        const msgLink = data.moderationInfo.message;
        const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;
        const disputeURL = `https://resolve.kleros.io/cases/${BigNumber.from(data.id).toNumber()}`;
        // settings[1] language
        try{
            //TODO
            bot.sendMessage(settings.channelID, `The dispute over the [question](${realityURL}) about *${data.moderationInfo.UserHistory.user.username}*'s conduct due to the [message](${msgLink}) ([backup](${data.moderationInfo.msgBackup})) has concluded it's current round. *${data.moderationInfo.UserHistory.user.username}*'s conduct ${data.currentRuling == 2? 'broke the rules': 'did not break the rules'} If you think the decision is incorrect, you can request an [appeal](${disputeURL})`, {parse_mode: 'Markdown', disable_web_page_preview: true}); 
        } catch(e){
            console.log(e)
        }
    }

    for (const data of moderationActions.disputesCreated) {
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        // settings[1] language
        const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;
        const disputeURL = `https://resolve.kleros.io/cases/${BigNumber.from(data.id).toNumber()}`;
        try{
            bot.sendMessage(settings.channelID, `Arbitration is requested for the [question](${realityURL}) about *${data.moderationInfo.UserHistory.user.username}*'s conduct due to the [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})). Consequences of the report are lifted for the duration of the [dispute](${disputeURL}) (on Gnosis Chain).`, {parse_mode: 'Markdown', disable_web_page_preview: true}); 
            handleTelegramUpdate(db, bot,settings, data.moderationInfo,timestampNew, false, false);
        } catch (e){
            console.log(e)
        }
    }

    for (const data of moderationActions.disputesAppealFunded) {
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        // settings[1] language
        try{
            bot.sendMessage(settings.channelID, "An appeal has been funded");
        } catch(e){
            console.log(e)
        }
    }
/*
    for(const data of moderationActions.realityQuestionUnansweredFinalized){
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        // settings[1] language
        try{
            bot.sendMessage(settings.channelID, `The reality question ${data.id} was unanswered`);
        } catch(e){
            console.log(e)
        }
    }
*/
    for(const data of moderationActions.realityQuestionAnsweredFinalized){
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        // settings[1] language
        try{
            //bot.sendMessage(settings[0], `The reality question ${data.id} is finalized with ${data.currentAnswer}`);
            const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;

            bot.sendMessage(settings.channelID, `The [report](${realityURL}) is finalized.`, {parse_mode: 'Markdown'}); 
            // finalize
            handleTelegramUpdate(db, bot, settings, data.moderationInfo, timestampNew, data.finalRuling === "0x0000000000000000000000000000000000000000000000000000000000000001", true);
        } catch(e){
            console.log(e)
        }
    }

    for(const data of moderationActions.realityQuestionAnsweredNotFinalized){
        console.log(data.moderationInfo.UserHistory.group)
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        // settings[1] language
        try{
            const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;
            const answer = data.currentAnswer === "0x0000000000000000000000000000000000000000000000000000000000000001" ? "yes" : "no";
            bot.sendMessage(settings.channelID, `The question\n\n"Did *${data.moderationInfo.UserHistory.user.username}*'s conduct due to this [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})) violate the [rules](${data.moderationInfo.rules})?\"\n\nis answered with *${answer}*.\n\nDo you think this answer is true? If not, you can [correct](${realityURL}) the answer.`, {parse_mode: 'Markdown', disable_web_page_preview: true});
            handleTelegramUpdate(db, bot,settings, data.moderationInfo,timestampNew, data.currentAnswer === "0x0000000000000000000000000000000000000000000000000000000000000001", false);
        } catch(e){
            console.log(e)
        }
    }

    for(const data of moderationActions.sheriffs){
        const settings = validate(data.group.groupID);
        // settings[1] language
        try{
            const sherrif = await bot.getChatMember(data.group.groupID, data.sheriff.user.userID)
            bot.sendMessage(settings.channelID, `There's a new sheriff in town 👑🥇🤠[${sherrif.user.username}](tg://user?id=${sherrif.user.id})🤠🥇👑`,{parse_mode: "Markdown"});
        } catch(e){
            console.log(e)
        }
    }

    for(const data of moderationActions.deputySheriffs){
        const settings = validate(data.group.groupID);
        // settings[1] language
        try{
            const deputysherrif = await bot.getChatMember(data.group.groupID, data.sheriff.user.userID)
            bot.sendMessage(settings.channelID, `There's a new deputy sheriff in town 🥈[${deputysherrif.user.username}](tg://user?id=${deputysherrif.user.id})🥈`);
        } catch(e){
            console.log(e)
        }
    }

    
    await realitio_bot(web3, history.last_block, process.env.REALITY_ETH_V30, process.env.REALITIO_ARBITRATOR);
    setCron(db, currentBlock,currentTime)
    return;

})()

const validate = (chatId: string): groupSettings=> {
    const defaultSettings: groupSettings = {
        lang: 'en',
        rules: langJson['en'].defaultRules,
        channelID: '',
        greeting_mode: false,
        thread_id_rules: '',
        thread_id_welcome: '',
        thread_id_notifications: ''
    }
    var groupSettings : groupSettingsUnderspecified = myCache.get(chatId)
    if (!groupSettings){
        const rules = getRule(db, 'telegram', chatId, Math.floor(Date.now()/1000))
        groupSettings = getGroupSettings(db, 'telegram', chatId)
        groupSettings.rules = rules
        myCache.set(chatId, groupSettings)
    }
    const fullSettings = {
        lang: groupSettings?.lang ?? defaultSettings.lang,
        rules: groupSettings?.rules ?? defaultSettings.rules,
        channelID: groupSettings?.channelID ?? chatId,
        greeting_mode: groupSettings?.greeting_mode ?? defaultSettings.greeting_mode,
        thread_id_rules: groupSettings?.thread_id_rules ?? defaultSettings.thread_id_rules,
        thread_id_welcome: groupSettings?.thread_id_welcome ?? defaultSettings.thread_id_rules,
        thread_id_notifications: groupSettings?.thread_id_notifications ?? defaultSettings.thread_id_notifications
    }
    return fullSettings
}

const handleTelegramUpdate = async (db: any, bot: TelegramBot, settings: groupSettings, moderationInfo: any, timestampNew: number, restrict: boolean, finalize: boolean) => {
    try{
        const reportInfo = getReportMessageTimestampAndActive(db, moderationInfo.id)
        console.log(moderationInfo.id)
        console.log(reportInfo)
        const banHistory = getBanHistory(db, 'telegram',moderationInfo.UserHistory.group.groupID, moderationInfo.UserHistory.user.userID)?? {ban_level: 0, timestamp_ban: 0, count_current_level_optimistic_bans: 0}
        setReport(db, moderationInfo.id,restrict,finalize,timestampNew)
        if (restrict){
            var duration: string;
            var parole: number;
            if (reportInfo.timestamp > banHistory.timestamp_ban){
                if(banHistory.ban_level == 0){
                    duration = 'first time and is subject to a 1 day';
                    parole = timestampNew + 86400
                } else if (banHistory.ban_level == 1){
                    duration = 'second time and is subject to a 1 week';
                    parole = timestampNew + 604800
                } else{
                    duration = 'atleast three times and is subject to a 1 year';
                    parole = timestampNew + 220147200
                }
                if(finalize){
                    banHistory.ban_level++
                    banHistory.count_current_level_optimistic_bans = 0
                    banHistory.timestamp_ban = timestampNew
                    bot.banChatMember(moderationInfo.user.group.groupID, moderationInfo.userID, parole);
                }
                const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false, until_date: parole};
                bot.sendMessage(settings.channelID, `*${moderationInfo.UserHistory.user.username}*'s conduct due to this [message](${moderationInfo.message}) ([backup](${moderationInfo.messageBackup})) violated the [rules](${moderationInfo.rulesUrl}) for the ${duration} ban.`, {parse_mode: 'Markdown', disable_web_page_preview: true}); 
                if(!finalize && reportInfo?.active !== Number(restrict)){
                    //TODO Federation
                    bot.restrictChatMember(moderationInfo.UserHistory.group.groupID, moderationInfo.UserHistory.user.userID, options);
                    banHistory.count_current_level_optimistic_bans++
                }
                setBanHistory(db, 'telegram',moderationInfo.UserHistory.group.groupID, moderationInfo.UserHistory.user.userID,banHistory.ban_level,banHistory.timestamp_ban,banHistory.count_current_level_optimistic_bans)
            } else{
                bot.sendMessage(settings.channelID, `*${moderationInfo.UserHistory.user.username}*'s conduct due to this [message](${moderationInfo.message}) ([backup](${moderationInfo.messsageBackup})) violated the [rules](${moderationInfo.rulesUrl}). The conduct occured before *${moderationInfo.UserHistory.user.username}*'s latest effective ban.\nModeration is about both rehabilitation and punishment. We all make mistakes and we deserve second chances. Let's give ${moderationInfo.UserHistory.user.username} another chance. The next time ${moderationInfo.UserHistory.user.username} breaks the rules, the consequences are more severe though. Here's to healthier communities : )`, {parse_mode: 'Markdown'}); 
            }
        } else {
            var noOptimisticReports = 0
            if(reportInfo.active != Number(restrict)){
                setBanHistory(db, 'telegram',moderationInfo.UserHistory.group.groupID, moderationInfo.UserHistory.user.userID,banHistory.ban_level,banHistory.timestamp_ban,Math.max(banHistory.count_current_level_optimistic_bans-1,0))
                noOptimisticReports = 1
            }
            if (banHistory.count_current_level_optimistic_bans === noOptimisticReports){ // only optimistic report removed.
                const options = {can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false};
                bot.restrictChatMember(moderationInfo.UserHistory.group.groupID, moderationInfo.UserHistory.user.userID, options);
                bot.sendMessage(settings.channelID, `*${moderationInfo.UserHistory.user.username}* has no other active reports. All bans are lifted.`, {parse_mode: 'Markdown'});
            } else {
                bot.sendMessage(settings.channelID, `*${moderationInfo.UserHistory.user.username}* has other active reports, and is still restricted.`, {parse_mode: 'Markdown'});
            }
        }
    } catch(e){
        console.log(e)
    }
}

const getQuery = (lastPageUpdated: number, timestampLastUpdated: number, botaddress: string, timestampNew: number, graphSyncingPeriod: number): string => {
    const moderationInfoContent = `        id
                message
                messageBackup
                moderationType
                rulesUrl
                UserHistory{
                    timestampParole
                    countBrokeRulesArbitrated
                    group {
                        groupID
                    }
                    user {
                        username
                        userID
                    }
                }`;
    const moderationInfo = `moderationInfo {
        ${moderationInfoContent}
            }`;
return `{
        disputesFinal: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastUpdated_gt: ${timestampLastUpdated}, finalRuling_not: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            finalRuling
            ${moderationInfo}
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
        disputesAppealFunded: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastAppealPossible_gt: ${timestampLastUpdated}, rulingFunded_not: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            rulingFunded
            currentRuling
            ${moderationInfo}
        }
        realityQuestionUnansweredFinalized: moderationInfos(first: 1000, skip: ${lastPageUpdated*1000}, where: {deadline_gt: ${timestampLastUpdated}, deadline_lt: ${timestampNew}, reality: null, askedBy: "${botaddress}"}) {
            ${moderationInfoContent}
        }
        realityQuestionAnsweredFinalized: realityChecks(first: 1000, skip: ${lastPageUpdated*1000}, where: {deadline_gt: ${timestampLastUpdated}, dispute: null, deadline_lt: ${timestampNew + graphSyncingPeriod}, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            timestampLastUpdated
            currentAnswer
            timeServed
            ${moderationInfo}
        }
        realityQuestionAnsweredNotFinalized: realityChecks(first: 1000, skip: ${lastPageUpdated*1000}, where: {deadline_gt: ${timestampNew}, dispute: null, timestampLastUpdated_gt: ${timestampLastUpdated}, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            currentAnswer
            timestampLastUpdated
            ${moderationInfo}
        }
        sheriffs: jannies(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastUpdatedSheriff_gt: ${timestampLastUpdated}, group_: {botAddress: "${botaddress}"}}) {
            id
            group{
                groupID
            }
            sheriff{
                user{
                    userID
                }
            }
        }
        deputySheriffs: jannies(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastUpdatedDeputySheriff_gt: ${timestampLastUpdated}, group_: {botAddress: "${botaddress}"}}) {
            id
            group{
                groupID
            }
            deputySheriff{
                user{
                    userID
                }
            }
        }
    }`;
}