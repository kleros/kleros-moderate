require('dotenv').config()
const ModeratorBot = require('node-telegram-bot-api');
import {getDisputedBans, setBan} from "./db";
import request from "graphql-request";
import {BigNumber} from "ethers";

(async ()=> {
    const bot = new ModeratorBot(process.env.BOT_TOKEN, {polling: false});

    const bans = {};

    (await getDisputedBans()).forEach((ban) => {
        bans[ban.question_id] = ban;
    });

    const query = `{
  questions(
    where: { 
        id_in: ${JSON.stringify(Object.keys(bans))}
    }
  ) {
    id
    answer
    finalize_ts
  }
}`;

    const result = await request(
        'https://api.thegraph.com/subgraphs/name/rodsouto/telegram-moderator-bot',
        query
    )

    for (const question of result.questions) {

        const answer = BigNumber.from(question.answer);

        if (!answer.eq(0) && !answer.eq(1)) {
            // "Invalid" or "Answered too soon"
            // TODO: what should we do?
            continue;
        }

        const latestBanState = answer.toNumber();

        if (latestBanState !== bans[question.id].active) {

            const finalized = question.finalize_ts <= Math.ceil(+new Date() / 1000);

            if (latestBanState === 1) {
                // ban
                await setBan(question.id, true, finalized);

                // @ts-ignore
                await bot.banChatMember(bans[question.id].chat_id, String(bans[question.id].user_id), {revoke_messages: false});
            } else {
                // unban
                await setBan(question.id, false, finalized);

                // @ts-ignore
                await bot.unbanChatMember(bans[question.id].chat_id, String(bans[question.id].user_id), {only_if_banned: true});
            }
        }
    }
})()