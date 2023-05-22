# Change log

## 2.3.1

* Log stack traces for unknown errors (should help debug https://github.com/Jalle19/home-assistant-addon-repository/issues/17)
* Use `%` instead of `%H` for MQTT humidity sensor entities (https://github.com/Jalle19/eda-modbus-bridge/issues/64)
* Fix automatic reconnect to MQTT broker when initial connection attempt fails (https://github.com/Jalle19/eda-modbus-bridge/issues/61)

## 2.3.0

* Add initial support for MD automation units (https://github.com/Jalle19/eda-modbus-bridge/issues/58), mainly "eco mode"
* Add a "known issues" section to the README

## 2.2.0

* Log attempts to reconnect to the MQTT broker (https://github.com/Jalle19/eda-modbus-bridge/issues/36)
* Add documentation on how to physically connect to the unit
* Expose the device state (https://github.com/Jalle19/eda-modbus-bridge/issues/46)
* Configure entity icons for alarm sensors
* Move Home Assistant related logic to `homeassistant.mjs`
* Publish device information over MQTT once only (https://github.com/Jalle19/eda-modbus-bridge/issues/43)

## 2.1.0

* Add basic test suite
* Retain MQTT discovery configuration messages (fixes https://github.com/Jalle19/eda-modbus-bridge/issues/29)
* Publish only changed settings or modes in MQTT callback (fixes https://github.com/Jalle19/eda-modbus-bridge/issues/33)
* Add alarms support (fixes https://github.com/Jalle19/eda-modbus-bridge/issues/31)
* Format code using `prettier`
* Support running on Node.js 12.x (fixes https://github.com/Jalle19/eda-modbus-bridge/issues/38)

## 2.0.0

First production-ready version with full MQTT support and good Home Assistant integration

## 1.0.0

Initial version number that was used while the application was still under development
