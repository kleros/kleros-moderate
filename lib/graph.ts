import request from "graphql-request";

const getQuestionId = async (botAddress: string, platform: string, groupId: string, userId: string, msgId: string): Promise<string | undefined> => {
    const query = `{
        moderationInfos(where: {message: "https://t.me/c/${groupId.substring(4)}/${msgId}",user_: {id:"${botAddress}${platform}${userId}", group: "${botAddress}Telegram${groupId}"}}) {
              id
          }
        }`;
    try{
        const result = await request(
            'https://api.thegraph.com/subgraphs/name/shotaronowhere/kleros-moderate-goerli',
            query
        );
        console.log(result)
        return (result)?.data?.moderationInfos[0]?.id;
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
        ))?.data.moderationInfos.length === 1;
    } catch(e){
        console.log(e)
        return undefined
    }
}

export{getQuestionId, existsQuestionId}