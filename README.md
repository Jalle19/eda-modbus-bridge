# eda-modbus-bridge

> I take no responsibility if you break your ventilation unit by using this software!

An HTTP bridge for Enervent ventilation units with EDA automation. It provides a very basic HTTP interface for 
interacting with the ventilation unit. Communication happens over RS-485 (Modbus RTU) by connecting your serial device 
to the "Freeway" port on the ventilation unit's computer board.

The endpoints for enabling/disabling the various modes are designed to be consumed by 
https://www.home-assistant.io/integrations/switch.rest/ with minimal effort.

## Requirements

* Node.js (only tested with 14.x)
* An Enervent Pingvin ventilation unit (other EDA-based units may work, but the register numbers probably differ)
* An RS-485 device (e.g. `/dev/ttyUSB0`) connected to the Enervent unit's Freeway port

## Usage

```
node eda-modbus-bridge.mjs [options]

Options:
      --help         Show help                                         [boolean]
      --version      Show version number                               [boolean]
  -d, --device       The serial device to use, e.g. /dev/ttyUSB0      [required]
  -s, --modbusSlave  The Modbus slave address                       [default: 1]
  -p, --httpPort     The HTTP port to listen on                  [default: 8080]
```

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
        "ventilationLevelTarget": 60,
        "temperatureTarget": 17.0
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

### POST /setSetting/{setting}/{value}

> Setting ventilation level doesn't seem to work, propably a firmware bug

Changes the setting to the specified value. Can be used to set the ventilation level and the target temperature. 
Returns the new setting values, like this:

```json
{
  "ventilationLevelTarget": 60,
  "temperatureTarget": 17.0
}
```

## Running as a service

You can use the provided systemd unit to run the software as a daemon

## License

GNU GENERAL PUBLIC LICENSE 3.0