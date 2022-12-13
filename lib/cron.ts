require('dotenv').config()
import {openDb, getGroupSettings, getRule, getCron, getTimestampFinalized, getFederatedFollowingBanHistory, getLocalBanHistory, getFederatedBanHistory, setCron, getGroupsInAndFollowingFederation, getReportMessageTimestampAndActive, setReport} from "./db";
import request from "graphql-request";
import {BigNumber} from "ethers";
import TelegramBot from "node-telegram-bot-api";
import langJson from "./telegram/assets/lang.json";
import {Wallet} from "@ethersproject/wallet";
const {default: PQueue} = require('p-queue');
import {groupSettings, groupSettingsUnderspecified} from "../types";
const ModeratorBot = require('node-telegram-bot-api');
const NodeCache = require( "node-cache" );
const Web3 = require('web3')
const realitio_bot = require('./realitioReporting')
const myCache = new NodeCache( { stdTTL: 900, checkperiod: 1200 } );
const db = openDb();
const bot: any = new ModeratorBot(process.env.BOT_TOKEN, {polling: false, testEnvironment: true});  
const queue = new PQueue({intervalCap: 25, interval: 1000,carryoverConcurrencyCount: true});
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
    // hardcode values for tests
    //history.last_timestamp = 1670802755
    //history.last_block = 25402583
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
        process.env.MODERATE_SUBGRAPH,
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
                bot.sendMessage(settings.channelID, `The [dispute](${disputeURL}) over *${data.moderationInfo.UserHistory.user.username}*'s [message](${msgLink}) ([backup](${data.moderationInfo.messageBackup})) resolved. *${data.moderationInfo.UserHistory.user.username}* ${message}`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'});
                handleTelegramUpdate(db, bot,settings, data.moderationInfo,timestampNew, data.finalRuling === 2, true, true);
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
            bot.sendMessage(settings.channelID, `The dispute over the [question](${realityURL}) about *${data.moderationInfo.UserHistory.user.username}*'s conduct due to the [message](${msgLink}) ([backup](${data.moderationInfo.msgBackup})) has concluded it's current round. *${data.moderationInfo.UserHistory.user.username}*'s conduct ${data.currentRuling == 2? 'broke the rules': 'did not break the rules'} If you think the decision is incorrect, you can request an [appeal](${disputeURL})`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true});
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
            bot.sendMessage(settings.channelID, `Arbitration is requested for the [question](${realityURL}) about *${data.moderationInfo.UserHistory.user.username}*'s conduct due to the [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})). Consequences of the report are lifted for the duration of the [dispute](${disputeURL}) (on Gnosis Chain).`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true});
            handleTelegramUpdate(db, bot,settings, data.moderationInfo,timestampNew, false, false, true);
        } catch (e){
            console.log(e)
        }
    }

    for (const data of moderationActions.disputesAppealFunded) {
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        // settings[1] language
        try{
            bot.sendMessage(settings.channelID, "An appeal has been funded",settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'});
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

            bot.sendMessage(settings.channelID, `The [report](${realityURL}) is finalized.`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'});
            // finalize
            handleTelegramUpdate(db, bot, settings, data.moderationInfo, timestampNew, data.finalRuling === "0x0000000000000000000000000000000000000000000000000000000000000001", true, false);
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
            bot.sendMessage(settings.channelID, `The question\n\n"Did *${data.moderationInfo.UserHistory.user.username}*'s conduct due to this [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})) violate the [rules](${data.moderationInfo.rules})?\"\n\nis answered with *${answer}*.\n\nDo you think this answer is true? If not, you can [correct](${realityURL}) the answer.`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true});
            handleTelegramUpdate(db, bot,settings, data.moderationInfo,timestampNew, data.currentAnswer === "0x0000000000000000000000000000000000000000000000000000000000000001", false, false);
        } catch(e){
            console.log(e)
        }
    }

    // promise queue example
    for(const data of moderationActions.sheriffs){
        const settings = validate(data.group.groupID);
        // settings[1] language
        try{
            const sherrif = await bot.getChatMember(data.group.groupID, data.sheriff.user.userID)
            queue.add(() => bot.sendMessage(settings.channelID, `There's a new sheriff in town 👑🥇🤠[${sherrif.user.username}](tg://user?id=${sherrif.user.id})🤠🥇👑`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'}));
        } catch(e){
            console.log(e)
        }
    }

    for(const data of moderationActions.deputySheriffs){
        const settings = validate(data.group.groupID);
        // settings[1] language
        try{
            const deputysherrif = await bot.getChatMember(data.group.groupID, data.sheriff.user.userID)
            bot.sendMessage(settings.channelID, `There's a new deputy sheriff in town 🥈[${deputysherrif.user.username}](tg://user?id=${deputysherrif.user.id})🥈`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'});
        } catch(e){
            console.log(e)
        }
    }

    await queue.onIdle()
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
        captcha: false,
        admin_reportable: false,
        thread_id_rules: '',
        thread_id_welcome: '',
        thread_id_notifications: '',
        federation_id: '',
        federation_id_following: ''
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
        admin_reportable: groupSettings?.admin_reportable ?? defaultSettings.admin_reportable,
        captcha: groupSettings?.captcha ?? defaultSettings.captcha,
        thread_id_rules: groupSettings?.thread_id_rules ?? defaultSettings.thread_id_rules,
        thread_id_welcome: groupSettings?.thread_id_welcome ?? defaultSettings.thread_id_rules,
        thread_id_notifications: groupSettings?.thread_id_notifications ?? defaultSettings.thread_id_notifications,
        federation_id: groupSettings?.federation_id ?? defaultSettings.federation_id,
        federation_id_following: groupSettings?.federation_id_following ?? defaultSettings.federation_id,
    }
    return fullSettings
}

const calcPenalty = (ban_level: number, timestamp_finalized: number): number => {
    if(ban_level == 0)
        return  timestamp_finalized + 86400
    else if (ban_level == 1)
        return  timestamp_finalized + 604800
    else
        return  timestamp_finalized + 220147200
}

const calcPenaltyPhrase = (ban_level: number): string => {
    if(ban_level == 0)
        return 'first time and is subject to a 1 day'
    else if (ban_level == 1)
        return 'second time and is subject to a 1 week'
    else
        return 'atleast three times and is subject to a 1 year'
}

const handleTelegramUpdate = async (db: any, bot: any, settings: groupSettings, moderationInfo: any, timestampNew: number, restrict: boolean, finalize: boolean, disputed: boolean) => {
    try{
        const reportInfo = getReportMessageTimestampAndActive(db, moderationInfo.id)
        if (!reportInfo) return;
        let calculateHistory = []

        if (settings.federation_id)
            calculateHistory = getFederatedBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,moderationInfo.UserHistory.group.groupID,finalize)
         else {
            if (settings.federation_id_following)
                calculateHistory = getFederatedFollowingBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,moderationInfo.UserHistory.group.groupID,settings.federation_id_following,finalize)
             else 
                calculateHistory = getLocalBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,moderationInfo.UserHistory.group.groupID,finalize)
        }

        const ban_level_history = Math.max(calculateHistory.length-1,0)

        setReport(db, moderationInfo.id,restrict,true,finalize,disputed, finalize? 0 : (restrict? timestampNew: 0), finalize? timestampNew: 0)

        if (settings.federation_id){
            calculateHistory = getFederatedBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,moderationInfo.UserHistory.group.groupID,finalize)
        } else {
            if (settings.federation_id_following){
                calculateHistory = getFederatedFollowingBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,moderationInfo.UserHistory.group.groupID,settings.federation_id_following,finalize)
            } else 
                calculateHistory = getLocalBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,moderationInfo.UserHistory.group.groupID,finalize)
        }

        const ban_level_current = Math.max(calculateHistory.length-1,0)


        if (restrict){
            // TODO federation subscriptions
            const groups = settings.federation_id? getGroupsInAndFollowingFederation(db,'telegram',settings.federation_id) : [moderationInfo.UserHistory.group.groupID]
            if (ban_level_current > ban_level_history){
                const parole = calcPenalty(ban_level_current,timestampNew)
                if(finalize){
                    // if message reported timestamp is before the most recent finalized ban / penality, users deserve a second chance, no action taken
                    // philosophy is only escalate the penalties after the user is warned with a temporary ban. 
                    // this report changed penalties, recalculate all
                    for (const group of groups)
                        bot.banChatMember(group.group_id, moderationInfo.UserHistory.user.userID, parole);
                } else if(!finalize){
                    const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false, until_date: parole};
                    for (const group of groups)
                        bot.restrictChatMember(group.group_id, moderationInfo.UserHistory.user.userID, options);
                }
                // TODO notify federation
                bot.sendMessage(settings.channelID, `*${moderationInfo.UserHistory.user.username}*'s conduct due to this [message](${moderationInfo.message}) ([backup](${moderationInfo.messageBackup})) violated the [rules](${moderationInfo.rulesUrl}) for the ${calcPenaltyPhrase(calculateHistory.length-1)} ban.`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true});
            } else{
                bot.sendMessage(settings.channelID, `*${moderationInfo.UserHistory.user.username}*'s conduct due to this [message](${moderationInfo.message}) ([backup](${moderationInfo.messsageBackup})) violated the [rules](${moderationInfo.rulesUrl}). The conduct occured before *${moderationInfo.UserHistory.user.username}*'s latest effective ban. The next time ${moderationInfo.UserHistory.user.username} breaks the rules, the consequences are more severe.`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown', disable_web_page_preview: true}: {parse_mode: 'Markdown', disable_web_page_preview: true});
            }
        } else if (ban_level_current < ban_level_history){
                let liftbans = true;
                for (const ban_level of calculateHistory)
                    if (ban_level.timestamp_active > 0)
                        liftbans = false
                if(liftbans){
                    const options = {can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false};
                    bot.restrictChatMember(moderationInfo.UserHistory.group.groupID, moderationInfo.UserHistory.user.userID, options);
                    bot.sendMessage(settings.channelID, `*${moderationInfo.UserHistory.user.username}* has no other active reports. All bans are lifted.`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'});
                } else
                    bot.sendMessage(settings.channelID, `*${moderationInfo.UserHistory.user.username}* has other active reports, and is still restricted.`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'});
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