import {
    AppealPossible as AppealPossibleEvent,
    AppealDecision as AppealDecisionEvent,
    KlerosLiquid
  } from "../generated/KlerosLiquid/KlerosLiquid"
  import {
    ModerationDispute
  } from "../generated/schema"
  import { BigInt, log, Address, JSONValueKind, ByteArray } from "@graphprotocol/graph-ts"

  export function handleAppealPossible(event: AppealPossibleEvent): void {
    let dispute = ModerationDispute.load(event.params._disputeID.toHexString())
    if (!dispute){
      log.error("Disput not found {}.", [event.params._disputeID.toHexString()])
      return;
    }

    dispute.currentRuling = getCurrentRulling(event.params._disputeID, event.address)
    dispute.timestampLastAppealPossible = event.block.timestamp
    dispute.save()
}

export function handleAppealDecision(event: AppealDecisionEvent): void {
  let dispute = ModerationDispute.load(event.params._disputeID.toHexString())
  if (!dispute){
    log.error("Disput not found {}.", [event.params._disputeID.toHexString()])
    return;
  }
  dispute.timestampLastAppealPossible = event.block.timestamp
  dispute.save()
}


function getCurrentRulling(disputeID: BigInt, address: Address): BigInt | null {
    log.debug("getCurrentRulling: Asking current rulling in dispute {}", [disputeID.toString()])
    let contract = KlerosLiquid.bind(address)
    let callResult = contract.try_currentRuling(disputeID)
    if (callResult.reverted) {
      log.debug("getCurrentRulling: currentRulling reverted {}.", [disputeID.toHexString()])
      return null
    } else {
      return callResult.value
    }
  }