# eda-modbus-bridge

An HTTP bridge for Enervent EDA ventilation units. It provides a very basic HTTP interface for interacting with the 
ventilation unit. Communication happens over RS-485 (Modbus RTU) by connecting your serial device to the "Freeway" port 
on the ventilation unit's computer board.

## Requirements

* Python 3 (tested with 3.5 and 3.8)
* An RS-485 device (e.g. `/dev/ttyUSB0`) connected to the Enervent unit's Freeway port

## Usage

```
usage: app.py [-h] [--httpListenPort HTTPLISTENPORT] [--verbose] serialPort

positional arguments:
  serialPort            The serial port device to use

optional arguments:
  -h, --help            show this help message and exit
  --httpListenPort HTTPLISTENPORT
                        The port for the HTTP server to listen on
  --verbose             Use verbose logging
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
    "freshAirTemperature": 12.6,
    "supplyAirTemperatureAfterHeatRecovery": 19.5,
    "supplyAirTemperature": 16.6,
    "wasteAirTemperature": 19.9,
    "exhaustAirTemperature": 22.6,
    "exhaustAirHumidity": 40,
    "heatRecoverySupplySide": 69,
    "heatRecoveryExhaustSide": 0,
    "heatRecoveryTemperatureDifferenceSupplySide": 6.9,
    "heatRecoveryTemperatureDifferenceExhaustSide": 2.7,
    "mean48HourExhaustHumidity": 43,
    "cascadeSp": 170,
    "cascadeP": 0,
    "cascadeI": 2,
    "50 tod": 60,
    "51 tulo": 30,
    "52 poisto": 30,
    "53 pyynt\u00f6": 60
  },
  "settings": {
    "ventilationLevelActual": 60,
    "ventilationLevelTarget": 60,
    "temperatureTarget": 17.0
  },
  "deviceInformation": {
    "fanType": true,
    "familyType": 0,
    "serialNumber": 0,
    "softwareVersion": 217
  }
}
```

### POST /enableFlag/{flag}

Enables the specified flag and returns a summary of all flags, like this:

```json
{
  "away": true,
  "longAway": false,
  "overPressure": false,
  "maxHeating": false,
  "maxCooling": false,
  "manualBoost": false,
  "summerNightCooling": false
}
```

### POST /disableFlag/{flag}

Same as above, but it disables the flag

### POST /setSetting/{setting}/{value}

> Setting ventilation level doesn't seem to work, propably a firmware bug

Changes the setting to the specified value. Can be used to set the ventilation level and the target temperature. 
Returns the new setting values, like this:

```json
{
  "ventilationLevelActual": 60,
  "ventilationLevelTarget": 60,
  "temperatureTarget": 17.0
}
```

## License

GNU GENERAL PUBLIC LICENSE 3.0