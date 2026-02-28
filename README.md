# webrtc-stats-exporter

> WebRTC Stats Exporter is a lightweight utility designed to collect, parse, and simplify WebRTC RTCPeerConnection statistics and publish them to a local collector or an external API.

---

## Installation

```bash
npm i webrtc-stats-exporter
```

---

## Quick Start

```js
import { WebRTCExporter } from 'webrtc-stats-exporter';

const exporter = new WebRTCExporter({
  sessionId:        'call-abc-123',
  sessionName:      'Support Call',
  url:              'https://api.yourapp.com/webrtc/ingest',
  getStatsInterval: 2000,
  batchSize:        20,
  flushInterval:    5000,
  timeout:          10000,
  maxRetries:       3,
  debug:            true,
});

exporter.addPeer({
  peerId:   'peer-alice',
  peerName: 'Alice',
  pc:       peerConnection,   // RTCPeerConnection instance
});

// Local events
exporter.on('stats', (event) => {
  console.log('audio inbound:',  event.data.audio.inbound);
  console.log('video outbound:', event.data.video.outbound);
  console.log('candidate pairs:', event.data.candidatePair);
});

exporter.on('export:success', ({ count }) => console.log(`✓ Sent ${count} events`));
exporter.on('export:error',   ({ error }) => console.error('✗ Export failed:', error));

// When call ends
exporter.removePeer('peer-alice');
await exporter.destroy();
```

---

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `sessionId` | `string` | auto-generated | Unique ID for this session/call |
| `sessionName` | `string` | `'unknown'` | Human-readable session name |
| `url` | `string` | **required** | Backend endpoint URL |
| `headers` | `object` | `{}` | Extra HTTP headers (e.g. `Authorization`) |
| `getStatsInterval` | `number` | `2000` | Poll interval in ms |
| `rawStats` | `boolean` | `false` | Include raw `RTCStatsReport` in events |
| `statsObject` | `boolean` | `false` | Include flat id-keyed object in events |
| `batchSize` | `number` | `20` | Flush when queue reaches this size |
| `flushInterval` | `number` | `5000` | Flush every N ms regardless of queue size |
| `timeout` | `number` | `10000` | Request timeout in ms |
| `maxRetries` | `number` | `3` | Max retry attempts per batch |
| `retryBaseDelay` | `number` | `500` | Initial retry delay in ms |
| `retryMaxDelay` | `number` | `10000` | Max retry delay cap in ms |
| `debug` | `boolean` | `false` | Enable console debug logs |

---

## Methods

### `addPeer({ peerId, peerName, pc })`
Start monitoring a `RTCPeerConnection`.

### `removePeer(peerId)`
Stop monitoring a peer and clean up its listeners.

### `getPeerIds()`
Returns array of currently monitored peer IDs.

### `getTimeline()`
Returns the full event timeline array.

### `flush()`
Immediately flush the batch queue. Returns a Promise.

```js
window.addEventListener('beforeunload', () => exporter.flush());
```

### `destroy()`
Flush, stop all monitors, remove all listeners. Returns a Promise.

---

## Events

| Event | When | Payload |
|---|---|---|
| `stats` | Every poll interval | `{ peerId, peerName, timestamp, data }` |
| `timeline` | Every event | same as above |
| `iceConnectionStateChange` | ICE state changes | `{ peerId, data: { state } }` |
| `connectionStateChange` | Connection state changes | `{ peerId, data: { state } }` |
| `iceGatheringStateChange` | Gathering state changes | `{ peerId, data: { state } }` |
| `signalingStateChange` | Signaling state changes | `{ peerId, data: { state } }` |
| `export:success` | Batch sent successfully | `{ count, sessionId }` |
| `export:error` | Batch failed after retries | `{ error, count, items }` |

### `stats` event data shape

```js
exporter.on('stats', ({ data }) => {
  data.audio.inbound       // RTCInboundRtpStreamStats[] filtered for audio
  data.audio.outbound      // RTCOutboundRtpStreamStats[] filtered for audio
  data.video.inbound       // RTCInboundRtpStreamStats[] filtered for video
  data.video.outbound      // RTCOutboundRtpStreamStats[] filtered for video
  data.remote.inbound      // RTCRemoteInboundRtpStreamStats[]
  data.candidatePair       // RTCIceCandidatePairStats[]
  data.localCandidate      // RTCIceCandidateStats[]
  data.remoteCandidate     // RTCIceCandidateStats[]
  data.transport           // RTCTransportStats[]
  data.codec               // RTCCodecStats[]
  data.dataChannel         // RTCDataChannelStats[]
  data.raw                 // all stats grouped by type
});
```

---

## What your backend receives

Every batch is a `POST` with this JSON body:

<details>
<summary>Click to expand JSON</summary>

