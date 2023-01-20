import * as TelegramBot from "node-telegram-bot-api";
import {setThreadID, getThreadIDNotifications, setRules,setTitle,setLang} from "../../db";
import langJson from "../assets/langNew.json";
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
    const lang_code = msg?.from?.language_code
    try{
        if (msg.chat.type === "supergroup" && !skip_lang_check && (lang_code !== 'en' && lang_code !== 'es')){
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
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `I speak English and Spanish. Please reach out to @SusieSupport to let me know which language I should learn next.\n\nTo continue, please understand that I can currently only effectively moderate communities in English or Spanish.`, opts)
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
                            text: langJson[lang_code].start.add,
                            url: `https://t.me/${process.env.BOT_USERNAME}?startgroup=botstart`
                        }
                    ]
                    ]
                }
            }
            queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[lang_code].start.private, opts)}catch{}})
            return;
        }

        const botUser = await queue.add(async () => {try{const val = await bot.getChatMember(msg.chat.id, botID)
            return val}catch{}})
            if(!botUser)
            return
        /*if(botUser.status !== "administrator" || !botUser.can_restrict_members){
            const video = msg.chat.is_forum? 'QmSdP3SDoHCdW739xLDBKM3gnLeeZug77RgwgxBJSchvYV/guide_topics.mp4' : 'QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4'
            //queue.add(async () => {try{await bot.sendVideo(msg.chat.id, `https://ipfs.kleros.io/ipfs/${video}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, caption: ""} : {caption: "Please give Susie full admin rights.\n\nThen try to /start community moderation again."})}catch{}});
            //return;
            queue.add(async () => {try{await bot.sendMessage(msg.chat.id, 'I am ', msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id, disable_web_page_preview: true}: {parse_mode: "Markdown", disable_web_page_preview: true})}catch{}})
        }*/
        if (msg.chat.is_forum){
            if(!botUser.can_manage_topics){
                queue.add(async () => {try{await bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmSdP3SDoHCdW739xLDBKM3gnLeeZug77RgwgxBJSchvYV/guide_topics.mp4', {message_thread_id: msg.message_thread_id, caption: langJson[lang_code].index.topicError})}catch{}});
                return;
            }
            const thread_ids = getThreadIDNotifications(db, 'telegram', String(msg.chat.id));
            if (thread_ids){
                queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[lang_code].start.already, {message_thread_id: msg.message_thread_id})}catch{}});
                return
            }
            const threads = await topicMode(queue, db,bot,settings,msg);
            if (!threads)
                return
        }
        setTitle(db, 'telegram', String(msg.chat.id), msg.chat.title)
        setRules(db, 'telegram', String(msg.chat.id), langJson[lang_code].defaultRules, Math.floor(Date.now()/1000));
        setLang(db, 'telegram', String(msg.chat.id),lang_code);
        const msg_start = `${langJson[lang_code].start.start1}(https://t.me/${process.env.BOT_USERNAME}?start=help)${langJson[lang_code].start.start2}(${langJson[lang_code].defaultRules}).${langJson[lang_code].start.start3}`
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, msg_start, msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id, disable_web_page_preview: true}: {parse_mode: "Markdown", disable_web_page_preview: true})}catch{}})
        return;
    } catch (e){
        try{
            if (msg.chat.is_forum){
                queue.add(async () => {try{await bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmSdP3SDoHCdW739xLDBKM3gnLeeZug77RgwgxBJSchvYV/guide_topics.mp4', {message_thread_id: msg.message_thread_id, caption: langJson[lang_code].error.topic})}catch{}});
            }
        } catch (e){
            console.log(e)
        }
    }
}

const topicMode = async (queue: any, db:any, bot: any, settings: groupSettings, msg: TelegramBot.Message): Promise<[string,string]> => {
        // tg bugging, won't display icon_color if set
        const lang_code = msg?.from?.language_code
        const topicRules = await queue.add(async () => {try{const val = await bot.createForumTopic(msg.chat.id, lang_code == "en" ? 'Rules': 'Reglas')//, {icon_custom_emoji_id: '5357193964787081133'})
                                    return val}catch(e){console.log(e)}});
        const topicModeration = await queue.add(async () => {try{const val = await bot.createForumTopic(msg.chat.id, lang_code == "en" ? 'Notifications' : 'Notificaciones')//, {icon_custom_emoji_id: '5417915203100613993'})
                                    return val}catch(e){console.log(e)}});
        if(!topicRules || !topicModeration)
        return

        if(lang_code === "en"){
            await queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `This community is moderated according to these [rules](${settings.rules}).\n\nMisconduct can be reported with \`/report\`.`, {parse_mode: "Markdown", message_thread_id: topicRules.message_thread_id})}catch{}});
            //bot.sendMessage(chat_id, `${langJson[settings.lang].greeting2}(${settings.rules}). ${langJson[settings.lang].greeting3}`, {parse_mode: "Markdown", message_thread_id: topicRules.message_thread_id});
            await queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `Welcome, this group is moderated with [Kleros Moderate](https://kleros.io/moderate/).`, {parse_mode: "Markdown", message_thread_id: topicModeration.message_thread_id})}catch{}});
        } else {
            await queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `Esta comunidad está moderada de acuerdo con las siguientes [reglas](${settings.rules}).\n\nLas faltas pueden denunciarse con \`/report\`.`, {parse_mode: "Markdown", message_thread_id: topicRules.message_thread_id})}catch{}});
            //bot.sendMessage(chat_id, `${langJson[settings.lang].greeting2}(${settings.rules}). ${langJson[settings.lang].greeting3}`, {parse_mode: "Markdown", message_thread_id: topicRules.message_thread_id});
            await queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `Bienvenido, este grupo está moderado con [Kleros Moderate](https://kleros.io/moderate/).`, {parse_mode: "Markdown", message_thread_id: topicModeration.message_thread_id})}catch{}});
        }
        queue.add(async () => {try{await bot.closeForumTopic(msg.chat.id, topicRules.message_thread_id)}catch{}})
        setThreadID(db,'telegram',String(msg.chat.id),String(topicRules.message_thread_id), String(topicModeration.message_thread_id))
        return [topicRules.message_thread_id, topicModeration.message_thread_id]
}

export {regexp, callback, topicMode};