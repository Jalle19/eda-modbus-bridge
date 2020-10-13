import argparse
import logging
from pymodbus.client.asynchronous.serial import AsyncModbusSerialClient
from pymodbus.client.asynchronous import schedulers
from aiohttp import web
from modbus import Modbus
from handler import HttpHandler

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("serialPort", help="The serial port device to use")
    parser.add_argument("--httpListenPort", help="The port for the HTTP server to listen on", type=int, default=8080)
    parser.add_argument("--verbose", help="Use verbose logging", action="store_true")
    args = parser.parse_args()

    logging.basicConfig()
    log = logging.getLogger()
    if args.verbose:
        log.setLevel(logging.DEBUG)
    else:
        log.setLevel(logging.INFO)

    log.info("Listening on port {}, using device {}".format(args.httpListenPort, args.serialPort))

    loop, client = AsyncModbusSerialClient(schedulers.ASYNC_IO, port=args.serialPort, baudrate=19200, method="rtu")
    modbus = Modbus(client.protocol)
    handler = HttpHandler(modbus)
    app = web.Application()
    app.add_routes([
        web.get("/", handler.handle_root),
        web.get("/summary", handler.get_summary),
        web.get("/mode/{flag}", handler.get_mode_status),
        web.post("/mode/{flag}", handler.set_mode_status),
        web.post("/setSetting/{setting}/{value}", handler.set_setting)
    ])

    try:
        loop.run_until_complete(web._run_app(app, port=args.httpListenPort))
    finally:
        loop.close()
