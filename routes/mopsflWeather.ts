import { Request, Response } from "express"
import { RequestMethods, _devBuild } from ".."
import { gunzipSync } from "zlib";

class Route {
    _enabled = true
    _routeName = "mopsflWeather"
    _allowed_methods: RequestMethods = ["get"]
    _required_headers = []
    _allowed_origins = ["mopsfl.github.io"]
    _expose_headers = []

    _forceProduction = _devBuild

    _callback_url = _devBuild && !this._forceProduction ? "http://localhost:6968/api/goofyuglifier/" : process.env.MOPSFLWEATHER_ENDPOINT
    _callback = async (req: Request, res: Response, _reqInfo: Object) => {
        try {
            const _query_data: any = req.query.d,
                data: Data = JSON.parse(gunzipSync(Buffer.from(_query_data, "base64")).toString())

            if (data.func === "currentweather") {
                if (data.location && !(data.lat || data.lon)) {
                    const _response = await fetch(`${this._callback_url}currentweather?location=${data.location}&auth=${process.env.MOPSFLWEATHER_AUTH}`).then(res => res.json())
                    return [_response.headers, _response]
                } else if (data.lat && data.lon) {
                    const _response = await fetch(`${this._callback_url}currentweather?lat=${data.lat}&lon=${data.lon}&auth=${process.env.MOPSFLWEATHER_AUTH}`).then(res => res.json())
                    return [_response.headers, _response]
                } else {
                    return { code: 400 }
                }
            } else if (data.func === "searchcity" && data.name) {
                const _response = await fetch(`${this._callback_url}searchcity?name=${data.name}&auth=${process.env.MOPSFLWEATHER_AUTH}`).then(res => res.json())
                return [_response.headers, _response]
            } else {
                return [null, { code: 400 }]
            }
        } catch (error) {
            console.error(error)
        }
    }
}


export interface Data {
    func?: "currentweather" | "searchcity",
    location?: string,
    lat?: string,
    lon?: string,
    name?: string,
}

module.exports = Route