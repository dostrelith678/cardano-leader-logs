const http = require("http");

const nodeStats = {};

function getEpoch() {
  return nodeStats.cardano_node_metrics_epoch_int;
}

function getSlot() {
  return nodeStats.cardano_node_metrics_slotNum_int;
}

function getSlotInEpoch() {
  return nodeStats.cardano_node_metrics_slotInEpoch_int;
}

function getShelleyTransitionEpoch(byron, shelley) {
  const slotInEpoch = getSlotInEpoch();
  const slot = getSlot();

  const byronEpochLength = 10 * byron.protocolConsts.k;
  let byronEpochs = getEpoch();
  let shelleyEpochs = 0;
  let calcSlot = 0;

  while (byronEpochs >= 0) {
    calcSlot =
      byronEpochs * byronEpochLength +
      shelleyEpochs * shelley.epochLength +
      slotInEpoch;

    if (calcSlot === slot) {
      break;
    }

    byronEpochs--;
    shelleyEpochs++;
  }

  if (calcSlot !== slot || shelleyEpochs === 0) {
    return -1;
  }

  return byronEpochs;
}

function getFirstSlotOfEpoch(byron, shelley, absoluteSlot) {
  const shelleyTransitionEpoch = getShelleyTransitionEpoch(byron, shelley);

  if (shelleyTransitionEpoch === -1) {
    return -1;
  }

  const byronEpochLength = 10 * byron.protocolConsts.k;
  const byronSlots = byronEpochLength * shelleyTransitionEpoch;
  const shelleySlots = absoluteSlot - byronSlots;
  const shelleySlotInEpoch = shelleySlots % shelley.epochLength;

  return absoluteSlot - shelleySlotInEpoch;
}

function updateNodeStats(nodeStatsURL) {
  return new Promise((resolve, reject) => {
    http
      .get(nodeStatsURL, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          const nodeStatsArray = data.split("\n");

          for (let i = 0; i < nodeStatsArray.length; i++) {
            const entry = nodeStatsArray[i].split(" ");

            if (entry[0] && entry[0].length > 0) {
              nodeStats[entry[0]] = Number.parseFloat(entry[1]);
            }
          }

          // console.log('updateNodeStats:', nodeStats)

          resolve();
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

module.exports = {
  getEpoch,
  getSlot,
  getSlotInEpoch,
  getFirstSlotOfEpoch,
  updateNodeStats,
};
