import logging
from pymodbus.client.asynchronous.serial import AsyncModbusSerialClient
from pymodbus.client.asynchronous import schedulers
from aiohttp import web
from modbus import Modbus
from handler import HttpHandler

logging.basicConfig()
log = logging.getLogger()
log.setLevel(logging.DEBUG)

if __name__ == '__main__':
    loop, client = AsyncModbusSerialClient(schedulers.ASYNC_IO, port='/dev/ttyUSB0', baudrate=19200, method="rtu")
    modbus = Modbus(client.protocol)
    handler = HttpHandler(modbus)
    app = web.Application()
    app.add_routes([
        web.get("/", handler.handle_root),
        web.get("/summary", handler.get_summary),
        web.post("/enableFlag/{flag}", handler.enable_flag),
        web.post("/disableFlag/{flag}", handler.disable_flag),
        web.post("/setSetting/{setting}/{value}", handler.set_setting)
    ])

    try:
        loop.run_until_complete(web._run_app(app))
    finally:
        loop.close()
