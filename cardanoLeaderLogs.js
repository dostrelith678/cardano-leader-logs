const fs                      = require('fs')

const { updateNodeStats }     = require('./nodeUtils.js')
const { getFirstSlotOfEpoch } = require('./nodeUtils.js')

const { callCLIForJSON }      = require('./cliUtils.js')
const { execShellCommand }    = require('./cliUtils.js')

const { getSigma }            = require('./ledgerUtils.js')

if(process.argv.length < 3) {

  throw Error('Missing path to leaderLogsConfig.json')
}

const params                  = JSON.parse(fs.readFileSync(process.argv[2]))

if(
  !params.hasOwnProperty('epochNonce') ||
  !params.hasOwnProperty('poolId') ||
  !params.hasOwnProperty('vrfSkey') ||
  !params.hasOwnProperty('genesisShelley') ||
  !params.hasOwnProperty('genesisByron') ||
  !params.hasOwnProperty('ledgerState') ||
  !params.hasOwnProperty('libsodiumBinary') ||
  !params.hasOwnProperty('nodeStatsURL') ||
  !params.hasOwnProperty('cardanoCLI')
) {

  throw Error('Invalid leaderLogsConfig.json')
}

const cardanoCLI              = params.cardanoCLI

const epochNonce              = params.epochNonce

const poolId                  = params.poolId
const vrfSkey                 = JSON.parse(fs.readFileSync(params.vrfSkey)).cborHex
const genesisShelley          = JSON.parse(fs.readFileSync(params.genesisShelley))
const genesisByron            = JSON.parse(fs.readFileSync(params.genesisByron))

async function loadLedgerState(magicString) {

  await execShellCommand(cardanoCLI + ' shelley query ledger-state --cardano-mode ' + magicString + ' > ' + process.cwd() + '/ledgerstate.json ')
  return JSON.parse(fs.readFileSync(process.cwd()+'/ledgerstate.json'))
}

async function calculateLeaderLogs() {

  const magicString           = genesisShelley.networkId === 'testnet' ?
    '--testnet-magic ' + genesisShelley.networkMagic :
    '--mainnet'

  console.log('Network:', magicString)
  console.log('Loading ledger state:', params.ledgerState)

  let ledger                  = null

  if(params.ledgerState === null) {

    ledger = await loadLedgerState(magicString)

  } else {

    try {

      ledger                  = JSON.parse(fs.readFileSync(params.ledgerState))

    } catch(e) {

      console.log('Could not load ledger state from config. Trying to generate new lederstate.json')

      ledger = await loadLedgerState(magicString)
    }
  }

  console.log('Loading protocol parameters')

  const protocolParameters    = await callCLIForJSON(cardanoCLI + ' shelley query protocol-parameters --cardano-mode ' + magicString)
  const tip                   = await callCLIForJSON(cardanoCLI + ' shelley query tip ' + magicString)

  const firstSlotOfEpoch      = await getFirstSlotOfEpoch(genesisByron, genesisShelley, tip.slotNo)
  const sigma                 = await getSigma(poolId, ledger)
  const poolVrfSkey           = vrfSkey.substr(4)

  execShellCommand('python3 ./isSlotLeader.py' +
    ' --first-slot-of-epoch ' + firstSlotOfEpoch +
    ' --epoch-nonce '         + epochNonce +
    ' --vrf-skey '            + poolVrfSkey +
    ' --sigma '               + sigma +
    ' --d '                   + protocolParameters.decentralisationParam +
    ' --epoch-length '        + genesisShelley.epochLength +
    ' --active-slots-coeff '  + genesisShelley.activeSlotsCoeff +
    ' --libsodium-binary '    + params.libsodiumBinary
  )
  .then(out => { console.log(out) })
}


async function main() {

  await updateNodeStats(params.nodeStatsURL)
  await calculateLeaderLogs()
}

main()
