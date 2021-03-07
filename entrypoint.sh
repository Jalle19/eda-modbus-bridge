#!/usr/bin/with-contenv bashio

DEVICE="$(bashio::config 'device')"

ls -lh
node /app/eda-modbus-bridge.mjs --device ${DEVICE} --httpPort 8080