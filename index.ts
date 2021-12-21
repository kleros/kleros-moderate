require('dotenv').config()
const ModeratorBot = require('node-telegram-bot-api');
import {CommandCallback} from "./types";
import * as TelegramBot from "node-telegram-bot-api";
import * as addMod from "./lib/commands/addMod";
import * as removeMod from "./lib/commands/removeMod";
import * as setRules from "./lib/commands/setRules";
import * as getRules from "./lib/commands/getRules";
import * as ban from "./lib/commands/ban";
import * as addEvidence from "./lib/commands/addEvidence";
import * as setLanguage from "./lib/commands/setLanguage";

const bot = new ModeratorBot(process.env.BOT_TOKEN, {polling: true});

if (process.env.CHAIN_NAME === 'kovan') {
    // kovan
    process.env.REALITITY_ETH_V30 = '0xcB71745d032E16ec838430731282ff6c10D29Dea';
    process.env.REALITIO_ARBITRATOR = '0x99489d7bb33539f3d1a401741e56e8f02b9ae0cf';
    process.env.WEB3_PROVIDER_URL = 'https://kovan.infura.io/v3/f1c9535b961648f7bd18209b00e11163';
} else {
    // xdai
    process.env.REALITITY_ETH_V30 = '0xe78996a233895be74a66f451f1019ca9734205cc';
    process.env.REALITIO_ARBITRATOR = process.env.REALITITY_ETH_V30; // TODO: change to kleros arbitrator
    process.env.WEB3_PROVIDER_URL = 'https://rpc.xdaichain.com';
}

const commands: {regexp: RegExp, callback: CommandCallback}[] = [
    {regexp: addMod.regexpReply, callback: addMod.callbackReply},
    {regexp: addMod.regexpUserId, callback: addMod.callbackUserId},
    {regexp: removeMod.regexpReply, callback: removeMod.callbackReply},
    {regexp: removeMod.regexpUserId, callback: removeMod.callbackUserId},
    setRules,
    getRules,
    ban,
    addEvidence,
    setLanguage,
];

commands.forEach((command) => {
    bot.onText(
        command.regexp,
        (msg: TelegramBot.Message, match: string[]) => {
            command.callback(bot, msg, match)
        }
    )
})

console.log('Bot ready...');