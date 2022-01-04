#!/usr/bin/with-contenv bashio

source config.sh

get-config

node --unhandled-rejections=warn /app/eda-modbus-bridge.mjs ${MODBUS_DEVICE} ${MODBUS_SLAVE} ${MQTT_SERVER} ${MQTT_CREDENTIALS} ${MQTT_PUBLISH_INTERVAL}
