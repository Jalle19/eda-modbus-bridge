import collections


def parse_temperature(temperature):
    if temperature > 60000:
        temperature = (65536 - temperature) * -1

    return temperature / 10


class Modbus:

    def __init__(self, modbus_client):
        self.modbus_client = modbus_client
        self.AVAILABLE_FLAGS = {
            "away": 1,
            "longAway": 2,
            "overPressure": 3,
            "maxHeating": 6,
            "maxCooling": 7,
            "manualBoost": 10,
            "summerNightCooling": 12,
        }
        self.AVAILABLE_SETTINGS = {
            "ventilationLevel": 53,
            "temperatureTarget": 135,
        }

    async def get_flag_summary(self):
        summary = collections.OrderedDict()

        result = await self.modbus_client.read_coils(1, 10, unit=0x01)
        summary["away"] = result.bits[0]
        summary["longAway"] = result.bits[1]
        summary["overPressure"] = result.bits[2]
        summary["maxHeating"] = result.bits[5]
        summary["maxCooling"] = result.bits[6]
        summary["manualBoost"] = result.bits[9]
        result = await self.modbus_client.read_coils(12, 1, unit=0x01)
        summary["summerNightCooling"] = result.bits[0]

        return summary

    async def get_flag(self, flag):
        if flag not in self.AVAILABLE_FLAGS.keys():
            raise KeyError()

        result = await self.modbus_client.read_coils(self.AVAILABLE_FLAGS[flag], 1, unit=0x01)

        return result.bits[0]

    async def set_flag(self, flag, value):
        if flag not in self.AVAILABLE_FLAGS.keys():
            raise KeyError()

        await self.modbus_client.write_coil(self.AVAILABLE_FLAGS[flag], value, unit=0x01)

    async def get_readings(self):
        readings = collections.OrderedDict()

        result = await self.modbus_client.read_holding_registers(6, 8, unit=0x01)
        readings["freshAirTemperature"] = parse_temperature(result.registers[0])
        readings["supplyAirTemperatureAfterHeatRecovery"] = parse_temperature(result.registers[1])
        readings["supplyAirTemperature"] = parse_temperature(result.registers[2])
        readings["wasteAirTemperature"] = parse_temperature(result.registers[3])
        readings["exhaustAirTemperature"] = parse_temperature(result.registers[4])
        readings["exhaustAirHumidity"] = result.registers[7]
        result = await self.modbus_client.read_holding_registers(29, 7, unit=0x01)
        readings["heatRecoverySupplySide"] = result.registers[0]
        readings["heatRecoveryExhaustSide"] = result.registers[1]
        readings["heatRecoveryTemperatureDifferenceSupplySide"] = parse_temperature(result.registers[2])
        readings["heatRecoveryTemperatureDifferenceExhaustSide"] = parse_temperature(result.registers[3])
        readings["mean48HourExhaustHumidity"] = result.registers[6]
        result = await self.modbus_client.read_holding_registers(47, 3, unit=0x01)
        readings["cascadeSp"] = result.registers[0]
        readings["cascadeP"] = result.registers[1]
        readings["cascadeI"] = result.registers[2]

        return readings

    async def get_settings(self):
        settings = collections.OrderedDict()

        result = await self.modbus_client.read_holding_registers(50, 4, unit=0x01)
        settings["ventilationLevelActual"] = result.registers[0]
        settings["ventilationLevelTarget"] = result.registers[3]
        result = await self.modbus_client.read_holding_registers(135, 1, unit=0x01)
        settings["temperatureTarget"] = parse_temperature(result.registers[0])

        return settings

    async def set_setting(self, setting, value):
        if setting not in self.AVAILABLE_SETTINGS.keys():
            raise KeyError()

        value = int(value)

        if setting == "ventilationLevel" and (value < 20 or value > 100):
            raise ValueError()
        if setting == "temperatureTarget":
            if value < 10 or value > 30:
                raise ValueError()

            value *= 10

        await self.modbus_client.write_register(self.AVAILABLE_SETTINGS[setting], value, unit=0x01)

    async def get_device_information(self):
        info = collections.OrderedDict()

        result = await self.modbus_client.read_coils(16, 1, unit=0x01)
        info["fanType"] = result.bits[0]
        result = await self.modbus_client.read_holding_registers(597, 3, unit=0x01)
        info["familyType"] = result.registers[0]
        info["serialNumber"] = result.registers[1]
        info["softwareVersion"] = result.registers[2]

        return info
