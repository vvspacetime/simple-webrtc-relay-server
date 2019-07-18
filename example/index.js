'use strict';

const localVideo = document.getElementById('local');
const remoteVideo = document.getElementById('remote');

let localStream;
let pc1;
let pc2;
let candidate1, candidate2
const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};
let id = random()
const relayServerUrl = "http://192.168.125.140:9000"

async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: {width: 240, height: 180} });
    localVideo.srcObject = stream;
    localStream = stream;

    pc1 = new RTCPeerConnection({ iceCandidatePoolSize: 0 });
    localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));

    const offer = await pc1.createOffer(offerOptions);
    pc1.setLocalDescription(offer)
    candidate1 = await waitCandidate(pc1)

    pc2 = new RTCPeerConnection({ iceCandidatePoolSize: 0 });
    pc2.addEventListener('track', (e) => { remoteVideo.srcObject = e.streams[0] });
    pc2.setRemoteDescription(offer)
    const answer = await pc2.createAnswer()
    pc2.setLocalDescription(answer)
    candidate2 = await waitCandidate(pc2)

    pc1.setRemoteDescription(answer)

    console.log(candidate1, candidate2)

    /**
     * pair.localIp
     * pair.localPort
     * pair.remoteIp
     * pair.remotePort
     */
    const pair = await createPipe(candidate1.address, candidate1.port)
    
    const _candidate2 = new RTCIceCandidate({
        candidate: modifyCandidate(candidate2.candidate, pair.localIp, pair.localPort),
        sdpMid: candidate2.sdpMid,
        sdpMLineIndex: candidate2.sdpMLineIndex
    })

    await adddestination(candidate2.address, candidate2.port)

    pc1.addIceCandidate(_candidate2)

    const _candidate1 = new RTCIceCandidate({
        candidate: modifyCandidate(candidate1.candidate, pair.remoteIp, pair.remotePort),
        sdpMid: candidate1.sdpMid,
        sdpMLineIndex: candidate1.sdpMLineIndex
    })

    pc2.addIceCandidate(_candidate1)
}

async function waitCandidate(pc) {
    return new Promise((resolve) => {
        pc.onicecandidate = (e) => {
            pc.onicecandidate = null
            resolve(e.candidate)
        }
    })
}

async function createPipe(srcIp, srcPort) {
    const url = `${relayServerUrl}/create?srcIp=${srcIp}&srcPort=${srcPort}&id=${id}`
    let resp = await fetch(url)
    return await resp.json()
}

async function adddestination(destIp, destPort) {
    const url = `${relayServerUrl}/adddestination?destIp=${destIp}&destPort=${destPort}&id=${id}`
    let resp = await fetch(url)
    return await resp.json()
}

function modifyCandidate(candidatePlain, targetIp, targetPort) {
    let arr = candidatePlain.split(" ")
    arr[4] = targetIp
    arr[5] = targetPort
    return arr.join(" ")
}

async function sleep(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, milliseconds)
    })
}

function random() {
    return Math.floor(Math.random() * 100000)
}

start()


