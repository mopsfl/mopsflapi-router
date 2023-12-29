import express, { Request, Response } from "express"
import config from "dotenv"
import cors from "cors"
import rateLimit from "express-rate-limit"
import { Cache, MemoryCache, caching } from "cache-manager"
import bodyParser from "body-parser"
import fs from "fs"
import { gunzipSync } from "zlib";

config.config()
const app = express(),
    process_path = process.cwd(),
    _devBuild = process.argv.includes("dev") ? true : false

const RequestMethod_Functions = [
    "get",
    "post",
    "options",
    "delete"
]

let cache: MemoryCache

app.use((req, res, next) => {
    res.removeHeader("X-Powered-By")
    next()
})
app.use(bodyParser.text({ type: "*/*", limit: "2MB" }))
app.use(cors())
app.use(rateLimit({ max: 100, validate: { xForwardedForHeader: false } }))
app.get("/", (req, res) => res.sendStatus(200))

app.get("/api/ping", async (req, res) => {
    const resp = await fetch(
        process.env.GOOFYLUAUGLIFIER_ENDPOINT.replace(/\/api.*/gm, "") + `?auth=${process.env.apiauth}&automatic_ping=true`
    );
    return res.status(resp.status || 500).send(await resp.text());
})

// API Router

app.listen(process.env.PORT, async () => {
    console.log(`Server listening on port ${process.env.PORT}*`)
    cache = await caching("memory", { max: 1000, ttl: 20000 })
    fs.readdirSync(`${process_path}/dist/routes`).forEach(route => {
        try {
            const _route: Route = new (require(`${process_path}/dist/routes/${route}`))
            Object.values(RequestMethod_Functions).forEach((_method: RequestMethod) => {
                if (!app[_method]) return
                app[_method](`/api/${_route._routeName}`, async (req: Request, res: Response) => {
                    if (!_route._enabled) return res.status(422).json({ code: 422, error: "Unprocessable Entity", message: "This route is currently disabled." })
                    if (!_route._allowed_methods.includes(_method)) return res.sendStatus(405)
                    if (_route._allowed_origins?.length > 0) {
                        const _origin = (req.headers.origin || req.headers.referer || "").replace(/(http|https)\:\/\/|\/$/g, "")
                        if (!_route._allowed_origins.includes(_origin) && !_devBuild) {
                            console.log({ message: `Request from ${req.socket.remoteAddress} blocked.`, code: 401, origin: `Origin: ${_origin}` });
                            return res.sendStatus(401)
                        }
                    }
                    try {
                        let _block_request = false,
                            _endpoint_query: any = req.query.e || ""
                        if (gunzipSync(Buffer.from(_endpoint_query, "base64")).toString() !== _route._routeName) return res.sendStatus(404)
                        if (!req.query.d) return res.sendStatus(400)
                        if (req.query.t) {
                            if (new Date().getTime() - Number(req.query.t) > 5000) return res.sendStatus(410)
                            if (await cache.get(req.query.t.toString()) === true) return res.sendStatus(410)
                            await cache.set(req.query.t.toString(), true)
                        } else return res.sendStatus(400)
                        if (!_route._allowed_methods.includes(_method)) return res.sendStatus(405)
                        if (_route._required_headers) {
                            _route._required_headers.forEach(_required_header => {
                                if (!Object.keys(req.headers).includes(_required_header.toLocaleLowerCase())) {
                                    _block_request = true
                                    return res.sendStatus(400)
                                }
                            })
                        }
                        if (_block_request) return
                        console.log(`Request from ${req.socket.remoteAddress} >`, _route);
                        const [_callback_headers, _callback_res]: (Headers | any)[] = await _route._callback(req, res, { route: _route, ip: req.socket.remoteAddress })
                        if (_callback_headers instanceof Headers) {
                            _callback_headers?.forEach((value, index) => {
                                if (!_route._expose_headers[index]) res.setHeader(index, value)
                            })
                        }
                        res.status(_callback_res !== undefined ? _callback_res.code ? _callback_res.code : 200 : 500)
                            .setHeader("Access-Control-Expose-Headers", _route._expose_headers)
                            .send(_callback_res)
                    } catch (error) {
                        console.error(error)
                        res.status(500).send(error || error.message)
                    }
                })
            })
            console.log(`> Initialized route [${_route._routeName}] (${_route._allowed_methods})`);
        } catch (error) {
            console.error(error)
        }
    })
})

export interface Route {
    _routeName: string,
    _allowed_methods: RequestMethods,
    _required_headers: Array<string>,
    _allowed_origins: Array<string>,
    _expose_headers: Array<string>,
    _callback: Function,
    _enabled: boolean,
}

export type RequestMethod = "get" | "post" | "options" | "delete"
export type RequestMethods = Array<RequestMethod>
export { _devBuild }


/** example client request:

body = `H4sIAG01b2UA/wVAwQkAIBBaJXzVJm1wC9QjkAxp/Yc8n/s75ibVSubCCEsQX3oUAAAA`
data = "H4sIAENbcGUA%2Fw3HzQmAYAwD0F1ydgJXERE08QeUol97KOLu9fhePLpDzcXpku9G9IjtPNZEh8Wo38NszBFfAX%2F8xQctAAAA"
link = `http://localhost:6969/api/GoofyLuaUglifier/?e=H4sIAH1acGUA%2FwVAsQkAMAg7z6WrBziYEhACQod%2BH0LCP6%2FyDsFeA9iUFSQQAAAA&t=${new Date().getTime()}&d=${data}`
console.log(await fetch(link,{method:"POST",body:body}))

 */