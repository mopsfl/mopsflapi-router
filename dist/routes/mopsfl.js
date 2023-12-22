"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zlib_1 = require("zlib");
class Route {
    _enabled = true;
    _routeName = "mopsfl";
    _allowed_methods = ["get", "post"];
    _required_headers = [];
    _callback_url = "";
    _callback = async (req, res, _reqInfo) => {
        try {
            const _query_data = req.query.d, data = JSON.parse((0, zlib_1.gunzipSync)(Buffer.from(_query_data, "base64")).toString());
            return { data };
        }
        catch (error) {
            console.error(error);
        }
    };
}
module.exports = Route;
