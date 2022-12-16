import * as TelegramBot from "node-telegram-bot-api";
import {groupSettings} from "../../../types";
import {setChannelID, setInviteURLChannel} from "../../db";
import {validateUrl} from "./setRules";
import langJson from "../assets/lang.json";
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;

myCache.on("expired",function(key,value){
    myBot.deleteMessage(value, key);
    });
/*
 * /setchannel [public channel name]
 */
const regexp = /\/setchannel/
const regexpFull = /\/setchannel (.+)/

const callback = async (db: any, settings: groupSettings, bot: TelegramBot, botId: string, msg: any, match: string[], batchedSend: any) => {
    try {
        if (msg.chat.is_fourm)
            return
        const newmatch = msg.text.match(regexpFull);
        if (!newmatch || newmatch.length < 2){
            const resp = await bot.sendMessage(msg.chat.id, `/setchannel must be followed by a channel id. [DM](https://t.me/${process.env.BOT_USERNAME}?start=helpnotifications) me if you need more help : )`, {parse_mode: "Markdown", disable_web_page_preview: true});
            myCache.set(resp.message_id, msg.chat.id)
            return; 
        }
        try{
            const channel = await bot.getChat(newmatch[1]);
            if(channel.type !== "channel"){
                const resp = await bot.sendMessage(msg.chat.id, '/setchannel must be followed by a valid channel.');
                myCache.set(resp.message_id, msg.chat.id)
                return;
            }
        } catch(e){
            try{
                const resp = await bot.sendMessage(msg.chat.id, `${newmatch[1]} is not a valid channel.`);
                myCache.set(resp.message_id, msg.chat.id)
            } catch(e){
                console.log(e)
            }
            return;
        }
        const channelUser = await bot.getChatMember(newmatch[1], String(msg.from.id));
        if(channelUser.status !== "administrator" && channelUser.status !== "creator"){
            const resp = await bot.sendMessage(msg.chat.id, 'You are not an authorized admin of the channel.');
            myCache.set(resp.message_id, msg.chat.id)
            return;
        }
        const channelUserSusie = await bot.getChatMember(newmatch[1], botId);
        if (channelUserSusie.status !== "administrator"){
            const resp = await bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', {caption: langJson[settings.lang].errorAdminRights});
            myCache.set(resp.message_id, msg.chat.id)
            return;
        }
        if(!channelUserSusie.can_invite_users){
            const resp = await bot.sendMessage(msg.chat.id, 'Susie must be able to invite users to the channel.');
            myCache.set(resp.message_id, msg.chat.id)
            return;
        }
        const invite_url_channel = await bot.exportChatInviteLink(newmatch[1]);
        setInviteURLChannel(db, 'telegram', String(msg.chat.id), invite_url_channel);
        setChannelID(db, 'telegram', String(msg.chat.id), newmatch[1]);
        bot.sendMessage(msg.chat.id, `Moderation notifications will now be sent to this [channel](${invite_url_channel}).`, {parse_mode: "Markdown"});
        bot.sendMessage(newmatch[1], `This channel will now relay moderation notifications for ${msg.chat.title}`, {parse_mode: "Markdown"});
    } catch (error) {
        console.log(error);
    }
}

export {regexp, callback};