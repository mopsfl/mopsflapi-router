import { Request, Response, query } from "express"
import { RequestMethods, _devBuild } from ".."
import { gunzipSync, gzipSync } from "zlib";

class Route {
    _enabled = true
    _routeName = "GoofyLuaUglifier"
    _allowed_methods: RequestMethods = ["post"]
    _required_headers = []

    _callback_url = _devBuild ? "http://localhost:6968/api/goofyuglifier/" : process.env.GOOFYLUAUGLIFIER_ENDPOINT
    _callback = async (req: Request, res: Response, _reqInfo: Object) => {
        try {
            const _query_data: any = req.query.d,
                data: Data = JSON.parse(gunzipSync(Buffer.from(_query_data, "base64")).toString()),
                uglifierOptions: any = req.headers["uglifier-options"]

            return (await fetch(`${this._callback_url}${data.requested_method}`, {
                method: "POST",
                body: data.code === "[body]" ? req.body : data.code,
                headers: {
                    "Content-Type": "text/plain",
                    "uglifier-options": uglifierOptions,
                    "Request-Info": JSON.stringify(_reqInfo)
                }
            })).text().catch(console.error)
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