# Change log

## future release

* Log attempts to reconnect to the MQTT broker (https://github.com/Jalle19/eda-modbus-bridge/issues/36)
* Add documentation on how to physically connect to the unit
* Expose the device state (https://github.com/Jalle19/eda-modbus-bridge/issues/46)
* Configure entity icons for alarm sensors
* Move Home Assistant related logic to `homeassistant.mjs`

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
