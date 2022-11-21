import * as TelegramBot from "node-telegram-bot-api";
import langJson from "../assets/lang.json";
import { groupSettings } from "./types";

/*
 * Welcome Message
 */

const callback = async (settings: groupSettings, bot: any, msg: any) => {
    try {
        if (msg.old_chat_member.status !== "left")
            return;
        const message = `${langJson[settings.lang].welcome}[Kleros Moderate](https://kleros.io/moderate/) bot. \n\n/start to begin community sourced moderation.`;
        bot.sendMessage(msg.chat.id, `${langJson[settings.lang].welcome}[Kleros Moderate](https://kleros.io/moderate/) bot. \n\n/start to begin community sourced moderation.`, msg.chat.is_forum? {parse_mode: "Markdown"} : {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"});
        //const options = msg.chat.is_forum? {message_thread_id: msg.message_thread_id, caption: "To get started, give Susie admin rights."} : {caption: "To get started, give Susie admin rights."}
        //bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', options);
    } catch (error) {
        console.log(error);   
    }
}

export {callback};