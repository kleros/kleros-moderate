const _realitio = require('./assets/contracts/Realitio_v2_1.json')
const _proxy = require('./assets/contracts/Realitio_v2_1_ArbitratorWithAppeals.json')

module.exports = async (web3, lastBlock, realitioAddress, proxyAddress) => {
  // Instantiate the contracts.
  const realitioInstance = new web3.eth.Contract(
    _realitio.abi,
    realitioAddress
  )
  const proxyInstance = new web3.eth.Contract(
    _proxy.abi,
    proxyAddress
  )
    // console.log(lastBlock)
    const ruleEvents = await proxyInstance.getPastEvents('Ruling', {
      fromBlock: lastBlock,
      toBlock: 'latest'
    })
     console.log('realitio reporting: '+ruleEvents.length)

    // A Ruling was made
    for (const eventLog of ruleEvents) {
      const _disputeID = eventLog.returnValues._disputeID

      const questionIDEvent = await proxyInstance.getPastEvents('DisputeIDToQuestionID', {
        filter: {
          _disputeID
        },
        fromBlock: 0,
        toBlock: 'latest'
      })

      if (questionIDEvent.length < 1) continue

      const questionID = questionIDEvent[0].returnValues._questionID
      const question = await realitioInstance.methods.questions(questionID).call()
      const bestAnswer = question.best_answer

      const answerEvents = await realitioInstance.getPastEvents('LogNewAnswer', {
        fromBlock: 0,
        filter: {
          question_id: questionID
        }
      })

      // Only 1 answer
      let historyHash = '0x0000000000000000000000000000000000000000000000000000000000000000' // Blank history
      if (answerEvents.length > 1) {
        historyHash = answerEvents[answerEvents.length - 2].returnValues.history_hash
      }
      const answerer = answerEvents[answerEvents.length - 1].returnValues.user

      // DEBUG
      // console.log('Reporting answer for disputeID ' + _disputeID)
      // console.log(`questionID: ${questionID}`)
      // console.log(`historyHash: ${historyHash}`)
      // console.log(`bestAnswer: ${bestAnswer}`)
      // console.log(`answerer: ${answerer}`)

      const txHash = await proxyInstance.methods.reportAnswer(
        questionID,
        historyHash,
        bestAnswer, // Aka last answer
        answerer, // Owner of best answer
      ).send({
        from: web3.eth.accounts.wallet[0].address,
        gas: process.env.GAS_LIMIT
      })
    }
    
}

