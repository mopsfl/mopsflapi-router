"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const zlib_1 = require("zlib");
class Route {
    _enabled = true;
    _routeName = "mopsflWeather";
    _allowed_methods = ["get", "post"];
    _required_headers = [];
    _forceProduction = true;
    _callback_url = __1._devBuild && !this._forceProduction ? "http://localhost:6968/api/goofyuglifier/" : process.env.MOPSFLWEATHER_ENDPOINT;
    _callback = async (req, res, _reqInfo) => {
        try {
            const _query_data = req.query.d, data = JSON.parse((0, zlib_1.gunzipSync)(Buffer.from(_query_data, "base64")).toString());
            if (data.func === "currentweather") {
                if (data.location && !(data.lat || data.lon)) {
                    const _response = await fetch(`${this._callback_url}currentweather?location=${data.location}&auth=${process.env.MOPSFLWEATHER_AUTH}`).then(res => res.json());
                    return _response;
                }
                else if (data.lat && data.lon) {
                    const _response = await fetch(`${this._callback_url}currentweather?lat=${data.lat}&lon=${data.lon}&auth=${process.env.MOPSFLWEATHER_AUTH}`).then(res => res.json());
                    return _response;
                }
                else {
                    return { code: 400 };
                }
            }
            else if (data.func === "searchcity" && data.name) {
                const _response = await fetch(`${this._callback_url}searchcity?name=${data.name}&auth=${process.env.MOPSFLWEATHER_AUTH}`).then(res => res.json());
                return _response;
            }
            else {
                return { code: 400 };
            }
        }
        catch (error) {
            console.error(error);
        }
    };
}
module.exports = Route;
