const fs = require('fs')
const cp = require('child_process')
const axios = require('axios')
const prompt = require('prompt')

console.log('             process args:', process.argv)

if (process.argv.length < 4) {
  throw Error(
    'Usage: node cardanoLeaderLogs.js <path/to/leaderLogs.config> <previous | current | next (epoch)>'
  )
}

const params = JSON.parse(fs.readFileSync(process.argv[2]))

if (
  !params.hasOwnProperty('poolIdBech32') ||
  !params.hasOwnProperty('vrfSkey') ||
  !params.hasOwnProperty('genesisShelley') ||
  !params.hasOwnProperty('libsodiumBinary') ||
  !params.hasOwnProperty('timeZone')
) {
  throw Error('Invalid leaderLogsConfig.json')
}

const genesisShelley = JSON.parse(fs.readFileSync(params.genesisShelley))
const targetEpoch = process.argv[3]
const targetSnapshot =
  targetEpoch == 'previous'
    ? 'Go'
    : targetEpoch == 'current'
    ? 'Set'
    : targetEpoch == 'next'
    ? 'Mark'
    : 'unknown'

if (targetSnapshot == 'unknown') {
  throw Error(
    'Invalid target epoch format, please use one of: <previous | current | next>.'
  )
}

const poolId = params.poolId
const poolIdBech32 = params.poolIdBech32
const timeZone = params.timeZone
const vrfSkey = JSON.parse(fs.readFileSync(params.vrfSkey)).cborHex

function getFirstSlotOfEpoch (epoch, genesisShelley) {
  // First slot of epoch 211
  refSlot = 5788800

  firstSlotOfEpoch = refSlot + (epoch - 211) * genesisShelley.epochLength

  return firstSlotOfEpoch
}

async function getSnapshotDataFromKoios (poolIdBech32, targetSnapshot) {
  const poolSnapshotUrl = `https://api.koios.rest/api/v0/pool_stake_snapshot?_pool_bech32=${poolIdBech32}&snapshot=eq.${targetSnapshot}`

  const poolSnapshotResponse = await axios.get(poolSnapshotUrl)

  const poolSnapshotData = poolSnapshotResponse.data[0]

  if (poolSnapshotData.nonce == null) {
    throw Error(
      `Epoch nonce for epoch ${poolSnapshotData.epoch_no} is unavailable.`
    )
  }

  if (
    poolSnapshotData.pool_stake === null ||
    poolSnapshotData.active_stake === null
  ) {
    throw `Failed to get pool sigma from Koios for pool: ${poolIdBech32}, epoch: ${epoch}.`
  }

  console.log('                    Epoch:', poolSnapshotData.epoch_no)
  console.log('             Active stake:', poolSnapshotData.pool_stake)
  console.log('              Total stake:', poolSnapshotData.active_stake)

  return {
    epoch_no: poolSnapshotData.epoch_no,
    nonce: poolSnapshotData.nonce,
    sigma: poolSnapshotData.pool_stake / poolSnapshotData.active_stake
  }
}

async function getLeaderLogs (
  firstSlotOfEpoch,
  poolVrfSkey,
  sigma,
  nonce,
  timeZone
) {
  let sLeader = cp.spawnSync(
    'python3',
    [
      './isSlotLeader.py',
      '--first-slot-of-epoch',
      firstSlotOfEpoch,
      '--genesis-start',
      genesisShelley.systemStart,
      '--epoch-nonce',
      nonce,
      '--vrf-skey',
      poolVrfSkey,
      '--sigma',
      sigma,
      '--d',
      0,
      '--epoch-length',
      genesisShelley.epochLength,
      '--active-slots-coeff',
      genesisShelley.activeSlotsCoeff,
      '--libsodium-binary',
      params.libsodiumBinary,
      '--time-zone',
      timeZone
    ],
    { encoding: 'utf8' }
  )

  sLeaderOutput = sLeader.stdout
  let slots = JSON.parse(sLeaderOutput)
  let expectedBlocks = sigma * 21600

  console.log('')
  console.log('expected blocks with d == ' + 0 + ':', expectedBlocks.toFixed(2))
  console.log(
    'assigned blocks with d == ' + 0 + ':',
    slots.length,
    'max performance:',
    ((slots.length / expectedBlocks) * 100).toFixed(2) + '%'
  )
  console.log('')
  console.log(slots)
}

async function calculateLeaderLogs () {
  console.log('                  Network: mainnet')
  console.log(
    `                  Starting leader logs calculation for ${targetEpoch} epoch`
  )
  console.log(`                  Loading: pool stake snapshot data from Koios`)
  const poolSnapshotData = await getSnapshotDataFromKoios(
    poolIdBech32,
    targetSnapshot
  )
  console.log(
    `                  Loading: first slot of epoch ${poolSnapshotData.epoch_no}`
  )
  const firstSlotOfEpoch = await getFirstSlotOfEpoch(
    poolSnapshotData.epoch_no,
    genesisShelley
  )

  const poolVrfSkey = vrfSkey.substr(4)

  console.log('         firstSlotOfEpoch:', firstSlotOfEpoch)
  console.log('                    sigma:', poolSnapshotData.sigma)
  console.log('            pool VRF sKey:', poolVrfSkey)
  console.log('')
  console.log('         Calculating leader slots...')
  await getLeaderLogs(
    firstSlotOfEpoch,
    poolVrfSkey,
    poolSnapshotData.sigma,
    poolSnapshotData.nonce,
    timeZone
  )
}

async function main () {
  await calculateLeaderLogs()
}

main()
