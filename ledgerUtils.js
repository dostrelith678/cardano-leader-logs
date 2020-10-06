/**
 * Calculate the amount of controlled stake (stake proportion) by a given pool from the ledger
 * e.g. 0.0034 == 0.34% of the total stake
 */
async function getSigma(poolId, ledger) {

  const stake           = ledger.esSnapshots._pstakeSet._stake
  const delegations     = ledger.esSnapshots._pstakeSet._delegations

  const stakeMap        = {}
  const delegationsMap  = {}

  let totalStake        = 0
  let activeStake       = 0

  for(let stakeItem of stake) {

    stakeMap[stakeItem[0]['key hash']] = stakeItem[1]
    totalStake += stakeItem[1]
  }

  for(let delegationsItem of delegations) {

    if(delegationsItem[1] === poolId) {

      delegationsMap[delegationsItem[0]['key hash']] = delegationsItem[1]
      activeStake += stakeMap[delegationsItem[0]['key hash']]
    }
  }

  return activeStake / totalStake
}

module.exports = {
  getSigma
}