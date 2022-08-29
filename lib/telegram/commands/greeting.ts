import * as TelegramBot from "node-telegram-bot-api";
import {getRule, setRules} from "../../db";

/*
 * /getrules
 */

const callback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const defaultRules = 'https://ipfs.kleros.io/ipfs/QmeYuhtdsbyrpYa3tsRFTb92jcvUJNb2CJ2NdLE5fsRyAX/Kleros%20Moderate%20Community%20Guideline.pdf';

    const rules = await getRule('telegram', String(msg.chat.id), Math.floor(Date.now()/1000));
    
    if (!rules)
        await setRules('telegram', String(msg.chat.id), defaultRules, new Date().getTime()/1000);

    await bot.sendMessage(msg.chat.id, `Welcome, this group is mediated with [Kleros Moderate](https://kleros.io/moderate/).`, {parse_mode: "Markdown"});
    await bot.sendMessage(msg.chat.id, `Please make sure to follow the [community rules](${defaultRules}). Users who break the rules can be reported by replying to a message with the command '/report'.`, {parse_mode: "Markdown"});
}

export {callback};