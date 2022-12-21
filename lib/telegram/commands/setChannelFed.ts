import * as TelegramBot from "node-telegram-bot-api";
import {groupSettings} from "../../../types";
import {setFederationChannelID, setFederationInviteURLChannel,getFederationName} from "../../db";
import {validateUrl} from "./setRules";
import langJson from "../assets/lang.json";
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;
var myQueue;

myCache.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });
/*
 * /setchannelfed <channel id>
 */
const regexp = /\/setfedchannel/
const regexpFull = /\/setfedchannel (.+)/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: string, msg: any, match: string[], batchedSend: any) => {
    try {
        if (!myBot)
            myBot = bot
        if (!myQueue)
            myQueue = queue
        const name = getFederationName(db,'telegram',String(msg.from.id))
        if (!name){
                const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `No federation found. Please first create a federation with \`/newfed\``,msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown', disable_web_page_preview: true} : {parse_mode: 'Markdown', disable_web_page_preview: true})
                return val}catch{}});
                myCache.set(resp.message_id, msg.chat.id)
                return; 
            }
        const newmatch = msg.text.match(regexpFull);
        if (!newmatch || newmatch.length < 2){
            console.log(msg)
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `/setchannelfed must be followed by a channel id. [DM](https://t.me/${process.env.BOT_USERNAME}?start=helpnotifications) me if you need more help : )`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown', disable_web_page_preview: true} : {parse_mode: 'Markdown', disable_web_page_preview: true})
            return val}catch{}});
            myCache.set(resp.message_id, msg.chat.id)
            return; 
        }
        try{
            const channel = await queue.add(async () => {try{const val = await bot.getChat(newmatch[1])
                return val}catch{}});
            if(channel.type !== "channel"){
                const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, '/setchannelfed must be followed by a valid channel.', msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown'} : {parse_mode: 'Markdown'})
                return val}catch{}});
                myCache.set(resp.message_id, msg.chat.id)
                return;
            }
        } catch(e){
            try{
                const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `${newmatch[1]} is not a valid channel.`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown'} : {parse_mode: 'Markdown'})
                return val}catch{}});
                myCache.set(resp.message_id, msg.chat.id)
            } catch(e){
                console.log(e)
            }
            return;
        }
        const channelUser = await queue.add(async () => {try{const val = await bot.getChatMember(newmatch[1], String(msg.from.id))
            return val}catch{}});
            console.log(channelUser)
        if(channelUser.status !== "administrator" && channelUser.status !== "creator"){
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, 'You are not an authorized admin of the channel.',msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown'} : {parse_mode: 'Markdown'})
            return val}catch{}});
            myCache.set(resp.message_id, msg.chat.id)
            return;
        }
        const channelUserSusie = await queue.add(async () => {try{const val = await bot.getChatMember(newmatch[1], botId)
            return val}catch{}});
        if (channelUserSusie.status !== "administrator"){
            const resp = await queue.add(async () => {try{const val = await bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', {caption: langJson[settings.lang].errorAdminRights},msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown'} : {parse_mode: 'Markdown'})
            return val}catch{}});
            myCache.set(resp.message_id, msg.chat.id)
            return;
        }
        if(!channelUserSusie.can_invite_users){
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, 'Susie must be able to invite users to the channel.',msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown'} : {parse_mode: 'Markdown'})
            return val}catch{}});
            myCache.set(resp.message_id, msg.chat.id)
            return;
        }
        const invite_url_channel = await queue.add(async () => {try{const val = await bot.exportChatInviteLink(newmatch[1])
            return val}catch{}});
        setFederationInviteURLChannel(db, 'telegram', String(msg.from.id), invite_url_channel);
        setFederationChannelID(db, 'telegram', String(msg.from.id), newmatch[1]);
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `Moderation notifications for the federation will now be sent to this [channel](${invite_url_channel}).`, {parse_mode: "Markdown"})}catch{}});
        queue.add(async () => {try{await bot.sendMessage(newmatch[1], `This channel will now relay moderation notifications for the federation *${name}*`, {parse_mode: "Markdown"})}catch{}});
    } catch (error) {
        console.log(error);
    }
}

export {regexp, callback};