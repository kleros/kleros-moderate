import * as TelegramBot from "node-telegram-bot-api";
import {groupSettings} from "../../../types";
import {setChannelID, setInviteURLChannel} from "../../db";
import {validateUrl} from "./setRules";
import langJson from "../assets/lang.json";

/*
 * /setchannel [public channel name]
 */
const regexp = /\/setchannel/
const regexpFull = /\/setchannel (.+)/

const callback = async (db: any, settings: groupSettings, bot: TelegramBot, botId: string, msg: TelegramBot.Message, match: string[], batchedSend: any) => {
    try {
        const newmatch = msg.text.match(regexpFull);
        if (!newmatch || newmatch.length < 2){
            bot.sendMessage(msg.chat.id, `/setchannel must be followed by a channel id. [DM](https://t.me/KlerosModeratorBot?start=helpnotifications) me if you need more help : )`, {parse_mode: "Markdown"});
            return; 
        }
        try{
            const channel = await bot.getChat(newmatch[1]);
            if(channel.type !== "channel"){
                await bot.sendMessage(msg.chat.id, '/setchannel must be followed by a valid channel.');
                return;
            }
        } catch(e){
            try{
                bot.sendMessage(msg.chat.id, `${newmatch[1]} is not a valid channel.`);
            } catch(e){
                console.log(e)
            }
            return;
        }
        const channelUser = await bot.getChatMember(newmatch[1], String(msg.from.id));
        if(channelUser.status !== "administrator" && channelUser.status !== "creator"){
            await bot.sendMessage(msg.chat.id, 'You are not an authorized admin of the channel.');
            return;
        }
        const channelUserSusie = await bot.getChatMember(newmatch[1], botId);
        if (channelUserSusie.status !== "administrator"){
            bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', {caption: langJson[settings.lang].errorAdminRights});
            return;
        }
        if(!channelUserSusie.can_invite_users){
            bot.sendMessage(msg.chat.id, 'Susie must be able to invite users to the channel.');
            return;
        }
        const invite_url_channel = await bot.exportChatInviteLink(newmatch[1]);
        setInviteURLChannel(db, 'telegram', String(msg.chat.id), invite_url_channel);
        setChannelID(db, 'telegram', String(msg.chat.id), newmatch[1]);
        bot.sendMessage(msg.chat.id, `Moderation announcement [channel](${invite_url_channel}).`, {parse_mode: "Markdown"});
        bot.sendMessage(newmatch[1], `This channel will now relay moderation notifications for ${msg.chat.title}`, {parse_mode: "Markdown"});
    } catch (error) {
        console.log(error);
    }
}

export {regexp, callback};