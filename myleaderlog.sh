#!/bin/sh

echo "Please note that this relies on having a cloned version of:https://github.com/DamjanOstrelic/cardano-leader-logs."
echo "Then change the directory where this cloning is done into CARDANO_LLOG_EXEC parameter"
echo "Also we need to have vrf.skey into the VRF_KEY_FILE parameter"


SLOTLEADER_CONFIG="$HOME/projects/cardano-scripts/src/cscripts/slotLeaderconfig.json"
LEDGER_FILE="/tmp/ledger.json"
VRF_KEY_FILE="$HOME/projects/cardano-scripts/src/kaddr_run/vrf.skey"
CARDANO_LLOG_EXEC="$HOME/projects/cardano-leader-logs/"
cardano-cli query ledger-state --mainnet --out-file $LEDGER_FILE
EPOCH_NONCE=$(cardano-cli query protocol-state --mainnet | jq -r .csTickn.ticknStateEpochNonce.contents)
cd $CARDANO_LLOG_EXEC
node  cardanoLeaderLogs.js $CARDANO_LLOG_EXEC  $SLOTLEADER_CONFIG  $EPOCH_NONCE
