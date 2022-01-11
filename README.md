# eda-modbus-bridge

An HTTP/MQTT bridge for Enervent ventilation units with EDA automation (e.g. Pingvin). It provides a REST-ful HTTP interface 
for interacting with the ventilation unit (reading temperatures and changing certain settings), as well as an MQTT 
client which can publish readings/settings regularly and be used to control the ventilation unit.

Communication happens over RS-485 (Modbus RTU) by connecting a serial device to the "Freeway" port on the ventilation 
unit's computer board.

The REST endpoints for enabling/disabling the various modes are designed to be consumed by 
https://www.home-assistant.io/integrations/switch.rest/ with minimal effort. See examples in the `docs/` directory.

## Features

* HTTP API for reading temperatures, modes and settings, as well as changing some settings
* MQTT support (read and write), including Home Assistant MQTT discovery support 

## Requirements

* Node.js (only tested with 14.x)
* An Enervent Pingvin ventilation unit (other EDA-based units may work, but the Modbus register numbers probably differ)
* An RS-485 device (e.g. `/dev/ttyUSB0`) connected to the Enervent unit's Freeway port

## Usage

```
node eda-modbus-bridge.mjs [options]

Options:
      --help                 Show help                                 [boolean]
      --version              Show version number                       [boolean]
  -d, --device               The serial device to use, e.g. /dev/ttyUSB0
                                                                      [required]
  -s, --modbusSlave          The Modbus slave address               [default: 1]
      --http                 Whether to enable the HTTP server or not
                                                       [boolean] [default: true]
  -a, --httpListenAddress    The address to listen (HTTP)   [default: "0.0.0.0"]
  -p, --httpPort             The port to listen on (HTTP)        [default: 8080]
  -m, --mqttBrokerUrl        The URL to the MQTT broker, e.g. tcp://localhost:18
                             83. Omit to disable MQTT support.
      --mqttUsername         The username to use when connecting to the MQTT bro
                             ker. Omit to disable authentication.
      --mqttPassword         The password to use when connecting to the MQTT bro
                             ker. Required when mqttUsername is defined. Omit to
                              disable authentication.
  -i, --mqttPublishInterval  How often messages should be published over MQTT (i
                             n seconds)                            [default: 10]
      --mqttDiscovery        Whether to enable Home Assistant MQTT discovery sup
                             port. Only effective when mqttBrokerUrl is defined.
                                                       [boolean] [default: true]
```

## HTTP endpoints

There's a Postman collection under `docs/`.

### GET /summary

Returns a JSON object like this:

```json
{
    "flags": {
        "away": false,
        "longAway": false,
        "overPressure": false,
        "maxHeating": false,
        "maxCooling": false,
        "manualBoost": false,
        "summerNightCooling": false
    },
    "readings": {
        "freshAirTemperature": 7.3,
        "supplyAirTemperatureAfterHeatRecovery": 21.7,
        "supplyAirTemperature": 21.4,
        "wasteAirTemperature": 11.2,
        "exhaustAirTemperature": 22.5,
        "exhaustAirTemperatureBeforeHeatRecovery": -40.0,
        "exhaustAirHumidity": 45,
        "heatRecoverySupplySide": 94,
        "heatRecoveryExhaustSide": 74,
        "heatRecoveryTemperatureDifferenceSupplySide": 14.4,
        "heatRecoveryTemperatureDifferenceExhaustSide": 11.3,
        "mean48HourExhaustHumidity": 39,
        "cascadeSp": 170,
        "cascadeP": 0,
        "cascadeI": 100,
        "overPressureTimeLeft": 0,
        "ventilationLevelActual": 60
    },
    "settings": {
        "overPressureDelay": 60,
        "awayVentilationLevel": 30,
        "awayTemperatureReduction": 2,
        "longAwayVentilationLevel": 60,
        "longAwayTemperatureReduction": 0,
        "temperatureTarget": 17
    },
    "deviceInformation": {
        "fanType": true,
        "heatingConfigurationMode": 1,
        "familyType": 0,
        "serialNumber": 0,
        "softwareVersion": 217
    }
}
```

### GET /mode/{flag}

Returns the status of the specified mode/flag. The response looks like this:

```json
{"active":false}
```

### POST /mode/{flag}

