const express = require("express") 
const router = require("express").Router()
const cors = require("cors")
const dgram = require("dgram")
const EventEmitter = require("events")

const app = express()
app.listen(9000, '0.0.0.0')
app.use(cors())
app.use(router)
app.use(express.static('example'))

let pairMap = new Map()
const serverIp = "192.168.125.116"

router.get('/create', async (req, resp) => {
    let {srcPort, srcIp, id} = req.query
    console.log("create", srcPort, srcIp, id)

    let pipe = new Pipe()
    pipe.setSource(srcIp, srcPort)
    let ports = await pipe.start()
    pairMap.set(id, pipe)

    resp.send(JSON.stringify({ 
        localIp: serverIp,
        localPort: ports.srcPort,
        remoteIp: serverIp,
        remotePort: ports.destPort,
    }))
})

router.get('/addDestination', async (req, resp) => {
    let {destPort, destIp, id} = req.query
    console.log("addDestination", destPort, destIp, id)
    let pipe = pairMap.get(id)
    pipe.setDestination(destIp, destPort)
    if (pipe) {
        resp.send(JSON.stringify("ok"))
    }
})

class Pipe {
    constructor() {
        this.src = null
        this.dest = null

        let srcSocket = dgram.createSocket({type: "udp4", reuseAddr: true})
        let destSocket = dgram.createSocket({type: "udp4", reuseAddr: true})

        srcSocket.on("message", (msg) => {
            console.log("src receive msg", msg)
            if (this.dest) {
                setTimeout(() => {
                    destSocket.send(msg, 0, msg.length, this.dest.port, this.dest.ip)                    
                }, 0); // deley 0 second
            }
        })

        destSocket.on("message", (msg) => {
            console.log("dest receive msg", msg)
            if (this.src) {
                srcSocket.send(msg, 0, msg.length, this.src.port, this.src.ip)
            }
        })

        this.srcSocket = srcSocket
        this.destSocket = destSocket
    }

    async start() {
        let event = new EventEmitter()
        this.srcSocket.bind(10000, () => { // TODO: random port
            event.emit("ok")
        })  
        this.destSocket.bind(20000, () => { //TODO: random port
            event.emit("ok")
        })
        
        return new Promise((resolve) => {
            let x = 0
            event.on("ok", () => {
                x ++
                if (x >= 2) {
                    event.removeAllListeners()
                    console.log("src socket address", this.srcSocket.address())
                    console.log("dest socket address", this.destSocket.address())
                    resolve({
                        srcPort: this.srcSocket.address().port,
                        destPort: this.destSocket.address().port
                    })
                }
            })
        })
    }

    setSource(ip, port) {
        this.src = {
            ip: ip,
            port: port
        }
    }

    setDestination(ip, port) {
        this.dest = {
            ip: ip,
            port: port
        }
    }
}