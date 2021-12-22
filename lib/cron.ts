require('dotenv').config()
const ModeratorBot = require('node-telegram-bot-api');
import {getBans, setBan} from "./db";
import request from "graphql-request";
import {BigNumber} from "ethers";

(async ()=> {
    const bot = new ModeratorBot(process.env.BOT_TOKEN, {polling: false});

    const bans = {};

    (await getBans()).forEach((ban) => {
        bans[ban.question_id] = ban;
    });

    const query = `{
  questions(
    orderBy: created, 
    orderDirection: desc, 
    where: {
        answer_not: null, 
        id_in: ${JSON.stringify(Object.keys(bans))}
    }
  ) {
    id
    answer
    created
  }
}`;

    const result = await request(
        'https://api.thegraph.com/subgraphs/name/rodsouto/telegram-moderator-bot',
        query
    )

    for (const question of result.questions) {
        const latestBanState = BigNumber.from(question.answer).toNumber();

        if (latestBanState !== bans[question.id].active) {
            if (latestBanState === 1) {
                // ban
                await setBan(question.id, true);

                // @ts-ignore
                await bot.banChatMember(bans[question.id].chat_id, String(bans[question.id].user_id), {revoke_messages: false});
            } else {
                // unban
                await setBan(question.id, false);

                // @ts-ignore
                await bot.unbanChatMember(bans[question.id].chat_id, String(bans[question.id].user_id), {only_if_banned: true});
            }
        }
    }
})()