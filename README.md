# cardano-leader-logs

In a community effort, led by Andrew Westberg [BCSH], we implemented a way to retrieve stakepool slot leader logs.

This is a `nodejs` + `python` implementation which was tested on Ubuntu 20.04.

**Note: this method only works for current epoch block assignments. Calculating next epochs assignments based on next epoch's nonce is not supported.**

Japanese README: https://github.com/btbf/cardano-leader-logs (outdated)

# Installation

## Ubuntu 20.04

### Node.js

```bash
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs

export NODE_PATH=/usr/lib/node_modules/
```

### Python

```bash
sudo apt-get update
sudo apt-get install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt-get update
sudo apt-get install -y python3.9
sudo apt-get install -y python3-pip

python3 --version
pip3 --version

pip3 install pytz
```

### Libsodium

```
git clone https://github.com/input-output-hk/libsodium
cd libsodium
git checkout 66f017f1
./autogen.sh
./configure
make
sudo make install
```

### cardano-node

The node does not need to run as a block producer as long as it has access to the correct `vrf.skey`.

## Configuration file - `slotLeaderLogsConfig.json`

Add your `poolId`, the path to your pool `vrf.skey`, and paths for both node genesis files (Shelley and Byron).
Make sure to have the node stats available as seen below (or put your own port).
The path to the `cardano-cli` could be a `cardano-cli` or `./cardano-cli` depending on how you installed the CLI previously.

```javscript
{
  "poolId":           "<YOUR_POOL_ID>",
  "vrfSkey":          "vrf.skey", // path to pool's VRF signing key

  "genesisShelley":   "../files/genesis.json", // path to Shelley genesis file
  "genesisByron":     "../files/byron-genesis.json", // path to Byron genesis file

  "libsodiumBinary":  "/usr/local/lib/libsodium.so", // path to Libsodium executable
  "cardanoCLI":       "cardano-cli", // path to cardano-cli executable
  "nodeStatsURL":     "http://127.0.0.1:12798/metrics", // location for node stats (from the node's `config.json`)

  "timeZone":         "Europe/London" // timezone to be used to display the block schedule in
}
```

## Retrieving the epoch nonce

To manually retrieve the epoch nonce (required for block schedule calculation):

```
cardano-cli query protocol-state --mainnet | jq -r .csTickn.ticknStateEpochNonce.contents

0022cfa563a5328c4fb5c8017121329e964c26ade5d167b1bd9b2ec967772b60
```

## Running

1. Through the provided `runLeaderLogs.sh`:
   By default, this script will look for the `slotLeaderLogsConfig.json` in the same directory -> this can be edited inside the script to specify another location for the config file:

```bash
SLOTLEADER_CONFIG="slotLeaderLogsConfig.json" # path to configuration file
```

```bash
./runLeaderLogs.sh

...

      Calculating leader slots...

expected blocks with d == 0.00: xy
assigned blocks with d == 0.00: xyz

[
  { index: 1, slot: 6354, date: '2021-06-25 00:30:45' }
  ...
]
```

2. Manually, by running:

```bash
node cardanoLeaderLogs.js path/to/slotLeaderLogsConfig.json epochNonceHash
```

## Thanks

Thanks to Andrew Westberg [BCSH], Papacarp [LOVE] and others who contributed.

This repository was created by Marcel Baumberg [TITAN] and is now maintained by Damjan Ostrelic [EDEN].
