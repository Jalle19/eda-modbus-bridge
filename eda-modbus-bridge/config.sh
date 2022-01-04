#!/usr/bin/env bashio
# shellcheck disable=SC2034

# commandline options
declare MODBUS_DEVICE
declare MODBUS_SLAVE
declare MQTT_SERVER
declare MQTT_CREDENTIALS
declare MQTT_PUBLISH_INTERVAL

# ------------------------------------------------------------------------------
# Read and print config.
# ------------------------------------------------------------------------------
function get-config {
  local modbusDevice
  local modbusSlave
  local mqttServer
  local mqttPort
  local mqttUser
  local mqttPassword
  local mqttPublishInterval

  modbusDevice=$(bashio::config 'modbus.device' | escape-input)
  modbusSlave=$(bashio::config 'modbus.slave')
  mqttServer=$(bashio::config 'mqtt.server' | escape-input)
  mqttPort=$(bashio::config 'mqtt.port')
  mqttUser=$(bashio::config 'mqtt.username' | escape-input)
  mqttPassword=$(bashio::config 'mqtt.password' | escape-input)
  mqttPublishInterval=$(bashio::config 'mqtt.publish_interval')

  bashio::log.info "---------------------------------------------------"
  bashio::log.info "Modbus device: ${modbusDevice}"
  MODBUS_DEVICE="--device ${modbusDevice}"

  bashio::log.info "Modbus slave: ${modbusSlave}"
  MODBUS_SLAVE="--modbusSlave ${modbusSlave}"

  if [[ -n "$mqttServer" ]]; then
    MQTT_SERVER="--mqttBrokerUrl mqtt://${mqttServer}:${mqttPort}"
    bashio::log.info "MQTT broker: ${mqttServer}:${mqttPort}"

    if [[ -n "$mqttUser" && -n "$mqttPassword" ]]; then
      MQTT_CREDENTIALS="--mqttUser $mqttUser --mqttPassword $mqttPassword"
      bashio::log.info "MQTT: using credentials"
    else
      bashio::log.info "MQTT: anonymous login"
    fi

    MQTT_PUBLISH_INTERVAL="--mqttPublishInterval ${mqttPublishInterval}"
    bashio::log.info "MQTT publish interval: ${mqttPublishInterval}"
  else
    bashio::log.info "MQTT: disabled"
  fi

  bashio::log.info "---------------------------------------------------"

  return 0
}

# ------------------------------------------------------------------------------
# Escape input given by the user.
#
# Returns the escaped string on stdout
# ------------------------------------------------------------------------------
function escape-input {
  local input
  read -r input

  # escape the evil dollar sign
  input=${input//$/\\$}

  echo "$input"
}