Enables/disables the specified mode/flag depending on the boolean value in the following request body:

```json
{"active":false}
```

The response is identical to that of `GET /mode/{flag}`.

### POST /setting/{setting}/{value}

Changes the setting to the specified value. HTTP 400 is thrown if the value specified is out of range or invalid.

Returns the new setting values, like this:

```json
{
   "overPressureDelay": 60,
   "awayVentilationLevel": 30,
   "awayTemperatureReduction": 2,
   "longAwayVentilationLevel": 60,
   "longAwayTemperatureReduction": 0,
   "temperatureTarget": 17
}
```

## MQTT support

When an MQTT broker URL is specified, the application connects to the broker and starts to regularly publish data at 
the configured interval (defaults to every 10 seconds).

Every topic is prefixed by `eda/`, so to subscribe to everything the application sends out, subscribe to `eda/#`

The following read-only topics are available:

```
eda/status
eda/mode/away
eda/mode/longAway
eda/mode/overPressure
eda/mode/maxHeating
eda/mode/maxCooling
eda/mode/manualBoost
eda/mode/summerNightCooling
eda/readings/freshAirTemperature
eda/readings/supplyAirTemperatureAfterHeatRecovery
eda/readings/supplyAirTemperature
eda/readings/wasteAirTemperature
eda/readings/exhaustAirTemperature
eda/readings/exhaustAirTemperatureBeforeHeatRecovery
eda/readings/exhaustAirHumidity
eda/readings/heatRecoverySupplySide
eda/readings/heatRecoveryExhaustSide
eda/readings/heatRecoveryTemperatureDifferenceSupplySide
eda/readings/heatRecoveryTemperatureDifferenceExhaustSide
eda/readings/mean48HourExhaustHumidity
eda/readings/cascadeSp
eda/readings/cascadeP
eda/readings/cascadeI
eda/readings/overPressureTimeLeft
eda/readings/ventilationLevelActual
eda/readings/ventilationLevelTarget
eda/settings/overPressureDelay
eda/settings/awayVentilationLevel
eda/settings/awayTemperatureReduction
eda/settings/longAwayVentilationLevel
eda/settings/longAwayTemperatureReduction
eda/settings/temperatureTarget
eda/deviceInformation/fanType
eda/deviceInformation/coolingTypeInstalled
eda/deviceInformation/heatingTypeInstalled
eda/deviceInformation/familyType
eda/deviceInformation/serialNumber
eda/deviceInformation/softwareVersion
```

The following topics can be written to in order to control the operation of the ventilation unit:

```
eda/mode/away/set
eda/mode/longAway/set
eda/mode/overPressure/set
eda/mode/maxHeating/set
eda/mode/maxCooling/set
eda/mode/manualBoost/set
eda/mode/summerNightCooling/set
eda/settings/overPressureDelay/set
eda/settings/awayVentilationLevel/set
eda/settings/awayTemperatureReduction/set
eda/settings/longAwayVentilationLevel/set
eda/settings/longAwayTemperatureReduction/set
eda/settings/temperatureTarget/set
```

* `eda/mode/` topics take the values `ON` or `OFF`
* `eda/settings/` topics take integer values

### Home Assistant MQTT discovery

The application supports Home Assistant's MQTT Discovery feature, meaning your ventilation unit will show up as a device
in Home Assistant automatically through the MQTT integration. The following entities are available:

* sensors for all readings
* numbers (configurable) for settings
* switches for the ventilation modes

![](https://raw.githubusercontent.com/Jalle19/eda-modbus-bridge/master/docs/readme_ha1.png "Home Assistant device info")
![](https://raw.githubusercontent.com/Jalle19/eda-modbus-bridge/master/docs/readme_ha2.png "Home Assistant controls")
![](https://raw.githubusercontent.com/Jalle19/eda-modbus-bridge/master/docs/readme_ha3.png "Home Assistant sensors")
![](https://raw.githubusercontent.com/Jalle19/eda-modbus-bridge/master/docs/readme_ha4.png "Home Assistant configuration")

## Running as a systemd service

You can use the provided systemd unit to run the software as a daemon

## Running as a Home Assistant OS addon

See https://github.com/Jalle19/home-assistant-addon-repository/tree/main/eda-modbus-bridge

## License

GNU GENERAL PUBLIC LICENSE 3.0
