#!/bin/sh

echo "Please note that this relies on having a cloned version of:https://github.com/DamjanOstrelic/cardano-leader-logs."

SLOTLEADER_CONFIG="slotLeaderLogsConfig.json" # path to configuration file
EPOCH_NONCE=$(cardano-cli query protocol-state --mainnet | jq -r .csTickn.ticknStateEpochNonce.contents)

node cardanoLeaderLogs.js $SLOTLEADER_CONFIG $EPOCH_NONCE
