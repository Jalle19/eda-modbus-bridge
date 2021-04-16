#!/usr/bin/with-contenv bashio

DEVICE="$(bashio::config 'device')"
EXTRA_OPTIONS="$(bashio::config 'extraOptions')"

node /app/eda-modbus-bridge.mjs --device ${DEVICE} ${EXTRA_OPTIONS}
