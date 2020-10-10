import collections
import logging
from pymodbus.client.asynchronous.serial import AsyncModbusSerialClient
from pymodbus.client.asynchronous import schedulers
from aiohttp import web

logging.basicConfig()
log = logging.getLogger()
log.setLevel(logging.DEBUG)


async def http_root(request):
    return web.Response(text="eda-modbus-bridge")


async def http_get_summary(request):
    modbus_client = request.app['modbus_client']

    summary = collections.OrderedDict()
    summary["flags"] = collections.OrderedDict()
    summary["readings"] = collections.OrderedDict()
    summary["settings"] = collections.OrderedDict()
    summary["deviceInformation"] = collections.OrderedDict()

    result = await modbus_client.read_coils(1, 10, unit=0x01)
    summary["flags"]["away"] = result.bits[0]
    summary["flags"]["longAway"] = result.bits[1]
    summary["flags"]["overPressure"] = result.bits[2]
    summary["flags"]["maxHeating"] = result.bits[5]
    summary["flags"]["maxCooling"] = result.bits[6]
    summary["flags"]["manualBoost"] = result.bits[9]
    result = await modbus_client.read_coils(12, 1, unit=0x01)
    summary["flags"]["summerNightCooling"] = result.bits[0]
    result = await modbus_client.read_coils(16, 1, unit=0x01)
    summary["flags"]["fanType"] = result.bits[0]

    result = await modbus_client.read_holding_registers(6, 8, unit=0x01)
    summary["readings"]["freshAirTemperature"] = result.registers[0]
    summary["readings"]["supplyAirTemperatureAfterHeatRecovery"] = result.registers[1]
    summary["readings"]["supplyAirTemperature"] = result.registers[2]
    summary["readings"]["wasteAirTemperature"] = result.registers[3]
    summary["readings"]["exhaustAirTemperature"] = result.registers[4]
    summary["readings"]["exhaustAirHumidity"] = result.registers[7]

    result = await modbus_client.read_holding_registers(29, 7, unit=0x01)
    summary["readings"]["heatRecoverySupplySide"] = result.registers[0]
    summary["readings"]["heatRecoveryExhaustSide"] = result.registers[1]
    summary["readings"]["heatRecoveryTemperatureDifferenceSupplySide"] = result.registers[2]
    summary["readings"]["heatRecoveryTemperatureDifferenceExhaustSide"] = result.registers[3]
    summary["readings"]["supplyAirCoilDeltaT"] = result.registers[4]
    summary["readings"]["exhaustFanTemperatureDifference"] = result.registers[5]
    summary["readings"]["mean48HourExhaustHumidity"] = result.registers[6]
    result = await modbus_client.read_holding_registers(47, 3, unit=0x01)
    summary["readings"]["cascadeSp"] = result.registers[0]
    summary["readings"]["cascadeP"] = result.registers[1]
    summary["readings"]["cascadeI"] = result.registers[2]

    result = await modbus_client.read_holding_registers(53, 1, unit=0x01)
    summary["settings"]["ventilationLevel"] = result.registers[0]
    result = await modbus_client.read_holding_registers(135, 1, unit=0x01)
    summary["settings"]["temperatureTarget"] = result.registers[0]

    result = await modbus_client.read_holding_registers(597, 3, unit=0x01)
    summary["deviceInformation"]["familyType"] = result.registers[0]
    summary["deviceInformation"]["serialNumber"] = result.registers[1]
    summary["deviceInformation"]["softwareVersion"] = result.registers[2]

    print(summary)

    return web.json_response(summary)


if __name__ == '__main__':
    loop, client = AsyncModbusSerialClient(schedulers.ASYNC_IO, port='/dev/ttyUSB0', baudrate=19200, method="rtu")
    app = web.Application()
    app['modbus_client'] = client.protocol
    app.add_routes([
        web.get("/", http_root),
        web.get("/summary", http_get_summary)
    ])

    try:
        loop.run_until_complete(web._run_app(app))
    finally:
        loop.close()