```json
{
  "sessionId": "test-1772304502224",
  "sessionName": "Simple Test",
  "exportedAt": "2026-02-28T18:48:27.235Z",
  "count": 8,
  "items": [
    {
      "event": "signalingStateChange",
      "tag": "connection",
      "peerId": "alice",
      "peerName": "Alice",
      "timestamp": "2026-02-28T18:48:23.211Z",
      "data": {
        "state": "have-local-offer"
      }
    },
    {
      "event": "iceGatheringStateChange",
      "tag": "connection",
      "peerId": "alice",
      "peerName": "Alice",
      "timestamp": "2026-02-28T18:48:23.212Z",
      "data": {
        "state": "gathering"
      }
    },
    {
      "event": "iceConnectionStateChange",
      "tag": "connection",
      "peerId": "alice",
      "peerName": "Alice",
      "timestamp": "2026-02-28T18:48:23.239Z",
      "data": {
        "state": "checking"
      }
    },
    {
      "event": "signalingStateChange",
      "tag": "connection",
      "peerId": "alice",
      "peerName": "Alice",
      "timestamp": "2026-02-28T18:48:23.241Z",
      "data": {
        "state": "stable"
      }
    },
    {
      "event": "iceConnectionStateChange",
      "tag": "connection",
      "peerId": "alice",
      "peerName": "Alice",
      "timestamp": "2026-02-28T18:48:23.242Z",
      "data": {
        "state": "connected"
      }
    },
    {
      "event": "connectionStateChange",
      "tag": "connection",
      "peerId": "alice",
      "peerName": "Alice",
      "timestamp": "2026-02-28T18:48:23.242Z",
      "data": {
        "state": "connecting"
      }
    },
    {
      "event": "iceGatheringStateChange",
      "tag": "connection",
      "peerId": "alice",
      "peerName": "Alice",
      "timestamp": "2026-02-28T18:48:23.242Z",
      "data": {
        "state": "complete"
      }
    },
    {
      "event": "connectionStateChange",
      "tag": "connection",
      "peerId": "alice",
      "peerName": "Alice",
      "timestamp": "2026-02-28T18:48:23.244Z",
      "data": {
        "state": "connected"
      }
    }
  ]
}
```

