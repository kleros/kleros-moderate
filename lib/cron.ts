require('dotenv').config()
import {openDb, getGroupSettings, getRule, getCron, getMultilangGroup, getFederationChannel, getInviteURL, getFederatedFollowingBanHistory, getLocalBanHistory, getFederatedBanHistory, setCron, getGroupsInAndFollowingFederation, getReportMessageTimestampAndActive, setReport} from "./db";
import request from "graphql-request";
import {BigNumber} from "ethers";
import TelegramBot from "node-telegram-bot-api";
import langJson from "./telegram/assets/langNew.json";
import {Wallet} from "@ethersproject/wallet";
const {default: PQueue} = require('p-queue');
import {groupSettings, groupSettingsUnderspecified} from "../types";
const ModeratorBot = require('node-telegram-bot-api');
const Web3 = require('web3')
const realitio_bot = require('./realitioReporting')
const db = openDb();
const bot: any = new ModeratorBot(process.env.BOT_TOKEN, {polling: false, testEnvironment: false});  
const queue = new PQueue({intervalCap: 10, interval: 1000,carryoverConcurrencyCount: true});
// Only need DB for
// - channelID
// - finalizedReportCount
// Can put in DB or make template
// - language (for new reports)
// - rules (for new reports)
const exit = async () => {   
    await db.close()
    await bot.stopPolling({ cancel: true })
}

['SIGINT', 'SIGTERM', 'SIGQUIT','EXIT']
  .forEach(signal => process.on(signal, async () => {
    await exit()
    process.exit();
  }));

(async ()=> {
    const botaddress = (await new Wallet(process.env.PRIVATE_KEY)).address;
    var history = getCron(db)
    const web3 = new Web3(process.env.WEB3_PROVIDER_URL)
    const privateKey = process.env.PRIVATE_KEY
    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.add(account)
    const currentTime = Math.floor(Date.now()/1000)
    let currentBlock = await web3.eth.getBlockNumber()
    if (!history)
        history = {
            last_timestamp: currentTime,
            last_block: currentBlock
        }

    console.log(history.last_timestamp)
    console.log(history.last_block)

    let timestampLastUpdated = history.last_timestamp
    const isUpdated = await update(currentTime, timestampLastUpdated, botaddress);
    const updateBlock = Math.min(history.last_block+1000, currentBlock)
    try{
        await realitio_bot(web3, history.last_block, updateBlock, process.env.REALITY_ETH_V30, process.env.REALITIO_ARBITRATOR_EN);
        await realitio_bot(web3, history.last_block, updateBlock, process.env.REALITY_ETH_V30, process.env.REALITIO_ARBITRATOR_ES);
    } catch (e){
        console.log(e)
    }
    history.last_block = updateBlock
    if (isUpdated)
        timestampLastUpdated = currentTime
    setCron(db, history.last_block,timestampLastUpdated)
})()

