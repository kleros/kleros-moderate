import request from "graphql-request";

const getQuestionId = async (botAddress: string, platform: string, groupId: string, userId: string, msgId: string): Promise<string | undefined> => {
    const query = `{
        moderationInfos(where: {message: "https://t.me/c/${groupId.substring(4)}/${msgId}",UserHistory_: {id:"${botAddress}${platform}${userId}${groupId}"}) {
              id
          }
        }`;
    try{
        const result = await request(
            'https://api.thegraph.com/subgraphs/name/shotaronowhere/kleros-moderate-goerli',
            query
        );
        return (result)?.moderationInfos[0]?.id;
    } catch(e){
        console.log(e)
        return undefined
    }
}

const getAllowance = async (botAddress: string, platform: string, groupId: string, userId: string): Promise<[number, number, number]|undefined> => {
    const query = `{
        userHistories(where: {id:"${botAddress}${platform}${userId}${groupId}"}) {
            countReportsMade
            countReportsMadeAndResponded
            timestampLastUpdated
          }
        }`;
    try{
        const result = await request(
            'https://api.thegraph.com/subgraphs/name/shotaronowhere/kleros-moderate-goerli',
            query
        );
        return result?.userHistories.length>0? result?.userHistories[0] : undefined;
    } catch(e){
        console.log(e)
        return undefined
    }
}

const existsQuestionId = async (question_id: string): Promise<boolean | undefined> => {
    const query = `{
        moderationInfos(where: {id: "${question_id}"}){
          id
        }
      }`;
    try{
        return (await request(
            'https://api.thegraph.com/subgraphs/name/shotaronowhere/kleros-moderate-goerli',
            query
        ))?.moderationInfos?.length >= 1;
    } catch(e){
        console.log(e)
        return undefined
    }
}

export{getQuestionId, existsQuestionId, getAllowance}