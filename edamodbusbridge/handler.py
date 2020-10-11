import collections
from aiohttp import web


class HttpHandler:

    def __init__(self, modbus):
        self.modbus = modbus

    async def handle_root(self, _):
        return web.Response(text="eda-modbus-bridge")

    async def enable_flag(self, request):
        try:
            await self.modbus.set_flag(request.match_info["flag"], True)
        except KeyError:
            raise web.HTTPBadRequest()

        return web.json_response(await self.modbus.get_flag_summary())

    async def disable_flag(self, request):
        try:
            await self.modbus.set_flag(request.match_info["flag"], False)
        except KeyError:
            raise web.HTTPBadRequest()

        return web.json_response(await self.modbus.get_flag_summary())

    async def get_summary(self, request):
        summary = collections.OrderedDict()
        summary["flags"] = await self.modbus.get_flag_summary()
        summary["readings"] = await self.modbus.get_readings()
        summary["settings"] = await self.modbus.get_settings()
        summary["deviceInformation"] = await self.modbus.get_device_information()

        return web.json_response(summary)

    async def set_setting(self, request):
        try:
            await self.modbus.set_setting(request.match_info["setting"], request.match_info["value"])
        except (KeyError, ValueError):
            raise web.HTTPBadRequest()

        return web.json_response(await self.modbus.get_settings())
