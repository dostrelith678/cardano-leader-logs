const fs = require("fs");
const cp = require("child_process");
const axios = require("axios");

const { updateNodeStats } = require("./nodeUtils.js");
const { getFirstSlotOfEpoch } = require("./nodeUtils.js");

const { callCLIForJSON } = require("./cliUtils.js");

console.log("             process args:", process.argv);

if (process.argv.length < 4) {
  throw Error(
    "Usage: node cardanoLeaderLogs.js path/to/leaderlogs.config epochNonce"
  );
}

if (process.argv.length >= 6 && !isNaN(parseFloat(process.argv[5]))) {
  overwriteDFactor = parseFloat(process.argv[5]);
}

const params = JSON.parse(fs.readFileSync(process.argv[2]));

if (
  !params.hasOwnProperty("poolId") ||
  !params.hasOwnProperty("vrfSkey") ||
  !params.hasOwnProperty("genesisShelley") ||
  !params.hasOwnProperty("genesisByron") ||
  !params.hasOwnProperty("libsodiumBinary") ||
  !params.hasOwnProperty("nodeStatsURL") ||
  !params.hasOwnProperty("cardanoCLI") ||
  !params.hasOwnProperty("timeZone")
) {
  throw Error("Invalid leaderLogsConfig.json");
}

const cardanoCLI = params.cardanoCLI;

const epochNonce = process.argv[3];
const lastEpoch = process.argv.length >= 5 && process.argv[4] === "1";

console.log("     replaying last epoch: ", lastEpoch);

const poolId = params.poolId;
const timeZone = params.timeZone;
const vrfSkey = JSON.parse(fs.readFileSync(params.vrfSkey)).cborHex;
const genesisShelley = JSON.parse(fs.readFileSync(params.genesisShelley));
const genesisByron = JSON.parse(fs.readFileSync(params.genesisByron));
const magicString =
  genesisShelley.networkId === "Testnet"
    ? "--testnet-magic " + genesisShelley.networkMagic
    : "--mainnet";

async function getSigmaFromCLI(poolId) {
  const stakeSnapshot = await callCLIForJSON(
    cardanoCLI +
      " query stake-snapshot --stake-pool-id " +
      poolId +
      " " +
      magicString
  );
  const activePoolStake = stakeSnapshot.poolStakeSet;
  const activeTotalStake = stakeSnapshot.activeStakeSet;

  console.log("             active stake:", activePoolStake);
  console.log("              total stake:", activeTotalStake);

  return activePoolStake / activeTotalStake;
}

async function getSigmaFromKoios(poolId, epoch) {
  const poolActiveStakeUrl = `http://65.21.183.97:8053/pool_active_stake_cache?select=amount&pool_id=eq.${poolId}&epoch_no=eq.${epoch}`;
  const epochActiveStakeUrl = `http://65.21.183.97:8053/epoch_active_stake_cache?select=amount&epoch_no=eq.${epoch}`;

  const poolActiveStakeResponse = await axios.get(poolActiveStakeUrl);
  const epochActiveStakeResponse = await axios.get(epochActiveStakeUrl);

  const poolActiveStake = poolActiveStakeResponse.data[0].amount;
  const epochActiveStake = epochActiveStakeResponse.data[0].amount;

  console.log("             active stake:", poolActiveStake);
  console.log("              total stake:", epochActiveStake);

  return poolActiveStake / epochActiveStake;
}

async function getLeaderLogs(
  firstSlotOfEpoch,
  poolVrfSkey,
  sigma,
  d,
  timeZone
) {
  let sLeader = cp.spawnSync(
    "python3",
    [
      "./isSlotLeader.py",
      "--first-slot-of-epoch",
      firstSlotOfEpoch,
      "--epoch-nonce",
      epochNonce,
      "--vrf-skey",
      poolVrfSkey,
      "--sigma",
      sigma,
      "--d",
      d,
      "--epoch-length",
      genesisShelley.epochLength,
      "--active-slots-coeff",
      genesisShelley.activeSlotsCoeff,
      "--libsodium-binary",
      params.libsodiumBinary,
      "--time-zone",
      timeZone,
    ],
    { encoding: "utf8" }
  );

  sLeaderOutput = sLeader.stdout;
  let slots = JSON.parse(sLeaderOutput);
  let expectedBlocks = sigma * 21600 * (1.0 - d);

  console.log("");
  console.log(
    "expected blocks with d == " + d.toFixed(2) + ":",
    expectedBlocks.toFixed(2)
  );
  console.log(
    "assigned blocks with d == " + d.toFixed(2) + ":",
    slots.length,
    "max performance:",
    ((slots.length / expectedBlocks) * 100).toFixed(2) + "%"
  );
  console.log("");
  console.log(slots);
}

async function calculateLeaderLogs() {
  console.log("                  Network:", magicString);
  console.log("                  Loading: protocol parameters");

  const protocolParameters = await callCLIForJSON(
    cardanoCLI + " query protocol-parameters " + magicString
  );
  const tip = await callCLIForJSON(cardanoCLI + " query tip " + magicString);

  console.log(`                  Loading: first slot of the current epoch`);
  const firstSlotOfEpoch = await getFirstSlotOfEpoch(
    genesisByron,
    genesisShelley,
    tip.slot - (lastEpoch ? genesisShelley.epochLength : 0)
  );
  console.log(`                  Loading: sigma for pool ID: ${poolId}`);
  // const sigma = await getSigmaFromCLI(poolId);
  const sigma = await getSigmaFromKoios(poolId, tip.epoch);
  const poolVrfSkey = vrfSkey.substr(4);

  let d = parseFloat(protocolParameters.decentralization);

  console.log("         firstSlotOfEpoch:", firstSlotOfEpoch);
  console.log("                    sigma:", sigma);
  console.log("");
  console.log("         Calculating leader slots...");
  await getLeaderLogs(firstSlotOfEpoch, poolVrfSkey, sigma, d, timeZone);
}

async function main() {
  await updateNodeStats(params.nodeStatsURL);
  await calculateLeaderLogs();
}

main();
