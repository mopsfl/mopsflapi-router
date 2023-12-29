import { Request, Response, query } from "express"
import { RequestMethods, _devBuild } from ".."
import { encode, decode } from "messagepack";
import { gunzipSync, gzipSync } from "zlib";

let _lastMonitorRequestTime = 0,
    _lastMonitorResponse = null,
    _lastDataCached = false

class Route {
    _enabled = true
    _routeName = "mopsfl"
    _allowed_methods: RequestMethods = ["get"]
    _required_headers = []
    _allowed_origins = ["mopsfl.github.io"]
    _expose_headers = []

    _callback_url = ""
    _callback = async (req: Request, res: Response, _reqInfo: Object) => {
        try {
            const _query_data: any = req.query.d,
                data: Data = JSON.parse(gunzipSync(Buffer.from(_query_data, "base64")).toString())

            if (data.func === "getServerStatus") {
                let _data = null,
                    _response
                if (_lastMonitorRequestTime === 0 || (Date.now() - _lastMonitorRequestTime > 60000 && _lastMonitorResponse != null)) {
                    await fetch(process.env.uptimeRobot_getMonitors, { method: "POST" })
                        .then(_res => _response = _res)
                        .then((res) => res.json())
                        .then((data) => {
                            _lastMonitorResponse = data;
                            _lastMonitorRequestTime = Date.now();
                            _data = data;
                            _lastDataCached = false
                            console.log("[mopsfl API]: Using new fetched status data.");
                        })
                        .catch((_err) => {
                            console.error(_err);
                            res.status(500).json({ code: 500, message: _err });
                        });
                } else {
                    _data = _lastMonitorResponse;
                    _lastDataCached = true
                    console.log("[mopsfl API]: Using cached status data.");
                }

                if (!_data?.monitors)
                    return { code: 500, message: "Failed to get monitor statuses" }
                let _monitors = [];
                _data.monitors?.forEach((_m) => {
                    if (_m.status != 0) {
                        _monitors.push({
                            name: _m.friendly_name,
                            id: _m.id,
                            down: _m.status === 9 ? true : false,
                        });
                    }
                });
                return [null, { _monitors, meta: { _cached: _lastDataCached } }]
            }
        } catch (error) {
            console.error(error)
            return [null, error]
        }
    }
}


export interface Data {
    func: Functions
}

export type Functions = "getServerStatus" | "test"

module.exports = Route