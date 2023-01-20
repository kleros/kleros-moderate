import * as TelegramBot from "node-telegram-bot-api";
import langJson from "../assets/langNew.json";
import {groupSettings} from "../../../types";
import {getMultilangGroup} from "../../db";


/*
 * Welcome Message
 */

const callback = async (queue: any, settings: groupSettings, bot: any, msg: any) => {
    try {
//        if (msg.old_chat_member.status !== "left")
//            return;
        console.log('yoyoyoyoy welcome')
        const lang_code = msg?.from?.language_code
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[lang_code].welcome.welcome, msg.chat.is_forum?  {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"}: {parse_mode: "Markdown"})}catch{}});  
        //const options = msg.chat.is_forum? {message_thread_id: msg.message_thread_id, caption: "To get started, give Susie admin rights."} : {caption: "To get started, give Susie admin rights."}
        //bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', options);
    } catch (error) {
        console.log(error);   
    }
}

export {callback};