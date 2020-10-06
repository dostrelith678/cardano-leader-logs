# cardano-leader-logs
In a community effort, led by Andrew Westberg [BCSH], we implemented a way to retrieve stakepool slot leader logs.

This is a nodejs + python implementation which was tested on Ubuntu 20.04.

# installation

## Ubuntu 20.04

### nodejs

```bash
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -  
sudo apt update
sudo apt-get install -y nodejs

export NODE_PATH=/usr/lib/node_modules/
```

### python3

```bash
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.9
sudo apt install -y python3-pip

python3 ––version
pip3 --version

pip3 install pytz
```

### cardano-node

The node does not need to run as a block producer.


## slotLeaderLogsConfig.json

An example for epoch 221, which needs the below epoch nonce.  
Add your pool id, the path to your pool vrf.skey, paths for both node configs. 
As well as a path to the current ledgerstate.json, or null to generate a new one on runtime.
libsodium must be build as always from: https://github.com/input-output-hk/libsodium
Make sure to have the node stats available as seen below (or put your own port).
The path to the cardano-cli could be a cardano-cli or ./cardano-cli depending on how you installed the cli previously.

```javscript
{
  "epochNonce":       "5ee77854fe91cc243b8d5589de3192e795f162097dba7501f8d1b0d5d7546bd5",

  "poolId":           "00000000000000000000000000000000000000000000000000000000",
  "vrfSkey":          "/path/to/vrf.skey",

  "genesisShelley":   "/path/to/mainnet-shelley-genesis.json",
  "genesisByron":     "/path/to/mainnet-byron-genesis.json",

  "ledgerState":      "/path/to/cardano-leader-logs/ledgerstate.json",

  "libsodiumBinary":  "/usr/local/lib/libsodium.so",
  "cardanoCLI":       "cardano-cli",
  "nodeStatsURL":     "http://127.0.0.1:12798/metrics"
}
```

## run

Switch to the project directory, so the ledger state is generated in this directory.
This may take a while. Dumping the ledger state and going through 432000 slots takes time.

```bash
node cardanoLeaderLogs.js path/to/slotLeaderLogsConfig.json
```

## thanks

Thanks to Andrew Westberg [BCSH], Papacarp [LOVE] and others who contributed.

This repository is brought to you by Marcel Baumberg [TITAN]

