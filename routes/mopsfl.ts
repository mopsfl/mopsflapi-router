import { Request, Response, query } from "express"
import { RequestMethods, _devBuild } from ".."
import { encode, decode } from "messagepack";
import { gunzipSync, gzipSync } from "zlib";
class Route {
    _enabled = true
    _routeName = "mopsfl"
    _allowed_methods: RequestMethods = ["get", "post"]
    _required_headers = []

    _callback_url = ""
    _callback = async (req: Request, res: Response, _reqInfo: Object) => {
        try {
            const _query_data: any = req.query.d,
                data: Data = JSON.parse(gunzipSync(Buffer.from(_query_data, "base64")).toString())

            return { data }
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