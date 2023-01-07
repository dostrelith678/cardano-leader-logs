#!/bin/sh

SLOTLEADER_CONFIG="slotLeaderLogsConfig.json" # path to configuration file

node cardanoLeaderLogs.js $SLOTLEADER_CONFIG previous
