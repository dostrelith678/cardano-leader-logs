#!/bin/sh

echo "Please note that this relies on having a cloned version of:https://github.com/DamjanOstrelic/cardano-leader-logs."
echo "Then change the directory where this cloning is done into CARDANO_LLOG_EXEC parameter"
echo "Also we need to have vrf.skey into the VRF_KEY_FILE parameter"

SLOTLEADER_CONFIG="slotLeaderLogsConfig.json" # path to configuration file
EPOCH_NONCE=$(cardano-cli query protocol-state --mainnet | jq -r .csTickn.ticknStateEpochNonce.contents)

node cardanoLeaderLogs.js $SLOTLEADER_CONFIG $EPOCH_NONCE
