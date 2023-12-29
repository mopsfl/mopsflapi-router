import { Request, Response } from "express"
import { RequestMethods, _devBuild } from ".."
import { gunzipSync } from "zlib";

class Route {
    _enabled = true
    _routeName = "GoofyLuaUglifier"
    _allowed_methods: RequestMethods = ["post"]
    _required_headers = []
    _allowed_origins = ["mopsfl.github.io"]
    _expose_headers = ["uglifier-session", "uglifier-ms-time", "uglifier-function"]

    _forceProduction = false

    _callback_url = _devBuild && !this._forceProduction ? "http://localhost:6968/api/goofyuglifier/" : process.env.GOOFYLUAUGLIFIER_ENDPOINT
    _callback = async (req: Request, res: Response, _reqInfo: Object) => {
        try {
            const _query_data: any = req.query.d,
                data: Data = JSON.parse(gunzipSync(Buffer.from(_query_data, "base64")).toString()),
                uglifierOptions: any = req.headers["uglifier-options"],
                uglifierSession: any = req.headers["uglifier-session"]

            let _response = await fetch(`${this._callback_url}${data.requested_method}`, {
                method: "POST",
                body: data.code === "[body]" ? req.body : data.code,
                headers: {
                    "Content-Type": "text/plain",
                    "uglifier-options": uglifierOptions,
                    "uglifier-session": uglifierSession,
                    "Request-Info": JSON.stringify(_reqInfo)
                }
            }).catch(console.error)
            if (_response instanceof Response) {
                return [_response.headers, await _response.text()]
            }
        } catch (error) {
            console.error(error)
        }
    }
}

export interface Data {
    requested_method: string,
    code: string
}

module.exports = Route