const update = async (timestampNew: number, timestampLastUpdated: number,botaddress: string): Promise<boolean> =>{

    const reports = {};
    let delayQuestions = ""
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
    const queryModeration = getQuery(lastPageUpdated, timestampLastUpdated, botaddress, timestampNew)

    //console.log(queryModeration);
    //console.log('graphtime');
    //console.log(queryModeration)
    const moderationActions = await request(
        process.env.MODERATE_SUBGRAPH,
        queryModeration
    );
    console.log(JSON.stringify(moderationActions))
    var isUpdated = false;
    for (const data of moderationActions.disputesFinal) {
        isUpdated = true
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        // settings[1] language
        try{
            console.log(settings)
            const msgLink = data.moderationInfo.message;
            const disputeURL = `https://resolve.kleros.io/cases/${BigNumber.from(data.id).toNumber()}`;
            // check rulings, note down shift since reality uses 0,1 for no, yes and kleros uses 1,2 for no, yes
            const message = settings.lang === "es" ? (data.finalRuling === "2")? 'infringió las normas' : 'no infringió las normas' : (data.finalRuling === "2")? 'broke the rules' : 'did not break the rules'
            //console.log(data.finalRuling)
            try{
                if (settings.lang === "en")
                    queue.add(async () => {try{await bot.sendMessage(settings.channelID, `The [dispute](${disputeURL}) over [${data.moderationInfo.UserHistory.user.username}](tg://user?id=${data.moderationInfo.UserHistory.user.userID})'s [message](${msgLink}) ([backup](${data.moderationInfo.messageBackup})) resolved. *${data.moderationInfo.UserHistory.user.username}* ${message}`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'})}catch{}});
                else
                    queue.add(async () => {try{await bot.sendMessage(settings.channelID, `La [disputa](${disputeURL}) sobre el [mensaje](${msgLink}) ([backup](${data.moderationInfo.messageBackup})) de [${data.moderationInfo.UserHistory.user.username}](tg://user?id=${data.moderationInfo.UserHistory.user.userID})'s ha resuelto. *${data.moderationInfo.UserHistory.user.username}* ${message}`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'})}catch{}});
                    //bot.sendMessage(process.env.JUSTICE_LEAGUE, `The [dispute](${disputeURL}) over *${data.moderationInfo.UserHistory.user.username}*'s [message](${msgLink}) ([backup](${data.moderationInfo.messageBackup})) resolved. *${data.moderationInfo.UserHistory.user.username}* ${message}`, {parse_mode: 'Markdown'});
                handleTelegramUpdate(db, bot,settings, data.moderationInfo,timestampNew, data.finalRuling === "2", true, true);
            } catch(e){
                console.log(e)
            }

        } catch(e){
            console.log(e)
        }
    }

    for (const data of moderationActions.disputesAppealPossible) {
        isUpdated = true
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        const msgLink = data.moderationInfo.message;
        const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;
        const disputeURL = `https://resolve.kleros.io/cases/${BigNumber.from(data.id).toNumber()}`;
        // settings[1] language
        try{
            const chatobj = (await queue.add(async () => {try{const val = await bot.getChat(data.moderationInfo.UserHistory.group.groupID)
                return val}catch{}}))
            const chatname = chatobj?.title
            const isPrivate = !chatobj?.active_usernames
            const invite_url= isPrivate? '' : `https://t.me/${chatobj?.active_usernames[0]}`
            if (settings.lang === "en"){
                queue.add(async () => {try{await bot.sendMessage(settings.channelID, `The dispute over the [question](${realityURL}) about [${data.moderationInfo.UserHistory.user.username}](tg://user?id=${data.moderationInfo.UserHistory.user.userID})'s conduct due to the [message](${msgLink}) ([backup](${data.moderationInfo.messageBackup})) has concluded it's current round. *${data.moderationInfo.UserHistory.user.username}*'s conduct ${data.currentRuling == 2? 'broke the rules': 'did not break the rules'}. If you think the decision is incorrect, you can request an [appeal](${disputeURL})`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                if (settings.channelID !== process.env.SUSIE_SUPPORT_EN)
                    queue.add(async () => {try{await bot.sendMessage(process.env.SUSIE_SUPPORT_EN, `The dispute over the [question](${realityURL}) about *${data.moderationInfo.UserHistory.user.username}*'s conduct due to the [message](${msgLink}) ([backup](${data.moderationInfo.messageBackupup})) in the group [${chatname}](${invite_url}) has concluded it's current round. *${data.moderationInfo.UserHistory.user.username}*'s conduct ${data.currentRuling == 2? 'broke the rules': 'did not break the rules'}. If you think the decision is incorrect, you can request an [appeal](${disputeURL})`, {message_thread_id: process.env.JUSTICE_LEAGUE_EN, parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                if(settings.federation_id){
                    const fedNotificationChannel = getFederationChannel(db, 'telegram',settings.federation_id)
                    if (fedNotificationChannel)
                        queue.add(async () => {try{await bot.sendMessage(fedNotificationChannel, `The dispute over the [question](${realityURL}) about *${data.moderationInfo.UserHistory.user.username}*'s conduct due to the [message](${msgLink}) ([backup](${data.moderationInfo.messageBackupup})) in the group [${chatname}](${invite_url})has concluded it's current round. *${data.moderationInfo.UserHistory.user.username}*'s conduct ${data.currentRuling == 2? 'broke the rules': 'did not break the rules'}. If you think the decision is incorrect, you can request an [appeal](${disputeURL})`, {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                }
            } else {
                queue.add(async () => {try{await bot.sendMessage(settings.channelID, `La disputa sobre la [pregunta](${realityURL}) acerca de la conducta de [${data.moderationInfo.UserHistory.user.username}](tg://user?id=${data.moderationInfo.UserHistory.user.userID})'s debido al [mensaje](${msgLink}) ([backup](${data.moderationInfo.messageBackupup})) ha concluido su ronda actual. La conducta de *${data.moderationInfo.UserHistory.user.username}* ${data.currentRuling == 2? 'infringió las normas': 'no infringió las normas'}. Si crees que la decisión es incorrecta, puedes solicitar una [apelación](${disputeURL})`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                if (settings.channelID !== process.env.SUSIE_SUPPORT_ES)
                    queue.add(async () => {try{await bot.sendMessage(process.env.SUSIE_SUPPORT_ES, `La disputa sobre la [pregunta](${realityURL}) acerca de la conducta de *${data.moderationInfo.UserHistory.user.username}* debido al [mensaje](${msgLink}) ([backup](${data.moderationInfo.messageBackupup})) en el grupo [${chatname}](${invite_url}) ha concluido su ronda actual. La conducta de *${data.moderationInfo.UserHistory.user.username}* ${data.currentRuling == 2? 'infringió las normas': 'no infringió las normas'}. Si crees que la decisión es incorrecta, puedes solicitar una [apelación](${disputeURL})`, {message_thread_id: process.env.JUSTICE_LEAGUE_ES, parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                if(settings.federation_id){
                    const fedNotificationChannel = getFederationChannel(db, 'telegram',settings.federation_id)
                    if (fedNotificationChannel)
                        queue.add(async () => {try{await bot.sendMessage(fedNotificationChannel, `La disputa sobre la [pregunta](${realityURL}) acerca de la conducta de *${data.moderationInfo.UserHistory.user.username}* debido al [mensaje](${msgLink}) ([backup](${data.moderationInfo.messageBackupup})) en el grupo [${chatname}](${invite_url}) ha concluido su ronda actual. La conducta de *${data.moderationInfo.UserHistory.user.username}* ${data.currentRuling == 2? 'infringió las normas': 'no infringió las normas'}. Si crees que la decisión es incorrecta, puedes solicitar una [apelación](${disputeURL})`, {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
               }
            }
        } catch(e){
            console.log(e)
        }
    }

    for (const data of moderationActions.disputesCreated) {
        isUpdated = true
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        // settings[1] language
        const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;
        const disputeURL = `https://resolve.kleros.io/cases/${BigNumber.from(data.id).toNumber()}`;
        try{
            const chatobj = (await queue.add(async () => {try{const val = await bot.getChat(data.moderationInfo.UserHistory.group.groupID)
                return val}catch{}}))
            const chatname = chatobj?.title
            const isPrivate = !chatobj.active_usernames
            const invite_url= isPrivate? '' : `https://t.me/${chatobj?.active_usernames[0]}`
            const msg_penalty = settings.lang === 'en' ? settings.enforcement? `Consequences of the report are lifted for the duration of the [dispute](${disputeURL}) (on [Gnosis Chain](https://chainlist.org/chain/100)).` : `I recommend that any preliminary penalties due to the report be lifted for the duration of the [dispute](${disputeURL}) (on [Gnosis Chain](https://chainlist.org/chain/100)).` : settings.enforcement? `Las consecuencias de la denuncia se levantan mientras dure la [disputa](${disputeURL}) (en [Gnosis Chain](https://chainlist.org/chain/100)).` : `Recomiendo que se levanten las sanciones preliminares debidas al informe mientras dure la [disputa](${disputeURL}) (en [Gnosis Chain](https://chainlist.org/chain/100)).`
            if (settings.lang === "en"){
                queue.add(async () => {try{await bot.sendMessage(settings.channelID, `Arbitration is requested for the [question](${realityURL}) about [${data.moderationInfo.UserHistory.user.username}](tg://user?id=${data.moderationInfo.UserHistory.user.userID})'s conduct due to the [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})). ${msg_penalty}`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                if (!isPrivate){
                    if (settings.channelID !== process.env.SUSIE_SUPPORT_EN)
                        queue.add(async () => {try{await bot.sendMessage(process.env.SUSIE_SUPPORT_EN, `[Arbitration](${disputeURL}) is requested for the [question](${realityURL}) about *${data.moderationInfo.UserHistory.user.username}*'s conduct due to the [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})) in the group [${chatname}](${invite_url}).`, {message_thread_id: process.env.JUSTICE_LEAGUE_EN, parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                    if(settings.federation_id){
                        const fedNotificationChannel = getFederationChannel(db, 'telegram',settings.federation_id)
                        if (fedNotificationChannel)
                            queue.add(async () => {try{await bot.sendMessage(fedNotificationChannel, `[Arbitration](${disputeURL}) is requested for the [question](${realityURL}) about *${data.moderationInfo.UserHistory.user.username}*'s conduct due to the [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})) in the group [${chatname}](${invite_url}).`, {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}}); 
                    }
                }
            } else {
                queue.add(async () => {try{await bot.sendMessage(settings.channelID, `Se solicita arbitraje para la [pregunta](${realityURL}) sobre la conducta de *${data.moderationInfo.UserHistory.user.username}* debido al [mensaje](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})). ${msg_penalty}`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                if(!isPrivate){
                    if (settings.channelID !== process.env.SUSIE_SUPPORT_ES)
                        queue.add(async () => {try{await bot.sendMessage(process.env.SUSIE_SUPPORT_ES, `Se solicita [arbitraje](${disputeURL}) para la [pregunta](${realityURL}) sobre la conducta de *${data.moderationInfo.UserHistory.user.username}* debido al [mensaje](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup}) en el grupo [${chatname}](${invite_url}).`, {message_thread_id: process.env.JUSTICE_LEAGUE_EN, parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                    if(settings.federation_id){
                        const fedNotificationChannel = getFederationChannel(db, 'telegram',settings.federation_id)
                        if (fedNotificationChannel)
                            queue.add(async () => {try{await bot.sendMessage(fedNotificationChannel, `Se solicita [arbitraje](${disputeURL}) para la [pregunta](${realityURL}) sobre la conducta de *${data.moderationInfo.UserHistory.user.username}* debido al [mensaje](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup}) en el grupo [${chatname}](${invite_url}).`, {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}}); 
                    }
                }
            }
            handleTelegramUpdate(db, bot,settings, data.moderationInfo,timestampNew, false, false, true);
        } catch (e){
            console.log(e)
        }
    }

    for (const data of moderationActions.disputesAppealFunded) {
        isUpdated = true
        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        const msgLink = data.moderationInfo.message;
        const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;
        const disputeURL = `https://resolve.kleros.io/cases/${BigNumber.from(data.id).toNumber()}`;
        // settings[1] language
        try{
            const chatobj = (await queue.add(async () => {try{const val = await bot.getChat(data.moderationInfo.UserHistory.group.groupID)
                return val}catch{}}))
            const chatname = chatobj?.title
            const isPrivate = !chatobj.active_usernames
            const invite_url= isPrivate? '' : `https://t.me/${chatobj?.active_usernames[0]}`
            if (settings.lang === "en"){
                queue.add(async () => {try{await bot.sendMessage(settings.channelID, `An appeal has been funded in the dispute over the [question](${realityURL}) about [${data.moderationInfo.UserHistory.user.username}](tg://user?id=${data.moderationInfo.UserHistory.user.userID})'s conduct due to the [message](${msgLink}) ([backup](${data.moderationInfo.messageBackupup})). Juror's voted in the previous round that *${data.moderationInfo.UserHistory.user.username}*'s conduct ${data.currentRuling == 2? 'broke the rules': 'did not break the rules'}. The contribution funded ${data.RulingFunded == data.currentRuling ? 'the previous round winning option': 'a different option that the previous round'}. If you think the funded option is incorrect, you can win some of their deposit by funding the correct side of the [appeal](${disputeURL})`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                if (settings.channelID !== process.env.SUSIE_SUPPORT_EN)
                    queue.add(async () => {try{await bot.sendMessage(process.env.SUSIE_SUPPORT_EN, `An appeal has been funded in the dispute over the [question](${realityURL}) about *${data.moderationInfo.UserHistory.user.username}*'s conduct due to the [message](${msgLink}) ([backup](${data.moderationInfo.messageBackupup})) in the group ${chatname}[${invite_url}]. Juror's voted in the previous round that *${data.moderationInfo.UserHistory.user.username}*'s conduct ${data.currentRuling == 2? 'broke the rules': 'did not break the rules'}. The contribution funded ${data.RulingFunded == data.currentRuling ? 'the previous round winning option': 'a different option that the previous round'}. If you think the funded option is incorrect, you can win some of their deposit by funding the correct side of the [appeal](${disputeURL})`, {message_thread_id: process.env.JUSTICE_LEAGUE_EN, parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                if(settings.federation_id){
                    const fedNotificationChannel = getFederationChannel(db, 'telegram',settings.federation_id)
                    if (fedNotificationChannel)
                        queue.add(async () => {try{await bot.sendMessage(getFederationChannel(db, 'telegram',settings.federation_id), `An appeal has been funded in the dispute over the [question](${realityURL}) about *${data.moderationInfo.UserHistory.user.username}*'s conduct due to the [message](${msgLink}) ([backup](${data.moderationInfo.messageBackupup})) in the group ${chatname}[${invite_url}]. Juror's voted in the previous round that *${data.moderationInfo.UserHistory.user.username}*'s conduct ${data.currentRuling == 2? 'broke the rules': 'did not break the rules'}. The contribution funded ${data.RulingFunded == data.currentRuling ? 'the previous round winning option': 'a different option that the previous round'}. If you think the funded option is incorrect, you can win some of their deposit by funding the correct side of the [appeal](${disputeURL})`, {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                }
            } else {
                queue.add(async () => {try{await bot.sendMessage(settings.channelID, `Se ha financiado una apelación en la disputa sobre la [pregunta](${realityURL}) acerca de la conducta de [${data.moderationInfo.UserHistory.user.username}](tg://user?id=${data.moderationInfo.UserHistory.user.userID})'s debido al [mensaje](${msgLink}) ([backup](${data.moderationInfo.messageBackupup})). El jurado votó en la ronda anterior que la conducta de *${data.moderationInfo.UserHistory.user.username}* ${data.currentRuling == 2? 'infringió las normas': 'no infringió las normas'}. La contribución financió ${data.RulingFunded == data.currentRuling ? 'la opción ganadora de la ronda anterior': 'una opción diferente a la de la ronda anterior'}. Si crees que la opción financiada es incorrecta, puedes ganar parte de su depósito financiando la parte correcta del [apelación](${disputeURL})`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                if (settings.channelID !== process.env.SUSIE_SUPPORT_ES)
                    queue.add(async () => {try{await bot.sendMessage(process.env.SUSIE_SUPPORT_ES, `Se ha financiado una apelación en la disputa sobre la [pregunta](${realityURL}) acerca de la conducta de *${data.moderationInfo.UserHistory.user.username}* debido al [mensaje](${msgLink}) ([backup](${data.moderationInfo.messageBackupup})) en el grupo ${chatname}[${invite_url}]. El jurado votó en la ronda anterior que la conducta de *${data.moderationInfo.UserHistory.user.username}* ${data.currentRuling == 2? 'infringió las normas': 'no infringió las normas'}. La contribución financió ${data.RulingFunded == data.currentRuling ? 'la opción ganadora de la ronda anterior': 'una opción diferente a la de la ronda anterior'}. Si crees que la opción financiada es incorrecta, puedes ganar parte de su depósito financiando la parte correcta del [apelación](${disputeURL})`, {message_thread_id: process.env.JUSTICE_LEAGUE_ES, parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                if(settings.federation_id){
                    const fedNotificationChannel = getFederationChannel(db, 'telegram',settings.federation_id)
                    if (fedNotificationChannel)
                    queue.add(async () => {try{await bot.sendMessage(getFederationChannel(db, 'telegram',settings.federation_id), `Se ha financiado una apelación en la disputa sobre la [pregunta](${realityURL}) acerca de la conducta de *${data.moderationInfo.UserHistory.user.username}* debido al [mensaje](${msgLink}) ([backup](${data.moderationInfo.messageBackupup})) en el grupo ${chatname}[${invite_url}]. El jurado votó en la ronda anterior que la conducta de *${data.moderationInfo.UserHistory.user.username}* ${data.currentRuling == 2? 'infringió las normas': 'no infringió las normas'}. La contribución financió ${data.RulingFunded == data.currentRuling ? 'la opción ganadora de la ronda anterior': 'una opción diferente a la de la ronda anterior'}. Si crees que la opción financiada es incorrecta, puedes ganar parte de su depósito financiando la parte correcta del [apelación](${disputeURL})`, {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                }
            }
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
    isUpdated = true
    const settings = validate(data.moderationInfo.UserHistory.group.groupID);
    // settings[1] language
    try{
        //bot.sendMessage(settings[0], `The reality question ${data.id} is finalized with ${data.currentAnswer}`);
        //const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;
        //bot.sendMessage(settings.channelID, `The [report](${realityURL}) is finalized.`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'});
        //bot.sendMessage(process.env.JUSTICE_LEAGUE,  `The [report](${realityURL}) is finalized.`, {parse_mode: 'Markdown'});
        // finalize
        handleTelegramUpdate(db, bot, settings, data.moderationInfo, timestampNew, data.currentAnswer === "0x0000000000000000000000000000000000000000000000000000000000000001", true, false);
    } catch(e){
        console.log(e)
    }
}
for(const data of moderationActions.realityQuestionAnsweredNotFinalized){
    isUpdated = true
    //console.log(data.moderationInfo.UserHistory.group)
    const settings = validate(data.moderationInfo.UserHistory.group.groupID);
    // settings[1] language
    try{
        const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;
        const answer = data.currentAnswer === "0x0000000000000000000000000000000000000000000000000000000000000001" ? (settings.lang === 'en'? "yes": 'si') : "no";
        //console.log('answeredbeg')
        const chat = (await queue.add(async () => {try{const val = await bot.getChat(data.moderationInfo.UserHistory.group.groupID)
            return val}catch{}}))
        const chatname = chat?.title
        const isPrivate = !chat?.active_usernames
        const invite_url= isPrivate? '' : `https://t.me/${chat?.active_usernames[0]}`

        if (settings.lang === 'en'){
            queue.add(async () => {try{await bot.sendMessage(settings.channelID, `The question\n\n"Did [${data.moderationInfo.UserHistory.user.username}](tg://user?id=${data.moderationInfo.UserHistory.user.userID})'s conduct due to this [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})) violate the [rules](${data.moderationInfo.rulesUrl})?\"\n\nis answered with *${answer}*.\n\nDo you think this answer is true? If not, you can [correct](${realityURL}) the answer.`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
            if (!isPrivate){
                if (settings.channelID !== process.env.SUSIE_SUPPORT_EN)
                    queue.add(async () => {try{await bot.sendMessage(process.env.SUSIE_SUPPORT_EN, `The question\n\n"Did *${data.moderationInfo.UserHistory.user.username}*'s conduct due to this [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})) in the group [${chatname}](${invite_url}) violate the [rules](${data.moderationInfo.rulesUrl})?\"\n\nis answered with *${answer}*.\n\nDo you think this answer is true? If not, you can [correct](${realityURL}) the answer.`, {message_thread_id: process.env.JUSTICE_LEAGUE_EN, parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});            
                if(settings.federation_id){
                    const fedNotificationChannel = getFederationChannel(db, 'telegram',settings.federation_id)
                    if (fedNotificationChannel)
                        queue.add(async () => {try{await bot.sendMessage(getFederationChannel(db, 'telegram',settings.federation_id), `The question\n\n"Did *${data.moderationInfo.UserHistory.user.username}*'s conduct due to this [message](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup})) in the group [${chatname}](${invite_url}) violate the [rules](${data.moderationInfo.rulesUrl})?\"\n\nis answered with *${answer}*.\n\nDo you think this answer is true? If not, you can [correct](${realityURL}) the answer.`, {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                }
            }
        }else{
            queue.add(async () => {try{await bot.sendMessage(settings.channelID, `La pregunta\n\n"¿Ha infringido el usuario [${data.moderationInfo.UserHistory.user.username}](tg://user?id=${data.moderationInfo.UserHistory.user.userID})'s las [reglas](${data.moderationInfo.rulesUrl}) mediante conductas relacionadas con el [mensaje](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup}))?\"\n\nse responde con un *${answer}*.\n\n¿Crees que esta respuesta es verdadera? Si no es así, puedes [corregir](${realityURL}) la respuesta.`, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});                if (settings.channelID !== process.env.SUSIE_SUPPORT_ES)
            if (!isPrivate){
                if (settings.channelID !== process.env.SUSIE_SUPPORT_ES)
                    queue.add(async () => {try{await bot.sendMessage(process.env.SUSIE_SUPPORT_ES, `La pregunta\n\n"¿Ha infringido el usuario *${data.moderationInfo.UserHistory.user.username}* en el grupo [${chatname}](${invite_url}) las [reglas](${data.moderationInfo.rulesUrl}) mediante conductas relacionadas con el [mensaje](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup}))?\"\n\nse responde con un *${answer}*.\n\n¿Crees que esta respuesta es verdadera? Si no es así, puedes [corregir](${realityURL}) la respuesta.`, {message_thread_id: process.env.JUSTICE_LEAGUE_ES, parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                if(settings.federation_id){
                    const fedNotificationChannel = getFederationChannel(db, 'telegram',settings.federation_id)
                    if (fedNotificationChannel)
                        queue.add(async () => {try{await bot.sendMessage(fedNotificationChannel, `La pregunta\n\n"¿Ha infringido el usuario *${data.moderationInfo.UserHistory.user.username}* en el grupo [${chatname}](${invite_url}) las [reglas](${data.moderationInfo.rulesUrl}) mediante conductas relacionadas con el [mensaje](${data.moderationInfo.message}) ([backup](${data.moderationInfo.messageBackup}))?\"\n\nse contesta con *${answer}*.\n¿Crees que esta respuesta es cierta? Si no es así, puedes [corregir](${realityURL}) la respuesta.`, {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
                }
            }
        }
        handleTelegramUpdate(db, bot, settings, data.moderationInfo, timestampNew, data.currentAnswer === "0x0000000000000000000000000000000000000000000000000000000000000001", false, false);
    } catch(e){
        console.log(e)
    }
}
    // promise queue example
    for(const data of moderationActions.sheriffs){
        isUpdated = true
        const settings = validate(data.group.groupID);
        // settings[1] language
        try{
            const sherrif = await queue.add(async () => {try{const val = await bot.getChatMember(data.group.groupID, data.sheriff.user.userID)
                return val}catch{}});
                if(!sherrif)
                continue
            //console.log(sherrif)
            const fromUsername = (sherrif.user.username || sherrif.user.first_name || `no-username-set`);
            queue.add(async () => {try{await bot.sendMessage(data.group.groupID, `${langJson[settings.lang].reputation.sheriff} 🥇🤠[${fromUsername}](tg://user?id=${sherrif.user.id})🤠🥇`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'})}catch{}});
        } catch(e){
            console.log(e)
        }
    }

    for(const data of moderationActions.deputySheriffs){
        isUpdated = true
        const settings = validate(data.group.groupID);
        // settings[1] language
        try{
            const deputysherrif = await queue.add(async () => {try{const val = await bot.getChatMember(data.group.groupID, data.deputySheriff.user.userID)
                return val}catch{}})
                if(!deputysherrif)
                continue
            const fromUsername = (deputysherrif.user.username || deputysherrif.user.first_name || `no-username-set`);
            queue.add(async () => {try{await bot.sendMessage(data.group.groupID, `${langJson[settings.lang].reputation.deputy} 🥈[${fromUsername}](tg://user?id=${deputysherrif.user.id})🥈`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'})}catch{}});
        } catch(e){
            console.log(e)
        }
    }

    for(const data of moderationActions.ranks){
        isUpdated = true
        const settings = validate(data.group.groupID);
        // settings[1] language
        try{
            const userUpdate = await queue.add(async () => {try{const val = await bot.getChatMember(data.group.groupID, data.user.userID)
                return val}catch{}})
                if(!userUpdate)
                continue

            const fromUsername = (userUpdate.user.username || userUpdate.user.first_name || `no-username-set`);
            let message = ""
            if (data.status === "GoodSamaritan"){
                message = langJson[settings.lang].reputation.samaritan
            } else if (data.status === "NeighborhoodWatch"){
                message = langJson[settings.lang].reputation.NeighborhoodWatch
            } else if (data.status === "BoyWhoCriedWolf"){
                message = langJson[settings.lang].reputation.BoyWhoCriedWolf
            }
            if(data.status !== "CommunityMember")
                queue.add(async () => {try{await bot.sendMessage(data.group.groupID, `${message} [${fromUsername}](tg://user?id=${userUpdate.user.id})`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'})}catch{}});
        } catch(e){
            console.log(e)
        }
    }
    await queue.onIdle()
    return isUpdated
}

const delay = (delayInms) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
  }

const delayCheck = async (realityQuestions: string, lastPageUpdated: number, timestampNew: number, timestampLastUpdated: number, botaddress: string) => {
    const queryModeration = getQueryDelay(lastPageUpdated, realityQuestions, timestampLastUpdated, botaddress, timestampNew)
    // 3 min delay
    await delay(180000)
    //console.log(queryModeration);
    //console.log('graphtime');
    //console.log(queryModeration)
    const moderationActionsDelay = await request(
        process.env.MODERATE_SUBGRAPH,
        queryModeration
    );

    for(const data of moderationActionsDelay.realityQuestionAnsweredNotFinalizedDelayed){
        //console.log(data.moderationInfo.UserHistory.group)

        const settings = validate(data.moderationInfo.UserHistory.group.groupID);
        // settings[1] language
        try{
            //const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${data.moderationInfo.id}`;
            //const answer = data.currentAnswer === "0x0000000000000000000000000000000000000000000000000000000000000001" ? (settings.lang === 'en'? "yes": 'si') : "no";
            //console.log('answeredbeg')
            //console.log(data)
            //console.log(data.moderationInfo.UserHistory)
            //console.log('answered')
        } catch(e){
            console.log(e)
        }
        handleTelegramUpdate(db, bot,settings, data.moderationInfo,timestampNew, data.currentAnswer === "0x0000000000000000000000000000000000000000000000000000000000000001", false, false);
    }
}

const validate = (chatId: string): groupSettings=> {
    const defaultSettings: groupSettings = {
        lang: 'en',
        rules: langJson['en'].defaultRules,
        channelID: '',
        greeting_mode: false,
        captcha: false,
        admin_reportable: false,
        enforcement: true,
        thread_id_rules: '',
        thread_id_welcome: '',
        thread_id_notifications: '',
        federation_id: '',
        federation_id_following: ''
    }
    var groupSettings : groupSettingsUnderspecified = getGroupSettings(db, 'telegram', chatId)
    groupSettings.rules = getRule(db, 'telegram', chatId, Math.floor(Date.now()/1000))?.rules

    const fullSettings = {
        lang: groupSettings?.lang ?? defaultSettings.lang,
        rules: groupSettings?.rules ?? defaultSettings.rules,
        channelID: groupSettings?.channelID ?? chatId,
        greeting_mode: groupSettings?.greeting_mode ?? defaultSettings.greeting_mode,
        admin_reportable: groupSettings?.admin_reportable ?? defaultSettings.admin_reportable,
        captcha: groupSettings?.captcha ?? defaultSettings.captcha,
        enforcement: groupSettings?.enforcement ?? defaultSettings.enforcement,
        thread_id_rules: groupSettings?.thread_id_rules ?? defaultSettings.thread_id_rules,
        thread_id_welcome: groupSettings?.thread_id_welcome ?? defaultSettings.thread_id_rules,
        thread_id_notifications: groupSettings?.thread_id_notifications ?? defaultSettings.thread_id_notifications,
        federation_id: groupSettings?.federation_id ?? defaultSettings.federation_id,
        federation_id_following: groupSettings?.federation_id_following ?? defaultSettings.federation_id,
    }
    return fullSettings
}

const calcPenalty = (ban_level: number, timestamp_finalized: number): number => {
    if(ban_level == 3)
        return  timestamp_finalized + 31536000
    else if (ban_level == 2)
        return  timestamp_finalized + 604800
    else
        return  timestamp_finalized + 86400
}

const calcPenaltyPhrase = (settings: groupSettings, ban_level: number, enforcement: boolean, finalize: boolean, realityURL: string): string => {

    if (settings.lang === 'es'){
        if(ban_level == 1)
            return finalize? enforcement? 'primera vez y está sujeta a un baneo de 1 día' : 'primera vez y se recomienda una prohibición de 1 día' : enforcement? `primera vez y se silencia durante 1 día durante el resto del periodo del [informe](${realityURL})`: `primera vez y se le recomienda un silencio de 1 día por el resto del período del [informe](${realityURL})`
        else if (ban_level == 2)
            return finalize? enforcement? 'segunda vez y está sujeto a una prohibición de 1 semana' : 'segunda vez y se recomienda una prohibición de 1 semana': enforcement? `segunda vez y se silencia durante 1 día durante el resto del periodo del [informe](${realityURL})`: `segunda vez y se le recomienda un silencio de 1 día para el resto del periodo del [informe](${realityURL})`
        else
            return finalize? enforcement? 'tercera vez y está sujeto a una prohibición de 1 mes' : 'tercera vez y se recomienda una prohibición de 1 mes' : enforcement? `trecera vez y se silencia durante 1 día durante el resto del periodo del [informe](${realityURL})`: `tercera vez y se le recomienda un silencio de 1 día por el resto del período del [informe](${realityURL})`
    } else {
        if(ban_level == 1)
            return finalize? enforcement? 'first time and is subject to a 1 day ban' : 'first time and is recommended a 1 day ban' : enforcement? `first time and is muted for 1 day during the remainder of the [report](${realityURL})`: `first time and is recommended a 1 day mute for the remainder of the [report](${realityURL})`
        else if (ban_level == 2)
            return finalize? enforcement? 'second time and is subject to a 1 week ban' : 'second time and is recommended a 1 week ban': enforcement? `second time and is muted for 1 day during the remainder of the [report](${realityURL})`: `second time and is recommended a 1 day mute for the remainder of the [report](${realityURL})`
        else
            return finalize? enforcement? 'third time and is subject to a 1 month ban' : 'third time and is recommended a 1 month ban' : enforcement? `third time and is muted for 1 day during the remainder of the [report](${realityURL})`: `third time and is recommended a 1 day mute for the remainder of the [report](${realityURL})`
    }
}

const handleTelegramUpdate = async (db: any, bot: any, settings: groupSettings, moderationInfo: any, timestampNew: number, restrict: boolean, finalize: boolean, disputed: boolean) => {
    try{
        console.log('UPDATE#########')
        console.log(settings)
        const reportInfo = getReportMessageTimestampAndActive(db, moderationInfo.id)
        if (!reportInfo) return;
        let calculateHistory = []
        if (settings.federation_id){
            calculateHistory = getFederatedBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,settings.federation_id,finalize)
        }
        else if (settings.federation_id_following){
            calculateHistory = getFederatedFollowingBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,moderationInfo.UserHistory.group.groupID,settings.federation_id_following,finalize)
        } else 
            calculateHistory = getLocalBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,moderationInfo.UserHistory.group.groupID,finalize)

        const ban_level_history = calculateHistory.length
        setReport(db, moderationInfo.id,restrict,true,finalize,disputed, finalize? 0 : (restrict? timestampNew: 0), finalize? timestampNew: 0)

        if (settings.federation_id){
            calculateHistory = getFederatedBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,settings.federation_id,finalize)
        } else {
            if (settings.federation_id_following){
                calculateHistory = getFederatedFollowingBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,moderationInfo.UserHistory.group.groupID,settings.federation_id_following,finalize)
            } else 
                calculateHistory = getLocalBanHistory(db, 'telegram', moderationInfo.UserHistory.user.userID,moderationInfo.UserHistory.group.groupID,finalize)
        }

        const ban_level_current = calculateHistory.length
        console.log(calculateHistory)
        const groups = settings.federation_id? getGroupsInAndFollowingFederation(db,'telegram',settings.federation_id) : [{group_id: moderationInfo.UserHistory.group.groupID}]
        const realityURL = `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${moderationInfo.id}`;

        if (restrict){
            // TODO federation subscriptions

            if (ban_level_current > ban_level_history){
                const parole = calcPenalty(ban_level_current,timestampNew)
                if (settings.enforcement){
                    if(finalize){
                        // if message reported timestamp is before the most recent finalized ban / penality, users deserve a second chance, no action taken
                        // philosophy is only escalate the penalties after the user is warned with a temporary ban. 
                        // this report changed penalties, recalculate all
                        //console.log(moderationInfo.UserHistory.group.groupID)
                        for (const group of groups){
                            queue.add(async () => {try{await bot.banChatMember(group.group_id, moderationInfo.UserHistory.user.userID, {until_date: parole})}catch (e){console.log(e)}});
                        }
                    } else if(!finalize){
                        const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false, until_date: parole};
                        for (const group of groups){
                            queue.add(async () => {try{await bot.restrictChatMember(group.group_id, moderationInfo.UserHistory.user.userID, options)}catch(e){console.log(e)}});
                        }
                    }
                }
                const msg_enforcement = settings.lang === 'es'? `la conducta de *${moderationInfo.UserHistory.user.username}* por este [mensaje](${moderationInfo.message}) ([backup](${moderationInfo.messageBackup})) mensaje viola las [reglas](${moderationInfo.rulesUrl}) por ${calcPenaltyPhrase(settings, ban_level_current, settings.enforcement, finalize, realityURL)}.` : `*${moderationInfo.UserHistory.user.username}*'s conduct due to this [message](${moderationInfo.message}) ([backup](${moderationInfo.messageBackup})) violated the [rules](${moderationInfo.rulesUrl}) for the ${calcPenaltyPhrase(settings, ban_level_current, settings.enforcement, finalize, realityURL)}.`
                queue.add(async () => {try{await bot.sendMessage(settings.channelID, msg_enforcement, settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown',disable_web_page_preview: true}: {parse_mode: 'Markdown',disable_web_page_preview: true})}catch{}});
            } else{
                const i = calculateHistory.findIndex(e => e.question_id === moderationInfo.id);
                if (i > -1) {
                    queue.add(async () => {try{await bot.sendMessage(settings.channelID, `*${moderationInfo.UserHistory.user.username}*'s conduct due to this [message](${moderationInfo.message}) ([backup](${moderationInfo.messageBackup})) violated the [rules](${moderationInfo.rulesUrl}) for the ${calcPenaltyPhrase(settings, ban_level_current, settings.enforcement, finalize, realityURL)}.`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown', disable_web_page_preview: true}: {parse_mode: 'Markdown', disable_web_page_preview: true})}catch{}});
                } else
                    queue.add(async () => {try{await bot.sendMessage(settings.channelID, `*${moderationInfo.UserHistory.user.username}*'s conduct due to this [message](${moderationInfo.message}) ([backup](${moderationInfo.messageBackup})) violated the [rules](${moderationInfo.rulesUrl}). The conduct occured before *${moderationInfo.UserHistory.user.username}*'s latest confirmed report, so the user is recommended to get a second chance --- they should have been penalized already.`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown', disable_web_page_preview: true}: {parse_mode: 'Markdown', disable_web_page_preview: true})}catch{}});
            }
        } else if (ban_level_current < ban_level_history){
                let liftbans = true;
                let timestamp_most_recent = 0

                for (const ban_level of calculateHistory)
                    if (timestamp_most_recent< ban_level.timestamp_active)
                        timestamp_most_recent = ban_level.timestamp_active

                if (calcPenalty(calculateHistory.length, timestamp_most_recent) > timestampNew)
                    liftbans = false      
                if(liftbans){
                    if (settings.enforcement)
                        for (const group of groups){
                            if(group.group_id == moderationInfo.UserHistory.group.groupID){
                                const permissions = await queue.add(async () => {try{const val = (await bot.getChat(moderationInfo.UserHistory.group.groupID)).permissions
                                    return val}catch{}})
                                    if(!permissions)
                                    return
                                queue.add(async () => {try{await bot.restrictChatMember(moderationInfo.UserHistory.group.groupID, moderationInfo.UserHistory.user.userID, permissions)}catch{}});
                            }
                        }
                    const msg_update = settings.lang === "en" ? `*${moderationInfo.UserHistory.user.username}*'s has no other active reports. All bans should be lifted.` : `*${moderationInfo.UserHistory.user.username}* no tiene otros informes activos. Todas las prohibiciones deben ser levantadas.`
                    queue.add(async () => {try{await bot.sendMessage(settings.channelID, msg_update,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'})}catch{}});
                } else {
                    const msg_update = settings.lang === "en" ? `*${moderationInfo.UserHistory.user.username}* has other active reports and should remain restricted.` : `*${moderationInfo.UserHistory.user.username}* tiene otros informes activos y debe permanecer restringido.`
                    queue.add(async () => {try{await bot.sendMessage(settings.channelID, `*${moderationInfo.UserHistory.user.username}* has other active reports and should remain restricted.`,settings.thread_id_notifications? {message_thread_id: settings.thread_id_notifications, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'})}catch{}});
                }
            }
    } catch(e){
        console.log(e)
    }
}

const moderationInfoContent = `        id
message
messageBackup
moderationType
rulesUrl
UserHistory{
    countBrokeRulesArbitrated
    group {
        groupID
    }
    user {
        username
        userID
    }
}`;

const getQuery = (lastPageUpdated: number, timestampLastUpdated: number, botaddress: string, timestampNew: number): string => {
    const moderationInfo = `moderationInfo {
        ${moderationInfoContent}
            }`;
return `{
        disputesFinal: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastUpdated_gt: ${timestampLastUpdated}, timestampLastUpdated_lt: ${timestampNew}, finalRuling_not: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            finalRuling
            ${moderationInfo}
        }
        disputesAppealPossible: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastAppealPossible_gt: ${timestampLastUpdated}, timestampLastAppealPossible_lt: ${timestampNew}, finalRuling: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            currentRuling
            ${moderationInfo}
        }
        disputesAppeal: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastAppeal_gt: ${timestampLastUpdated}, timestampLastAppeal_lt: ${timestampNew}, finalRuling: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            currentRuling
            ${moderationInfo}
        }
        disputesCreated: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastUpdated_gt: ${timestampLastUpdated}, timestampLastUpdated_lt: ${timestampNew}, finalRuling: null, currentRuling: null, rulingFunded: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            ${moderationInfo}
        }
        disputesAppealFunded: moderationDisputes(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastAppealPossible_gt: ${timestampLastUpdated}, , timestampLastAppealPossible_lt: ${timestampNew}, rulingFunded_not: null, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            rulingFunded
            currentRuling
            ${moderationInfo}
        }
        realityQuestionUnansweredFinalized: moderationInfos(first: 1000, skip: ${lastPageUpdated*1000}, where: {deadline_gt: ${timestampLastUpdated}, deadline_lt: ${timestampNew}, reality: null, askedBy: "${botaddress}"}) {
            ${moderationInfoContent}
        }
        realityQuestionAnsweredFinalized: realityChecks(first: 1000, skip: ${lastPageUpdated*1000}, where: {deadline_gt: ${timestampLastUpdated}, dispute: null, deadline_lt: ${timestampNew}, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            timestampLastUpdated
            currentAnswer
            timeServed
            ${moderationInfo}
        }
        realityQuestionAnsweredNotFinalized: realityChecks(first: 1000, skip: ${lastPageUpdated*1000}, where: {deadline_gt: ${timestampNew}, dispute: null, timestampLastUpdated_gt: ${timestampLastUpdated}, timestampLastUpdated_lt: ${timestampNew}, moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            currentAnswer
            timestampLastUpdated
            ${moderationInfo}
        }
        sheriffs: jannies(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastUpdatedSheriff_gt: ${timestampLastUpdated}, timestampLastUpdatedSheriff_lt: ${timestampNew}, group_: {botAddress: "${botaddress}"}}) {
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
        deputySheriffs: jannies(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampLastUpdatedDeputySheriff_gt: ${timestampLastUpdated}, timestampLastUpdatedDeputySheriff_lt: ${timestampNew}, group_: {botAddress: "${botaddress}"}}) {
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
        ranks: userHistories(first: 1000, skip: ${lastPageUpdated*1000}, where: {timestampStatusUpdated_gt: ${timestampLastUpdated}, timestampStatusUpdated_lt: ${timestampNew}, group_: {botAddress: "${botaddress}", platform: "Telegram"}}) {
                status
                user{
                userID
                }
                group{
                groupID
                }
            }
    }`;
}

const getQueryDelay = (lastPageUpdated: number, questions: string, timestampLastUpdated: number, botaddress: string, timestampNew: number): string => {
    const moderationInfo = `moderationInfo {
        ${moderationInfoContent}
            }`;
return `{
        realityQuestionAnsweredNotFinalizedDelayed: realityChecks(first: 1000, skip: ${lastPageUpdated*1000}, where: {id_in:[${questions}], deadline_gt: ${timestampNew}, dispute: null, timestampLastUpdated_gt: ${timestampLastUpdated}, timestampLastUpdated_lt: ${timestampNew},moderationInfo_: {askedBy: "${botaddress}"}}) {
            id
            currentAnswer
            timestampLastUpdated
            ${moderationInfo}
        }
    }`;
}
export {calcPenalty}