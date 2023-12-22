"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const zlib_1 = require("zlib");
class Route {
    _enabled = true;
    _routeName = "GoofyLuaUglifier";
    _allowed_methods = ["post"];
    _required_headers = [];
    _callback_url = __1._devBuild ? "http://localhost:6968/api/goofyuglifier/" : process.env.GOOFYLUAUGLIFIER_ENDPOINT;
    _callback = async (req, res, _reqInfo) => {
        try {
            const _query_data = req.query.d, data = JSON.parse((0, zlib_1.gunzipSync)(Buffer.from(_query_data, "base64")).toString()), uglifierOptions = req.headers["uglifier-options"];
            return (await fetch(`${this._callback_url}${data.requested_method}`, {
                method: "POST",
                body: data.code === "[body]" ? req.body : data.code,
                headers: {
                    "Content-Type": "text/plain",
                    "uglifier-options": uglifierOptions,
                    "Request-Info": JSON.stringify(_reqInfo)
                }
            })).text().catch(console.error);
        }
        catch (error) {
            console.error(error);
        }
    };
}
module.exports = Route;
