# HTTP endpoints

### GET /summary

Returns a JSON object like this:

```json
{
  "flags": {
    "away": false,
    "longAway": false,
    "overPressure": false,
    "cookerHood": false,
    "centralVacuumCleaner": false,
    "maxHeating": false,
    "maxCooling": false,
    "manualBoost": false,
    "summerNightCooling": false
  },
  "modes": {
    "away": false,
    "longAway": false,
    "overPressure": false,
    "cookerHood": false,
    "centralVacuumCleaner": false,
    "maxHeating": false,
    "maxCooling": false,
    "manualBoost": false,
    "summerNightCooling": false
  },
  "readings": {
    "freshAirTemperature": -2.9,
    "supplyAirTemperatureAfterHeatRecovery": 16.8,
    "supplyAirTemperature": 17,
    "wasteAirTemperature": 0.3,
    "exhaustAirTemperature": 19.3,
    "exhaustAirTemperatureBeforeHeatRecovery": -40,
    "exhaustAirHumidity": 51,
    "heatRecoverySupplySide": 88,
    "heatRecoveryExhaustSide": 85,
    "heatRecoveryTemperatureDifferenceSupplySide": 19.8,
    "heatRecoveryTemperatureDifferenceExhaustSide": 19,
    "mean48HourExhaustHumidity": 37,
    "cascadeSp": 170,
    "cascadeP": 0,
    "cascadeI": 130,
    "overPressureTimeLeft": 0,
    "ventilationLevelActual": 75,
    "ventilationLevelTarget": 65
  },
  "settings": {
    "overPressureDelay": 5,
    "awayVentilationLevel": 30,
    "awayTemperatureReduction": 2,
    "longAwayVentilationLevel": 49,
    "longAwayTemperatureReduction": 0,
    "temperatureTarget": 17,
    "coolingAllowed": true,
    "heatingAllowed": true,
    "awayCoolingAllowed": true,
    "awayHeatingAllowed": false,
    "longAwayCoolingAllowed": true,
    "longAwayHeatingAllowed": false
  },
  "deviceInformation": {
    "softwareVersion": 2.17,
    "automationType": "EDA",
    "fanType": "EC",
    "coolingTypeInstalled": null,
    "heatingTypeInstalled": "EDE/MDE",
    "modelType": "Pingvin",
    "serialNumber": 0,
    "modelName": "Pingvin eco EDE/MDE",
    "modbusAddress": 1
  },
  "deviceState": {
    "normal": true,
    "maxCooling": false,
    "maxHeating": false,
    "emergencyStop": false,
    "stop": false,
    "away": false,
    "longAway": false,
    "temperatureBoost": false,
    "co2Boost": false,
    "humidityBoost": false,
    "manualBoost": false,
    "overPressure": false,
    "cookerHood": false,
    "centralVacuumCleaner": false,
    "heaterCooldown": false,
    "summerNightCooling": false,
    "defrosting": false
  },
  "alarmSummary": [
    {
      "name": "TE5SupplyAirAfterHRCold",
      "description": "TE5 Supply air after heat recovery cold",
      "type": 1,
      "state": 0
    },
    {
      "name": "TE10SupplyAirAfterHeaterCold",
      "description": "TE10 Supply air after heater cold",
      "type": 2,
      "state": 0
    },
    ...
  ],
  "activeAlarm": null
}

```

### GET /mode/{mode}

Returns the status of the specified mode. The response looks like this:

```json
{"active":false}
```

### GET /alarms

Returns the active or dismissed alarms. The response looks like this:

```json
{
    "alarms": [
        {
            "name": "ServiceReminder",
            "description": "Service reminder",
            "state": 1, // 2 = Active, 1 = Dismissed
            "date": "2021-10-24T11:28:00.000Z"
        },...
    ]
}
```

### POST /mode/{mode}

Enables/disables the specified mode depending on the boolean value in the following request body:

```json
{"active":false}
```

The response is identical to that of `GET /mode/{mode}`.

### POST /setting/{setting}/{value}

Changes the setting to the specified value. HTTP 400 is returned if the value specified is out of range or invalid.

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
