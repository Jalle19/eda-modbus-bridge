# MQTT topics

The following read-only topics are regularly published:

```
eda/alarm/CoolingError
eda/alarm/EHError
eda/alarm/EHPDA
eda/alarm/EmergencyStop
eda/alarm/ExtractFanPressureError
eda/alarm/ExtractFilterDirty
eda/alarm/FireRisk
eda/alarm/HPError
eda/alarm/HRError
eda/alarm/ReturnWaterCold
eda/alarm/ServiceReminder
eda/alarm/SupplyFanPressureError
eda/alarm/SupplyFilterDirty
eda/alarm/TE10SupplyAirAfterHeaterCold
eda/alarm/TE10SupplyAirAfterHeaterHot
eda/alarm/TE20RoomTempHot
eda/alarm/TE30ExtractAirCold
eda/alarm/TE30ExtractAirHot
eda/alarm/TE5SupplyAirAfterHRCold
eda/mode/away
eda/mode/centralVacuumCleaner
eda/mode/cookerHood
eda/mode/longAway
eda/mode/manualBoost
eda/mode/maxCooling
eda/mode/maxHeating
eda/mode/overPressure
eda/mode/summerNightCooling
eda/readings/cascadeI
eda/readings/cascadeP
eda/readings/cascadeSp
eda/readings/exhaustAirHumidity
eda/readings/exhaustAirTemperature
eda/readings/exhaustAirTemperatureBeforeHeatRecovery
eda/readings/freshAirTemperature
eda/readings/heatRecoveryExhaustSide
eda/readings/heatRecoverySupplySide
eda/readings/heatRecoveryTemperatureDifferenceExhaustSide
eda/readings/heatRecoveryTemperatureDifferenceSupplySide
eda/readings/mean48HourExhaustHumidity
eda/readings/overPressureTimeLeft
eda/readings/supplyAirTemperature
eda/readings/supplyAirTemperatureAfterHeatRecovery
eda/readings/ventilationLevelActual
eda/readings/ventilationLevelTarget
eda/readings/wasteAirTemperature
eda/settings/awayTemperatureReduction
eda/settings/awayVentilationLevel
eda/settings/longAwayTemperatureReduction
eda/settings/longAwayVentilationLevel
eda/settings/overPressureDelay
eda/settings/temperatureTarget
eda/settings/defrostingAllowed
eda/status
```

Boolean values are expressed as `ON` or `OFF`.

The following topics are optional and only published for certain models:

```
eda/mode/eco
eda/readings/roomTemperatureAvg
eda/readings/controlPanel1Temperature
eda/readings/controlPanel2Temperature
eda/readings/supplyFanSpeed
eda/readings/exhaustFanSpeed
eda/readings/returnWaterTemperature
eda/readings/exhaustAirTemperatureBeforeHeatRecovery
eda/settings/coolingAllowed
eda/settings/heatingAllowed
eda/settings/awayCoolingAllowed
eda/settings/awayHeatingAllowed
eda/settings/longAwayCoolingAllowed
eda/settings/longAwayHeatingAllowed
```

The following topics are published to once during application startup:

```
eda/deviceInformation/automationType
eda/deviceInformation/coolingTypeInstalled
eda/deviceInformation/familyType
eda/deviceInformation/fanType
eda/deviceInformation/heatingTypeInstalled
eda/deviceInformation/modbusAddress
eda/deviceInformation/modelName
eda/deviceInformation/modelType
eda/deviceInformation/serialNumber
eda/deviceInformation/softwareVersion
eda/deviceInformation/softwareVersionInt
```

The following topics can be written to in order to control the operation of the ventilation unit:

```
eda/mode/+/set
eda/settings/+/set
eda/alarm/acknowledge
```

* `eda/mode/` topics take the boolean values (`ON` or `OFF`)
* `eda/settings/` topics take integer or boolean values
* publishing to `eda/alarm/acknowledge` acknowledges the most recent active alarm, if any
