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
        const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));
        if (!(user.status === 'creator' || user.status === 'administrator')) {
            await bot.sendMessage(msg.chat.id, langJson[settings.lang].errorAdminOnly);
            return;
        }
        const newmatch = msg.text.match(regexpFull);
        if (!newmatch || newmatch.length < 2){
            bot.sendMessage(msg.chat.id, `/setchannel ${langJson[settings.lang].addevidence.error1} ${langJson[settings.lang].addevidence.id}`);
            return; 
        }
        try{
            const channel = await bot.getChat(newmatch[1]);
            if(channel.type !== "channel"){
                await bot.sendMessage(msg.chat.id, '/setchannel must be followed by a valid channel.');
                return;
            }
        } catch(e){
            await bot.sendMessage(msg.chat.id, `${newmatch[1]} is not a valid channel.`);
            return;
        }
        const channelUser = await bot.getChatMember(newmatch[1], String(msg.from.id));
        if(channelUser.status !== "administrator" && channelUser.status !== "creator"){
            console.log(channelUser)
            await bot.sendMessage(msg.chat.id, 'You are not an authorized admin of the channel.');
            return;
        }
        const channelUserSusie = await bot.getChatMember(newmatch[1], botId);
        if (channelUserSusie.status !== "administrator"){
            await bot.sendMessage(msg.chat.id, 'The channel must have Susie as an admin.');
            bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', {caption: langJson[settings.lang].errorAdminRights});
            return;
        }
        if(!channelUserSusie.can_invite_users){
            await bot.sendMessage(msg.chat.id, 'Susie must be able to invite users to the channel.');
            return;
        }
        console.log('madeit');
        const invite_url_channel = await bot.exportChatInviteLink(newmatch[1]);
        console.log('madeit');
        const result = setInviteURLChannel(db, 'telegram', String(msg.chat.id), invite_url_channel);
        console.log('madeit');
        await setChannelID(db, 'telegram', String(msg.chat.id), newmatch[1]);
        await bot.sendMessage(msg.chat.id, `Moderation announcement [channel](${invite_url_channel}).`, {parse_mode: "Markdown"});
    } catch (error) {
        console.log(error);
    }
}

export {regexp, callback, validateUrl};