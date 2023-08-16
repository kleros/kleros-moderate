require('dotenv').config();
import {getRealityETHV30Provider, getRealitioArbitratorProvider} from "../lib/ethers"
import {JsonRpcProvider} from "@ethersproject/providers";
import { BigNumber } from "ethers";
import { RulingEvent  } from "../lib/typechain/RealitioV21ArbitratorWithAppeals";
import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { Handler, schedule } from "@netlify/functions";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const retryOperation = (operation, delay, retries) =>
  new Promise((resolve, reject) => {
    return operation()
      .then(resolve)
      .catch((reason) => {
        if (retries > 0) {
          // log retry
          console.log("retrying", retries);
          console.log(reason);
          return wait(delay)
            .then(retryOperation.bind(null, operation, delay, retries - 1))
            .then(resolve)
            .catch(reject);
        }
        return reject(reason);
      });
  });

const handler: Handler = async () => {
  try{
    const provider = new JsonRpcProvider(process.env.WEB3_PROVIDER_URL);

    const reality = getRealityETHV30Provider(process.env.REALITY_ETH_V30, process.env.PRIVATE_KEY, provider)
    const arbitrator = getRealitioArbitratorProvider(process.env.REALITIO_ARBITRATOR_EN, process.env.PRIVATE_KEY, provider)

    const finalizedBlock = await provider.getBlock("finalized");
    const fromBlock = finalizedBlock.number - 10000; // past hour

    const ruleEvents = await retryOperation(()=>arbitrator.queryFilter(arbitrator.filters.Ruling(), fromBlock, finalizedBlock.number), 1000, 10) as RulingEvent[]
    for (const eventLog of ruleEvents) {
      try{
        const _disputeID: BigNumber = BigNumber.from(eventLog.args._disputeID)
        const questionID: BigNumber = await retryOperation(()=>arbitrator.externalIDtoLocalID(_disputeID.toHexString()), 1000, 10) as BigNumber
        const question = (await retryOperation(()=>reality.questions(questionID.toHexString()),1000,10)) as {
            content_hash: string;
            arbitrator: string;
            opening_ts: number;
            timeout: number;
            finalize_ts: number;
            is_pending_arbitration: boolean;
            bounty: BigNumber;
            best_answer: string;
            history_hash: string;
            bond: BigNumber;
            min_bond: BigNumber;
        }

        const bestAnswer = question.best_answer
        
        const query = {
            query: `{
              responses(where: {question_: {questionId: "${questionID.toHexString()}"}}){
                historyHash
                timestamp
                answer
                user
              }
            }`
        }

        const responses = (await axios.post(`https://api.thegraph.com/subgraphs/name/realityeth/realityeth-gnosis`,    
        query))?.data?.data?.responses ?? []

        responses.sort((a,b) => a.timestamp-b.timestamp)
      
        const answerer = responses[responses.length - 1].user
        const historyHash = responses[Math.max(0, responses.length - 2)].historyHash
        
        // DEBUG
        console.log('Reporting answer for disputeID ' + _disputeID)
        console.log(`questionID: ${questionID.toHexString()}`)
        console.log(`historyHash: ${historyHash}`)
        console.log(`bestAnswer: ${bestAnswer}`)
        console.log(`answerer: ${answerer}`)

        const arbitrationRequest = await retryOperation(()=> arbitrator.arbitrationRequests(questionID), 1000, 10) as {
          status: number;
          requester: string;
          disputeID: BigNumber;
          ruling: BigNumber;
        };
        console.log(`arbitrationRequest.status: ${arbitrationRequest.status}`);
        if (arbitrationRequest.status == 3){
          console.log(`Dispute already resolved, skipping`, _disputeID);
          continue;
        }
        else {
          const txHash = await arbitrator.reportAnswer(questionID.toHexString(), historyHash, bestAnswer, answerer, {gasLimit: 100000})
          const txnReceipt = await txHash.wait()
          console.log(`txHash: ${txnReceipt.transactionHash}`)
        }
      } catch (e) {
    console.log(e)
      }
    }
  return {statusCode: StatusCodes.OK};
  } catch (e) {
    console.log(e)
    return {statusCode: StatusCodes.INTERNAL_SERVER_ERROR};
  }
};

module.exports.handler = schedule("*/15 * * * *", handler);