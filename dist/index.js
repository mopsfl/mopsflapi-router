"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._devBuild = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const cache_manager_1 = require("cache-manager");
const body_parser_1 = __importDefault(require("body-parser"));
const fs_1 = __importDefault(require("fs"));
const zlib_1 = require("zlib");
dotenv_1.default.config();
const app = (0, express_1.default)(), process_path = process.cwd(), _devBuild = process.argv.includes("dev") ? true : false;
exports._devBuild = _devBuild;
const RequestMethod_Functions = [
    "get",
    "post",
    "options",
    "delete"
];
let cache;
app.use((req, res, next) => {
    res.removeHeader("X-Powered-By");
    next();
});
app.use(body_parser_1.default.text({ type: "*/*", limit: "2MB" }));
app.use((0, cors_1.default)());
app.get("/", (req, res) => res.sendStatus(200));
app.get("/api/ping", async (req, res) => {
    const resp = await fetch(process.env.GOOFYLUAUGLIFIER_ENDPOINT.replace(/\/api.*/gm, "") + `?auth=${process.env.apiauth}&automatic_ping=true`);
    return res.status(resp.status || 500).send(await resp.text());
});
// API Router
app.listen(process.env.PORT, async () => {
    console.log(`Server listening on port ${process.env.PORT}*`);
    cache = await (0, cache_manager_1.caching)("memory", { max: 1000, ttl: 20000 });
    fs_1.default.readdirSync(`${process_path}/dist/routes`).forEach(route => {
        try {
            const _route = new (require(`${process_path}/dist/routes/${route}`));
            Object.values(RequestMethod_Functions).forEach((_method) => {
                if (!app[_method])
                    return;
                app[_method](`/api/${_route._routeName}`, async (req, res) => {
                    if (!_route._allowed_methods.includes(_method))
                        return res.sendStatus(405);
                    try {
                        let _block_request = false, _endpoint_query = req.query.e || "";
                        if ((0, zlib_1.gunzipSync)(Buffer.from(_endpoint_query, "base64")).toString() !== _route._routeName)
                            return res.sendStatus(404);
                        if (!req.query.d)
                            return res.sendStatus(400);
                        if (req.query.t) {
                            if (new Date().getTime() - Number(req.query.t) > 5000)
                                return res.sendStatus(410);
                            if (await cache.get(req.query.t.toString()) === true)
                                return res.sendStatus(410);
                            await cache.set(req.query.t.toString(), true);
                        }
                        else
                            return res.sendStatus(400);
                        if (!_route._allowed_methods.includes(_method))
                            return res.sendStatus(405);
                        if (_route._required_headers) {
                            _route._required_headers.forEach(_required_header => {
                                if (!Object.keys(req.headers).includes(_required_header.toLocaleLowerCase())) {
                                    _block_request = true;
                                    return res.sendStatus(400);
                                }
                            });
                        }
                        if (_block_request)
                            return;
                        console.log(`Request from ${req.socket.remoteAddress} >`, _route);
                        const _callback_res = await _route._callback(req, res, { route: _route, ip: req.socket.remoteAddress });
                        res.status(_callback_res !== undefined ? _callback_res.code ? _callback_res.code : 200 : 500).send(_callback_res);
                    }
                    catch (error) {
                        console.error(error);
                        res.status(500).send(error);
                    }
                });
            });
            console.log(`> Initialized route [${_route._routeName}] (${_route._allowed_methods})`);
        }
        catch (error) {
            console.error(error);
        }
    });
});
// Server Status API (uptime robot api)
let _lastMonitorRequestTime = 0, _lastMonitorResponse = null;
app.get("/api/mopsfl/getServerStatus", async (req, res) => {
    try {
        let _data = null;
        if (_lastMonitorRequestTime === 0 ||
            (Date.now() - _lastMonitorRequestTime > 60000 &&
                _lastMonitorResponse != null)) {
            await fetch(process.env.uptimeRobot_getMonitors, { method: "POST" })
                .then((res) => res.json())
                .then((data) => {
                _lastMonitorResponse = data;
                _lastMonitorRequestTime = Date.now();
                _data = data;
                console.log("using fetched status data");
            })
                .catch((_err) => {
                console.error(_err);
                res.status(500).json({ code: 500, message: _err });
            });
        }
        else {
            _data = _lastMonitorResponse;
            console.log("using cached status data");
        }
        if (!_data?.monitors)
            return res
                .status(500)
                .json({ code: 500, message: "Failed to get monitor statuses" });
        let _downMonitors = [];
        _data.monitors?.forEach((_m) => {
            if (_m.status != 0) {
                _downMonitors.push({
                    name: _m.friendly_name,
                    id: _m.id,
                    down: _m.status === 9 ? true : false,
                });
            }
        });
        res.json(_downMonitors);
    }
    catch (error) {
        res.status(500).send(error);
        console.error(error);
    }
});
app.get("/api/mopsfl/v2/getServerStatus", async (req, res) => {
    const _serverUUIDs = JSON.parse(process.env.SERVER_UUIDS), _responses = [];
    _serverUUIDs.forEach(async (uuid, idx) => {
        await fetch(`${process.env.SERVER_RESOURCES_ENDPOINT}${uuid}`, {
            headers: { cookie: process.env.SECRET_SESSION }
        }).then(async (res) => await res.json()).then(data => {
            _responses.push(data);
            if ((idx + 1) === _serverUUIDs.length)
                res.json(_responses);
        }).catch(error => {
            console.error(error);
        });
    });
});
/** example client request:

body = `H4sIAG01b2UA/wVAwQkAIBBaJXzVJm1wC9QjkAxp/Yc8n/s75ibVSubCCEsQX3oUAAAA`
data = "H4sIAENbcGUA%2Fw3HzQmAYAwD0F1ydgJXERE08QeUol97KOLu9fhePLpDzcXpku9G9IjtPNZEh8Wo38NszBFfAX%2F8xQctAAAA"
link = `http://localhost:6969/api/GoofyLuaUglifier/?e=H4sIAH1acGUA%2FwVAsQkAMAg7z6WrBziYEhACQod%2BH0LCP6%2FyDsFeA9iUFSQQAAAA&t=${new Date().getTime()}&d=${data}`
console.log(await fetch(link,{method:"POST",body:body}))

 */ 
