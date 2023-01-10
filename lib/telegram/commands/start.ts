import * as TelegramBot from "node-telegram-bot-api";
import {setThreadID, getThreadIDNotifications, setRules,setTitle} from "../../db";
import langJson from "../assets/lang.json";
import {groupSettings} from "../../../types";
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 180, checkperiod: 240 } );
var myBot;
var myQueue;

myCache.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });
/*
 * /start
 */
const regexp = /\/start/

const callback = async (queue:any, db: any, settings: groupSettings, bot: any, botID: string, msg: any,match: string[], batchsend: any, skip_lang_check?: boolean) => {
    // admin chek
    if (!myBot)
        myBot = bot
    if (!myQueue)
        myQueue = queue
    try{
        const lang_code = msg?.from?.language_code
        if (msg.chat.type === "supergroup" && !skip_lang_check && lang_code !== 'en'){
            if(myCache.get(msg.chat.id))
                return
            const opts = msg.chat.is_forum? {
                parse_mode: 'Markdown',
                message_thread_id: msg.message_thread_id,
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                    [
                        {
                            text: 'I understand',
                            callback_data: `6`
                        }
                    ]
                    ]
                }
            } : {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                    [
                        {
                            text: 'I understand',
                            callback_data: `6`
                        }
                    ]
                    ]
                }
            }
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `My native language is English. I am learning new languages, starting with [Spanish](https://linguo.kleros.io/home). Please reach out to @SusieSupport to let me know which language I should learn next.\n\nTo continue, please understand that I can currently only effectively moderate communities in English.`, opts)
            return val}catch{}}) 
            if(!resp)
            return
            myCache.set(msg.chat.id,resp.message_id)          
            return;
        }


        if (msg.chat.type === "private"){
            const opts = {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                    [
                        {
                            text: 'Add me to your group!',
                            url: `https://t.me/${process.env.BOT_USERNAME}?startgroup=botstart`
                        }
                    ]
                    ]
                }
            }
            queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `Hi! My name is Susie, nice to meet you : )
            
I am a [Kleros Moderate](https://kleros.io/moderate) community manager at your service. Use /help to learn how to use me to my full potential.

Join my news channel @KlerosModerateNews to get information on all the latest updates.`, opts)}catch{}})
            return;
        }

        const botUser = await queue.add(async () => {try{const val = await bot.getChatMember(msg.chat.id, botID)
            return val}catch{}})
            if(!botUser)
            return
        if(botUser.status !== "administrator" || !botUser.can_restrict_members){
            const video = msg.chat.is_forum? 'QmSdP3SDoHCdW739xLDBKM3gnLeeZug77RgwgxBJSchvYV/guide_topics.mp4' : 'QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4'
            queue.add(async () => {try{await bot.sendVideo(msg.chat.id, `https://ipfs.kleros.io/ipfs/${video}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, caption: "Please give Susie full admin rights.\n\nThen try to /start community moderation again."} : {caption: "Please give Susie full admin rights.\n\nThen try to /start community moderation again."})}catch{}});
            return;
        }
        if (msg.chat.is_forum){
            if(!botUser.can_manage_topics){

                queue.add(async () => {try{await bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmSdP3SDoHCdW739xLDBKM3gnLeeZug77RgwgxBJSchvYV/guide_topics.mp4', {message_thread_id: msg.message_thread_id, caption: "Susie needs permissions to manage topics to effectively moderate your community.\n\nThen try to /start community moderation again."})}catch{}});
                return;
            }
            const thread_ids = getThreadIDNotifications(db, 'telegram', String(msg.chat.id));
            if (thread_ids){
                queue.add(async () => {try{await bot.sendMessage(msg.chat.id, "Already started.", {message_thread_id: msg.message_thread_id})}catch{}});
                return
            }
            await topicMode(queue, db,bot,settings,msg.chat);
        }
        console.log(msg.chat.id)
        //setTitle(db, 'telegram', String(msg.chat.id), msg.chat.title)
        setRules(db, 'telegram', String(msg.chat.id), langJson[settings.lang].defaultRules, Math.floor(Date.now()/1000));
        const msg_start = `Hi! My community moderation tools are at your service. [DM](https://t.me/${process.env.BOT_USERNAME}?start=help) me to find out more about how to use me to my full potential : )
        
        - Use /setrules to change the default [rules](${langJson[settings.lang].defaultRules}).
        - User reports are made by replying to a message with /report
        - Penalties progress from 1 day to 1 week, and 1 year bans for each violation.`;
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, msg_start, msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id, disable_web_page_preview: true}: {parse_mode: "Markdown", disable_web_page_preview: true})}catch{}})
        return;
    } catch (e){
        try{
            if (msg.chat.is_forum){
                queue.add(async () => {try{await bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmSdP3SDoHCdW739xLDBKM3gnLeeZug77RgwgxBJSchvYV/guide_topics.mp4', {message_thread_id: msg.message_thread_id, caption: "Must have can manage topics"})}catch{}});
            } else{
                queue.add(async () => {try{await bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', {caption: langJson[settings.lang].errorAdminRights+"Topics must be enabled"})}catch{}});
            }
        } catch (e){
            console.log(e)
        }
    }
}

const topicMode = async (queue: any, db:any, bot: any, settings: groupSettings, chat: TelegramBot.Chat): Promise<[string,string]> => {
        // tg bugging, won't display icon_color if set
        const topicRules = await queue.add(async () => {try{const val = await bot.createForumTopic(chat.id, 'Rules', {icon_custom_emoji_id: '5357193964787081133'})
                                    return val}catch(e){console.log(e)}});
        const topicModeration = await queue.add(async () => {try{const val = await bot.createForumTopic(chat.id, 'Moderation Notifications', {icon_custom_emoji_id: '5417915203100613993'})
                                    return val}catch{}});
        if(!topicRules || !topicModeration)
        return
        await queue.add(async () => {try{await bot.sendMessage(chat.id, `This community is moderated according to these [rules](${settings.rules}).\n\nMisconduct can be reported with \`/report\`.\n\nIf confirmed, penalties escalate from 1 day to 1 week and finally 1 year bans.`, {parse_mode: "Markdown", message_thread_id: topicRules.message_thread_id})}catch{}});
            //bot.sendMessage(chat_id, `${langJson[settings.lang].greeting2}(${settings.rules}). ${langJson[settings.lang].greeting3}`, {parse_mode: "Markdown", message_thread_id: topicRules.message_thread_id});
        await queue.add(async () => {try{await bot.sendMessage(chat.id, `${langJson[settings.lang].greeting1}[Kleros Moderate](https://kleros.io/moderate/).`, {parse_mode: "Markdown", message_thread_id: topicModeration.message_thread_id})}catch{}});
        queue.add(async () => {try{await bot.closeForumTopic(chat.id, topicRules.message_thread_id)}catch{}})
        setThreadID(db,'telegram',String(chat.id),String(topicRules.message_thread_id), String(topicModeration.message_thread_id))
        return [topicRules.message_thread_id, topicModeration.message_thread_id]
}

export {regexp, callback, topicMode};