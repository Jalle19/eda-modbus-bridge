#!/usr/bin/with-contenv bashio

DEVICE="$(bashio::config 'device')"
EXTRA_OPTIONS="$(bashio::config 'extraOptions')"

node --unhandled-rejections=warn /app/eda-modbus-bridge.mjs --device ${DEVICE} ${EXTRA_OPTIONS}