```json
{
  "sessionId": "test-1772304502224",
  "sessionName": "Simple Test",
  "exportedAt": "2026-02-28T18:48:32.263Z",
  "count": 1,
  "items": [
    {
      "event": "stats",
      "tag": "stats",
      "peerId": "alice",
      "peerName": "Alice",
      "timestamp": "2026-02-28T18:48:28.208Z",
      "data": {
        "audio": {
          "inbound": [],
          "outbound": [
            {
              "id": "OT01A450088848",
              "timestamp": 1772304508207.719,
              "type": "outbound-rtp",
              "codecId": "COT01_111_minptime=10;useinbandfec=1",
              "kind": "audio",
              "mediaType": "audio",
              "ssrc": 450088848,
              "transportId": "T01",
              "bytesSent": 16112,
              "packetsSent": 248,
              "active": true,
              "headerBytesSent": 6944,
              "mediaSourceId": "SA1",
              "mid": "0",
              "nackCount": 0,
              "packetsSentWithEct1": 0,
              "remoteId": "RIA450088848",
              "retransmittedBytesSent": 0,
              "retransmittedPacketsSent": 0,
              "targetBitrate": 32000,
              "totalPacketSendDelay": 0
            }
          ]
        },
        "video": {
          "inbound": [],
          "outbound": [
            {
              "id": "OT01V310911517",
              "timestamp": 1772304508207.719,
              "type": "outbound-rtp",
              "codecId": "COT01_96",
              "kind": "video",
              "mediaType": "video",
              "ssrc": 310911517,
              "transportId": "T01",
              "bytesSent": 148188,
              "packetsSent": 157,
              "active": true,
              "encoderImplementation": "libvpx",
              "encodingIndex": 0,
              "firCount": 0,
              "frameHeight": 240,
              "frameWidth": 320,
              "framesEncoded": 46,
              "framesPerSecond": 10,
              "framesSent": 46,
              "headerBytesSent": 5272,
              "hugeFramesSent": 1,
              "keyFramesEncoded": 1,
              "mediaSourceId": "SV2",
              "mid": "1",
              "nackCount": 0,
              "packetsSentWithEct1": 0,
              "pliCount": 0,
              "powerEfficientEncoder": false,
              "qpSum": 294,
              "qualityLimitationDurations": {
                "bandwidth": 4.922,
                "cpu": 0,
                "none": 0.047,
                "other": 0
              },
              "qualityLimitationReason": "bandwidth",
              "qualityLimitationResolutionChanges": 0,
              "remoteId": "RIV310911517",
              "retransmittedBytesSent": 0,
              "retransmittedPacketsSent": 0,
              "rtxSsrc": 2857666661,
              "scalabilityMode": "L1T1",
              "targetBitrate": 600000,
              "totalEncodeTime": 0.088,
              "totalEncodedBytesTarget": 0,
              "totalPacketSendDelay": 0.019643
            }
          ]
        },
        "remote": {
          "inbound": [
            {
              "id": "RIA450088848",
              "timestamp": 1772304505731.189,
              "type": "remote-inbound-rtp",
              "codecId": "COT01_111_minptime=10;useinbandfec=1",
              "kind": "audio",
              "mediaType": "audio",
              "ssrc": 450088848,
              "transportId": "T01",
              "jitter": 0.000187,
              "packetsLost": 0,
              "fractionLost": 0,
              "localId": "OT01A450088848",
              "roundTripTime": 0.001,
              "roundTripTimeMeasurements": 1,
              "totalRoundTripTime": 0.001
            },
            {
              "id": "RIV310911517",
              "timestamp": 1772304507652.477,
              "type": "remote-inbound-rtp",
              "codecId": "COT01_96",
              "kind": "video",
              "mediaType": "video",
              "ssrc": 310911517,
              "transportId": "T01",
              "jitter": 0.000633,
              "packetsLost": 0,
              "fractionLost": 0,
              "localId": "OT01V310911517",
              "roundTripTime": 0.001,
              "roundTripTimeMeasurements": 4,
              "totalRoundTripTime": 0.004
            }
          ],
          "outbound": []
        },
        "candidatePair": [
          {
            "id": "CP70BEs/fi_0ExDz0x8",
            "timestamp": 1772304508207.719,
            "type": "candidate-pair",
            "availableOutgoingBitrate": 1255600,
            "bytesDiscardedOnSend": 0,
            "bytesReceived": 4537,
            "bytesSent": 181656,
            "consentRequestsSent": 4,
            "currentRoundTripTime": 0,
            "lastPacketReceivedTimestamp": 1772304508196,
            "lastPacketSentTimestamp": 1772304508204,
            "localCandidateId": "I70BEs/fi",
            "nominated": true,
            "packetsDiscardedOnSend": 0,
            "packetsReceived": 89,
            "packetsSent": 413,
            "priority": 9114756780654345000,
            "remoteCandidateId": "I0ExDz0x8",
            "requestsReceived": 5,
            "requestsSent": 5,
            "responsesReceived": 5,
            "responsesSent": 5,
            "state": "succeeded",
            "totalRoundTripTime": 0.004,
            "transportId": "T01",
            "writable": true
          },
          {
            "id": "CP70BEs/fi_8tjtCZH0",
            "timestamp": 1772304508207.719,
            "type": "candidate-pair",
            "bytesDiscardedOnSend": 0,
            "bytesReceived": 0,
            "bytesSent": 0,
            "consentRequestsSent": 0,
            "localCandidateId": "I70BEs/fi",
            "nominated": false,
            "packetsDiscardedOnSend": 0,
            "packetsReceived": 0,
            "packetsSent": 0,
            "priority": 9114475305677635000,
            "remoteCandidateId": "I8tjtCZH0",
            "requestsReceived": 0,
            "requestsSent": 0,
            "responsesReceived": 0,
            "responsesSent": 0,
            "state": "waiting",
            "totalRoundTripTime": 0,
            "transportId": "T01",
            "writable": false
          },
          {
            "id": "CP70BEs/fi_vAg2mi4W",
            "timestamp": 1772304508207.719,
            "type": "candidate-pair",
            "bytesDiscardedOnSend": 0,
            "bytesReceived": 0,
            "bytesSent": 0,
            "consentRequestsSent": 0,
            "localCandidateId": "I70BEs/fi",
            "nominated": false,
            "packetsDiscardedOnSend": 0,
            "packetsReceived": 0,
            "packetsSent": 0,
            "priority": 9114756780654476000,
            "remoteCandidateId": "IvAg2mi4W",
            "requestsReceived": 0,
            "requestsSent": 0,
            "responsesReceived": 0,
            "responsesSent": 0,
            "state": "waiting",
            "totalRoundTripTime": 0,
            "transportId": "T01",
            "writable": false
          },
          {
            "id": "CPCI9ZC9o4_0ExDz0x8",
            "timestamp": 1772304508207.719,
            "type": "candidate-pair",
            "bytesDiscardedOnSend": 0,
            "bytesReceived": 0,
            "bytesSent": 0,
            "consentRequestsSent": 0,
            "localCandidateId": "ICI9ZC9o4",
            "nominated": false,
            "packetsDiscardedOnSend": 0,
            "packetsReceived": 0,
            "packetsSent": 0,
            "priority": 9114756780654476000,
            "remoteCandidateId": "I0ExDz0x8",
            "requestsReceived": 0,
            "requestsSent": 4,
            "responsesReceived": 0,
            "responsesSent": 0,
            "state": "in-progress",
            "totalRoundTripTime": 0,
            "transportId": "T01",
            "writable": false
          },
          {
            "id": "CPCI9ZC9o4_8tjtCZH0",
            "timestamp": 1772304508207.719,
            "type": "candidate-pair",
            "bytesDiscardedOnSend": 0,
            "bytesReceived": 0,
            "bytesSent": 0,
            "consentRequestsSent": 0,
            "localCandidateId": "ICI9ZC9o4",
            "nominated": false,
            "packetsDiscardedOnSend": 0,
            "packetsReceived": 0,
            "packetsSent": 0,
            "priority": 9114475305677766000,
            "remoteCandidateId": "I8tjtCZH0",
            "requestsReceived": 0,
            "requestsSent": 4,
            "responsesReceived": 0,
            "responsesSent": 0,
            "state": "in-progress",
            "totalRoundTripTime": 0,
            "transportId": "T01",
            "writable": false
          },
          {
            "id": "CPCI9ZC9o4_vAg2mi4W",
            "timestamp": 1772304508207.719,
            "type": "candidate-pair",
            "bytesDiscardedOnSend": 0,
            "bytesReceived": 0,
            "bytesSent": 0,
            "consentRequestsSent": 3,
            "currentRoundTripTime": 0,
            "localCandidateId": "ICI9ZC9o4",
            "nominated": false,
            "packetsDiscardedOnSend": 0,
            "packetsReceived": 0,
            "packetsSent": 0,
            "priority": 9115038255631187000,
            "remoteCandidateId": "IvAg2mi4W",
            "requestsReceived": 4,
            "requestsSent": 4,
            "responsesReceived": 4,
            "responsesSent": 4,
            "state": "succeeded",
            "totalRoundTripTime": 0.002,
            "transportId": "T01",
            "writable": true
          },
          {
            "id": "CPIZ2Ffhfk_0ExDz0x8",
            "timestamp": 1772304508207.719,
            "type": "candidate-pair",
            "bytesDiscardedOnSend": 0,
            "bytesReceived": 0,
            "bytesSent": 0,
            "consentRequestsSent": 0,
            "localCandidateId": "IIZ2Ffhfk",
            "nominated": false,
            "packetsDiscardedOnSend": 0,
            "packetsReceived": 0,
            "packetsSent": 0,
            "priority": 9114475305677635000,
            "remoteCandidateId": "I0ExDz0x8",
            "requestsReceived": 0,
            "requestsSent": 4,
            "responsesReceived": 0,
            "responsesSent": 0,
            "state": "in-progress",
            "totalRoundTripTime": 0,
            "transportId": "T01",
            "writable": false
          },
          {
            "id": "CPIZ2Ffhfk_8tjtCZH0",
            "timestamp": 1772304508207.719,
            "type": "candidate-pair",
            "bytesDiscardedOnSend": 0,
            "bytesReceived": 0,
            "bytesSent": 0,
            "consentRequestsSent": 3,
            "currentRoundTripTime": 0,
            "localCandidateId": "IIZ2Ffhfk",
            "nominated": false,
            "packetsDiscardedOnSend": 0,
            "packetsReceived": 0,
            "packetsSent": 0,
            "priority": 9114475305677503000,
            "remoteCandidateId": "I8tjtCZH0",
            "requestsReceived": 4,
            "requestsSent": 4,
            "responsesReceived": 4,
            "responsesSent": 4,
            "state": "succeeded",
            "totalRoundTripTime": 0.002,
            "transportId": "T01",
            "writable": true
          },
          {
            "id": "CPIZ2Ffhfk_vAg2mi4W",
            "timestamp": 1772304508207.719,
            "type": "candidate-pair",
            "bytesDiscardedOnSend": 0,
            "bytesReceived": 0,
            "bytesSent": 0,
            "consentRequestsSent": 0,
            "localCandidateId": "IIZ2Ffhfk",
            "nominated": false,
            "packetsDiscardedOnSend": 0,
            "packetsReceived": 0,
            "packetsSent": 0,
            "priority": 9114475305677766000,
            "remoteCandidateId": "IvAg2mi4W",
            "requestsReceived": 0,
            "requestsSent": 0,
            "responsesReceived": 0,
            "responsesSent": 0,
            "state": "waiting",
            "totalRoundTripTime": 0,
            "transportId": "T01",
            "writable": false
          }
        ],
        "localCandidate": [
          {
            "id": "I70BEs/fi",
            "timestamp": 1772304508207.719,
            "type": "local-candidate",
            "address": "172.24.64.1",
            "candidateType": "host",
            "foundation": "3867556668",
            "ip": "172.24.64.1",
            "isRemote": false,
            "networkType": "ethernet",
            "port": 52022,
            "priority": 2122194687,
            "protocol": "udp",
            "transportId": "T01",
            "usernameFragment": "Jmb2"
          },
          {
            "id": "ICI9ZC9o4",
            "timestamp": 1772304508207.719,
            "type": "local-candidate",
            "address": "169.254.83.107",
            "candidateType": "host",
            "foundation": "2880758781",
            "ip": "169.254.83.107",
            "isRemote": false,
            "networkType": "unknown",
            "port": 52021,
            "priority": 2122260223,
            "protocol": "udp",
            "transportId": "T01",
            "usernameFragment": "Jmb2"
          },
          {
            "id": "IIZ2Ffhfk",
            "timestamp": 1772304508207.719,
            "type": "local-candidate",
            "address": "192.168.1.36",
            "candidateType": "host",
            "foundation": "3097113718",
            "ip": "192.168.1.36",
            "isRemote": false,
            "networkType": "wifi",
            "port": 52023,
            "priority": 2122129151,
            "protocol": "udp",
            "transportId": "T01",
            "usernameFragment": "Jmb2"
          }
        ],
        "remoteCandidate": [
          {
            "id": "I0ExDz0x8",
            "timestamp": 1772304508207.719,
            "type": "remote-candidate",
            "address": "172.24.64.1",
            "candidateType": "host",
            "foundation": "3324682216",
            "ip": "172.24.64.1",
            "isRemote": true,
            "port": 52028,
            "priority": 2122194687,
            "protocol": "udp",
            "transportId": "T01",
            "usernameFragment": "4dWq"
          },
          {
            "id": "I8tjtCZH0",
            "timestamp": 1772304508207.719,
            "type": "remote-candidate",
            "address": "192.168.1.36",
            "candidateType": "host",
            "foundation": "1350380393",
            "ip": "192.168.1.36",
            "isRemote": true,
            "port": 52029,
            "priority": 2122129151,
            "protocol": "udp",
            "transportId": "T01",
            "usernameFragment": "4dWq"
          },
          {
            "id": "IvAg2mi4W",
            "timestamp": 1772304508207.719,
            "type": "remote-candidate",
            "address": "169.254.83.107",
            "candidateType": "host",
            "foundation": "704929558",
            "ip": "169.254.83.107",
            "isRemote": true,
            "port": 52027,
            "priority": 2122260223,
            "protocol": "udp",
            "transportId": "T01",
            "usernameFragment": "4dWq"
          }
        ],
        "transport": [
          {
            "id": "T01",
            "timestamp": 1772304508207.719,
            "type": "transport",
            "bytesReceived": 4537,
            "bytesSent": 181656,
            "dtlsCipher": "TLS_AES_128_GCM_SHA256",
            "dtlsRole": "server",
            "dtlsState": "connected",
            "iceLocalUsernameFragment": "Jmb2",
            "iceRole": "controlling",
            "iceState": "connected",
            "localCertificateId": "CF98:F5:BA:3A:49:37:B2:00:1E:60:86:92:E1:80:90:30:7E:01:18:16:67:02:55:35:FD:5F:55:7F:14:F2:CD:5B",
            "packetsReceived": 89,
            "packetsSent": 413,
            "remoteCertificateId": "CF6F:57:07:F0:A8:A1:3C:79:61:5C:C8:EA:6D:EC:9D:0D:34:53:B5:41:EE:84:3F:AB:C8:55:56:DF:CE:53:03:BF",
            "selectedCandidatePairChanges": 1,
            "selectedCandidatePairId": "CP70BEs/fi_0ExDz0x8",
            "srtpCipher": "AES_CM_128_HMAC_SHA1_80",
            "tlsVersion": "FEFC"
          }
        ],
        "codec": [
          {
            "id": "COT01_111_minptime=10;useinbandfec=1",
            "timestamp": 1772304508207.719,
            "type": "codec",
            "channels": 2,
            "clockRate": 48000,
            "mimeType": "audio/opus",
            "payloadType": 111,
            "sdpFmtpLine": "minptime=10;useinbandfec=1",
            "transportId": "T01"
          },
          {
            "id": "COT01_96",
            "timestamp": 1772304508207.719,
            "type": "codec",
            "clockRate": 90000,
            "mimeType": "video/VP8",
            "payloadType": 96,
            "transportId": "T01"
          }
        ],
        "dataChannel": [],
        "mediaSources": [
          {
            "id": "SA1",
            "timestamp": 1772304508207.719,
            "type": "media-source",
            "kind": "audio",
            "trackIdentifier": "02cec5a8-8e24-4be2-af4d-f8bb663751bc",
            "audioLevel": 0.0011291848506118961,
            "echoReturnLoss": -30,
            "echoReturnLossEnhancement": 0.17551203072071075,
            "totalAudioEnergy": 0.0003236929543481816,
            "totalSamplesDuration": 4.999999999999938
          },
          {
            "id": "SV2",
            "timestamp": 1772304508207.719,
            "type": "media-source",
            "kind": "video",
            "trackIdentifier": "b8ca9af1-c030-4796-9dc4-16c8e5ed46fb",
            "frames": 48,
            "framesPerSecond": 10,
            "height": 480,
            "width": 640
          }
        ],
        "peerConnection": [
          {
            "id": "P",
            "timestamp": 1772304508207.719,
            "type": "peer-connection",
            "dataChannelsClosed": 0,
            "dataChannelsOpened": 0
          }
        ],
        "tracks": [],
        "raw": {
          "inbound-rtp": [],
          "outbound-rtp": [
            {
              "id": "OT01A450088848",
              "timestamp": 1772304508207.719,
              "type": "outbound-rtp",
              "codecId": "COT01_111_minptime=10;useinbandfec=1",
              "kind": "audio",
              "mediaType": "audio",
              "ssrc": 450088848,
              "transportId": "T01",
              "bytesSent": 16112,
              "packetsSent": 248,
              "active": true,
              "headerBytesSent": 6944,
              "mediaSourceId": "SA1",
              "mid": "0",
              "nackCount": 0,
              "packetsSentWithEct1": 0,
              "remoteId": "RIA450088848",
              "retransmittedBytesSent": 0,
              "retransmittedPacketsSent": 0,
              "targetBitrate": 32000,
              "totalPacketSendDelay": 0
            },
            {
              "id": "OT01V310911517",
              "timestamp": 1772304508207.719,
              "type": "outbound-rtp",
              "codecId": "COT01_96",
              "kind": "video",
              "mediaType": "video",
              "ssrc": 310911517,
              "transportId": "T01",
              "bytesSent": 148188,
              "packetsSent": 157,
              "active": true,
              "encoderImplementation": "libvpx",
              "encodingIndex": 0,
              "firCount": 0,
              "frameHeight": 240,
              "frameWidth": 320,
              "framesEncoded": 46,
              "framesPerSecond": 10,
              "framesSent": 46,
              "headerBytesSent": 5272,
              "hugeFramesSent": 1,
              "keyFramesEncoded": 1,
              "mediaSourceId": "SV2",
              "mid": "1",
              "nackCount": 0,
              "packetsSentWithEct1": 0,
              "pliCount": 0,
              "powerEfficientEncoder": false,
              "qpSum": 294,
              "qualityLimitationDurations": {
                "bandwidth": 4.922,
                "cpu": 0,
                "none": 0.047,
                "other": 0
              },
              "qualityLimitationReason": "bandwidth",
              "qualityLimitationResolutionChanges": 0,
              "remoteId": "RIV310911517",
              "retransmittedBytesSent": 0,
              "retransmittedPacketsSent": 0,
              "rtxSsrc": 2857666661,
              "scalabilityMode": "L1T1",
              "targetBitrate": 600000,
              "totalEncodeTime": 0.088,
              "totalEncodedBytesTarget": 0,
              "totalPacketSendDelay": 0.019643
            }
          ],
          "remote-inbound-rtp": [
            {
              "id": "RIA450088848",
              "timestamp": 1772304505731.189,
              "type": "remote-inbound-rtp",
              "codecId": "COT01_111_minptime=10;useinbandfec=1",
              "kind": "audio",
              "mediaType": "audio",
              "ssrc": 450088848,
              "transportId": "T01",
              "jitter": 0.000187,
              "packetsLost": 0,
              "fractionLost": 0,
              "localId": "OT01A450088848",
              "roundTripTime": 0.001,
              "roundTripTimeMeasurements": 1,
              "totalRoundTripTime": 0.001
            },
            {
              "id": "RIV310911517",
              "timestamp": 1772304507652.477,
              "type": "remote-inbound-rtp",
              "codecId": "COT01_96",
              "kind": "video",
              "mediaType": "video",
              "ssrc": 310911517,
              "transportId": "T01",
              "jitter": 0.000633,
              "packetsLost": 0,
              "fractionLost": 0,
              "localId": "OT01V310911517",
              "roundTripTime": 0.001,
              "roundTripTimeMeasurements": 4,
              "totalRoundTripTime": 0.004
            }
          ],
          "remote-outbound-rtp": [],
          "media-source": [
            {
              "id": "SA1",
              "timestamp": 1772304508207.719,
              "type": "media-source",
              "kind": "audio",
              "trackIdentifier": "02cec5a8-8e24-4be2-af4d-f8bb663751bc",
              "audioLevel": 0.0011291848506118961,
              "echoReturnLoss": -30,
              "echoReturnLossEnhancement": 0.17551203072071075,
              "totalAudioEnergy": 0.0003236929543481816,
              "totalSamplesDuration": 4.999999999999938
            },
            {
              "id": "SV2",
              "timestamp": 1772304508207.719,
              "type": "media-source",
              "kind": "video",
              "trackIdentifier": "b8ca9af1-c030-4796-9dc4-16c8e5ed46fb",
              "frames": 48,
              "framesPerSecond": 10,
              "height": 480,
              "width": 640
            }
          ],
          "candidate-pair": [
            {
              "id": "CP70BEs/fi_0ExDz0x8",
              "timestamp": 1772304508207.719,
              "type": "candidate-pair",
              "availableOutgoingBitrate": 1255600,
              "bytesDiscardedOnSend": 0,
              "bytesReceived": 4537,
              "bytesSent": 181656,
              "consentRequestsSent": 4,
              "currentRoundTripTime": 0,
              "lastPacketReceivedTimestamp": 1772304508196,
              "lastPacketSentTimestamp": 1772304508204,
              "localCandidateId": "I70BEs/fi",
              "nominated": true,
              "packetsDiscardedOnSend": 0,
              "packetsReceived": 89,
              "packetsSent": 413,
              "priority": 9114756780654345000,
              "remoteCandidateId": "I0ExDz0x8",
              "requestsReceived": 5,
              "requestsSent": 5,
              "responsesReceived": 5,
              "responsesSent": 5,
              "state": "succeeded",
              "totalRoundTripTime": 0.004,
              "transportId": "T01",
              "writable": true
            },
            {
              "id": "CP70BEs/fi_8tjtCZH0",
              "timestamp": 1772304508207.719,
              "type": "candidate-pair",
              "bytesDiscardedOnSend": 0,
              "bytesReceived": 0,
              "bytesSent": 0,
              "consentRequestsSent": 0,
              "localCandidateId": "I70BEs/fi",
              "nominated": false,
              "packetsDiscardedOnSend": 0,
              "packetsReceived": 0,
              "packetsSent": 0,
              "priority": 9114475305677635000,
              "remoteCandidateId": "I8tjtCZH0",
              "requestsReceived": 0,
              "requestsSent": 0,
              "responsesReceived": 0,
              "responsesSent": 0,
              "state": "waiting",
              "totalRoundTripTime": 0,
              "transportId": "T01",
              "writable": false
            },
            {
              "id": "CP70BEs/fi_vAg2mi4W",
              "timestamp": 1772304508207.719,
              "type": "candidate-pair",
              "bytesDiscardedOnSend": 0,
              "bytesReceived": 0,
              "bytesSent": 0,
              "consentRequestsSent": 0,
              "localCandidateId": "I70BEs/fi",
              "nominated": false,
              "packetsDiscardedOnSend": 0,
              "packetsReceived": 0,
              "packetsSent": 0,
              "priority": 9114756780654476000,
              "remoteCandidateId": "IvAg2mi4W",
              "requestsReceived": 0,
              "requestsSent": 0,
              "responsesReceived": 0,
              "responsesSent": 0,
              "state": "waiting",
              "totalRoundTripTime": 0,
              "transportId": "T01",
              "writable": false
            },
            {
              "id": "CPCI9ZC9o4_0ExDz0x8",
              "timestamp": 1772304508207.719,
              "type": "candidate-pair",
              "bytesDiscardedOnSend": 0,
              "bytesReceived": 0,
              "bytesSent": 0,
              "consentRequestsSent": 0,
              "localCandidateId": "ICI9ZC9o4",
              "nominated": false,
              "packetsDiscardedOnSend": 0,
              "packetsReceived": 0,
              "packetsSent": 0,
              "priority": 9114756780654476000,
              "remoteCandidateId": "I0ExDz0x8",
              "requestsReceived": 0,
              "requestsSent": 4,
              "responsesReceived": 0,
              "responsesSent": 0,
              "state": "in-progress",
              "totalRoundTripTime": 0,
              "transportId": "T01",
              "writable": false
            },
            {
              "id": "CPCI9ZC9o4_8tjtCZH0",
              "timestamp": 1772304508207.719,
              "type": "candidate-pair",
              "bytesDiscardedOnSend": 0,
              "bytesReceived": 0,
              "bytesSent": 0,
              "consentRequestsSent": 0,
              "localCandidateId": "ICI9ZC9o4",
              "nominated": false,
              "packetsDiscardedOnSend": 0,
              "packetsReceived": 0,
              "packetsSent": 0,
              "priority": 9114475305677766000,
              "remoteCandidateId": "I8tjtCZH0",
              "requestsReceived": 0,
              "requestsSent": 4,
              "responsesReceived": 0,
              "responsesSent": 0,
              "state": "in-progress",
              "totalRoundTripTime": 0,
              "transportId": "T01",
              "writable": false
            },
            {
              "id": "CPCI9ZC9o4_vAg2mi4W",
              "timestamp": 1772304508207.719,
              "type": "candidate-pair",
              "bytesDiscardedOnSend": 0,
              "bytesReceived": 0,
              "bytesSent": 0,
              "consentRequestsSent": 3,
              "currentRoundTripTime": 0,
              "localCandidateId": "ICI9ZC9o4",
              "nominated": false,
              "packetsDiscardedOnSend": 0,
              "packetsReceived": 0,
              "packetsSent": 0,
              "priority": 9115038255631187000,
              "remoteCandidateId": "IvAg2mi4W",
              "requestsReceived": 4,
              "requestsSent": 4,
              "responsesReceived": 4,
              "responsesSent": 4,
              "state": "succeeded",
              "totalRoundTripTime": 0.002,
              "transportId": "T01",
              "writable": true
            },
            {
              "id": "CPIZ2Ffhfk_0ExDz0x8",
              "timestamp": 1772304508207.719,
              "type": "candidate-pair",
              "bytesDiscardedOnSend": 0,
              "bytesReceived": 0,
              "bytesSent": 0,
              "consentRequestsSent": 0,
              "localCandidateId": "IIZ2Ffhfk",
              "nominated": false,
              "packetsDiscardedOnSend": 0,
              "packetsReceived": 0,
              "packetsSent": 0,
              "priority": 9114475305677635000,
              "remoteCandidateId": "I0ExDz0x8",
              "requestsReceived": 0,
              "requestsSent": 4,
              "responsesReceived": 0,
              "responsesSent": 0,
              "state": "in-progress",
              "totalRoundTripTime": 0,
              "transportId": "T01",
              "writable": false
            },
            {
              "id": "CPIZ2Ffhfk_8tjtCZH0",
              "timestamp": 1772304508207.719,
              "type": "candidate-pair",
              "bytesDiscardedOnSend": 0,
              "bytesReceived": 0,
              "bytesSent": 0,
              "consentRequestsSent": 3,
              "currentRoundTripTime": 0,
              "localCandidateId": "IIZ2Ffhfk",
              "nominated": false,
              "packetsDiscardedOnSend": 0,
              "packetsReceived": 0,
              "packetsSent": 0,
              "priority": 9114475305677503000,
              "remoteCandidateId": "I8tjtCZH0",
              "requestsReceived": 4,
              "requestsSent": 4,
              "responsesReceived": 4,
              "responsesSent": 4,
              "state": "succeeded",
              "totalRoundTripTime": 0.002,
              "transportId": "T01",
              "writable": true
            },
            {
              "id": "CPIZ2Ffhfk_vAg2mi4W",
              "timestamp": 1772304508207.719,
              "type": "candidate-pair",
              "bytesDiscardedOnSend": 0,
              "bytesReceived": 0,
              "bytesSent": 0,
              "consentRequestsSent": 0,
              "localCandidateId": "IIZ2Ffhfk",
              "nominated": false,
              "packetsDiscardedOnSend": 0,
              "packetsReceived": 0,
              "packetsSent": 0,
              "priority": 9114475305677766000,
              "remoteCandidateId": "IvAg2mi4W",
              "requestsReceived": 0,
              "requestsSent": 0,
              "responsesReceived": 0,
              "responsesSent": 0,
              "state": "waiting",
              "totalRoundTripTime": 0,
              "transportId": "T01",
              "writable": false
            }
          ],
          "local-candidate": [
            {
              "id": "I70BEs/fi",
              "timestamp": 1772304508207.719,
              "type": "local-candidate",
              "address": "172.24.64.1",
              "candidateType": "host",
              "foundation": "3867556668",
              "ip": "172.24.64.1",
              "isRemote": false,
              "networkType": "ethernet",
              "port": 52022,
              "priority": 2122194687,
              "protocol": "udp",
              "transportId": "T01",
              "usernameFragment": "Jmb2"
            },
            {
              "id": "ICI9ZC9o4",
              "timestamp": 1772304508207.719,
              "type": "local-candidate",
              "address": "169.254.83.107",
              "candidateType": "host",
              "foundation": "2880758781",
              "ip": "169.254.83.107",
              "isRemote": false,
              "networkType": "unknown",
              "port": 52021,
              "priority": 2122260223,
              "protocol": "udp",
              "transportId": "T01",
              "usernameFragment": "Jmb2"
            },
            {
              "id": "IIZ2Ffhfk",
              "timestamp": 1772304508207.719,
              "type": "local-candidate",
              "address": "192.168.1.36",
              "candidateType": "host",
              "foundation": "3097113718",
              "ip": "192.168.1.36",
              "isRemote": false,
              "networkType": "wifi",
              "port": 52023,
              "priority": 2122129151,
              "protocol": "udp",
              "transportId": "T01",
              "usernameFragment": "Jmb2"
            }
          ],
          "remote-candidate": [
            {
              "id": "I0ExDz0x8",
              "timestamp": 1772304508207.719,
              "type": "remote-candidate",
              "address": "172.24.64.1",
              "candidateType": "host",
              "foundation": "3324682216",
              "ip": "172.24.64.1",
              "isRemote": true,
              "port": 52028,
              "priority": 2122194687,
              "protocol": "udp",
              "transportId": "T01",
              "usernameFragment": "4dWq"
            },
            {
              "id": "I8tjtCZH0",
              "timestamp": 1772304508207.719,
              "type": "remote-candidate",
              "address": "192.168.1.36",
              "candidateType": "host",
              "foundation": "1350380393",
              "ip": "192.168.1.36",
              "isRemote": true,
              "port": 52029,
              "priority": 2122129151,
              "protocol": "udp",
              "transportId": "T01",
              "usernameFragment": "4dWq"
            },
            {
              "id": "IvAg2mi4W",
              "timestamp": 1772304508207.719,
              "type": "remote-candidate",
              "address": "169.254.83.107",
              "candidateType": "host",
              "foundation": "704929558",
              "ip": "169.254.83.107",
              "isRemote": true,
              "port": 52027,
              "priority": 2122260223,
              "protocol": "udp",
              "transportId": "T01",
              "usernameFragment": "4dWq"
            }
          ],
          "transport": [
            {
              "id": "T01",
              "timestamp": 1772304508207.719,
              "type": "transport",
              "bytesReceived": 4537,
              "bytesSent": 181656,
              "dtlsCipher": "TLS_AES_128_GCM_SHA256",
              "dtlsRole": "server",
              "dtlsState": "connected",
              "iceLocalUsernameFragment": "Jmb2",
              "iceRole": "controlling",
              "iceState": "connected",
              "localCertificateId": "CF98:F5:BA:3A:49:37:B2:00:1E:60:86:92:E1:80:90:30:7E:01:18:16:67:02:55:35:FD:5F:55:7F:14:F2:CD:5B",
              "packetsReceived": 89,
              "packetsSent": 413,
              "remoteCertificateId": "CF6F:57:07:F0:A8:A1:3C:79:61:5C:C8:EA:6D:EC:9D:0D:34:53:B5:41:EE:84:3F:AB:C8:55:56:DF:CE:53:03:BF",
              "selectedCandidatePairChanges": 1,
              "selectedCandidatePairId": "CP70BEs/fi_0ExDz0x8",
              "srtpCipher": "AES_CM_128_HMAC_SHA1_80",
              "tlsVersion": "FEFC"
            }
          ],
          "codec": [
            {
              "id": "COT01_111_minptime=10;useinbandfec=1",
              "timestamp": 1772304508207.719,
              "type": "codec",
              "channels": 2,
              "clockRate": 48000,
              "mimeType": "audio/opus",
              "payloadType": 111,
              "sdpFmtpLine": "minptime=10;useinbandfec=1",
              "transportId": "T01"
            },
            {
              "id": "COT01_96",
              "timestamp": 1772304508207.719,
              "type": "codec",
              "clockRate": 90000,
              "mimeType": "video/VP8",
              "payloadType": 96,
              "transportId": "T01"
            }
          ],
          "data-channel": [],
          "peer-connection": [
            {
              "id": "P",
              "timestamp": 1772304508207.719,
              "type": "peer-connection",
              "dataChannelsClosed": 0,
              "dataChannelsOpened": 0
            }
          ],
          "stream": [],
          "track": [],
          "media-playout": [
            {
              "id": "AP",
              "timestamp": 1772304508207.719,
              "type": "media-playout",
              "kind": "audio",
              "synthesizedSamplesDuration": 0,
              "synthesizedSamplesEvents": 0,
              "totalPlayoutDelay": 11697.67488,
              "totalSamplesCount": 240000,
              "totalSamplesDuration": 5
            }
          ],
          "certificate": [
            {
              "id": "CF6F:57:07:F0:A8:A1:3C:79:61:5C:C8:EA:6D:EC:9D:0D:34:53:B5:41:EE:84:3F:AB:C8:55:56:DF:CE:53:03:BF",
              "timestamp": 1772304508207.719,
              "type": "certificate",
              "base64Certificate": "MIIBFTCBvaADAgECAgkA+IS/mUj6zVkwCgYIKoZIzj0EAwIwETEPMA0GA1UEAwwGV2ViUlRDMB4XDTI2MDIyNzE4NDgyM1oXDTI2MDMzMDE4NDgyM1owETEPMA0GA1UEAwwGV2ViUlRDMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEFSquu2c2kT5/tUoCspUllGOg+zDj2pvQrp98rSn+BCNDePqTlAVfm6s+C5JRj2OGYrlJf4XhCCuZgHpw3U+ugDAKBggqhkjOPQQDAgNHADBEAiB0/oieLH9UszRbD993wyO5dcnuOEOif351//wrDQ2H8gIgQgktDqVzqkEGI5ikkqLNu8AIYPU/I+v+rpOMt5OyKXA=",
              "fingerprint": "6F:57:07:F0:A8:A1:3C:79:61:5C:C8:EA:6D:EC:9D:0D:34:53:B5:41:EE:84:3F:AB:C8:55:56:DF:CE:53:03:BF",
              "fingerprintAlgorithm": "sha-256"
            },
            {
              "id": "CF98:F5:BA:3A:49:37:B2:00:1E:60:86:92:E1:80:90:30:7E:01:18:16:67:02:55:35:FD:5F:55:7F:14:F2:CD:5B",
              "timestamp": 1772304508207.719,
              "type": "certificate",
              "base64Certificate": "MIIBFjCBvKADAgECAggOdZuGnkMFPzAKBggqhkjOPQQDAjARMQ8wDQYDVQQDDAZXZWJSVEMwHhcNMjYwMjI3MTg0ODIzWhcNMjYwMzMwMTg0ODIzWjARMQ8wDQYDVQQDDAZXZWJSVEMwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQg29Q0Xw1Z9AsTZPrgoLEur5Qhug64NqAii9iEgcNYMaPLdKYSfvfI3U4TpFRtVG86N8fBJZnmLtmfQfJSDKtZMAoGCCqGSM49BAMCA0kAMEYCIQD1LjEtk/RT4E7LSvr9ogxuBqIucfb6xFY0Q4qcbpatYwIhALKock23KU01FETf6RnZ73JLnPArpU5kBYZWA3lbjmf/",
              "fingerprint": "98:F5:BA:3A:49:37:B2:00:1E:60:86:92:E1:80:90:30:7E:01:18:16:67:02:55:35:FD:5F:55:7F:14:F2:CD:5B",
              "fingerprintAlgorithm": "sha-256"
            }
          ]
        }
      }
    }
  ]
}
```

</details>

---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

