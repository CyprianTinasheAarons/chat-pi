'use strict';

import DID_API from './config.json' assert { type: 'json' };
if (DID_API.key == '🤫')
  alert('Please put your api key inside ./api.json and restart..');
const wrtc = require('wrtc');
const RTCPeerConnection = wrtc.RTCPeerConnection;


let peerConnection;
let streamId;
let sessionId;
let sessionClientAnswer;

const talkVideo = document.getElementById('talk-video');
talkVideo.setAttribute('playsinline', '');

const connect  = async () => {
  if (peerConnection && peerConnection.connectionState === 'connected') {
    return;
  }

  stopAllStreams();
  closePC();

  const sessionResponse = await fetch(`${DID_API.url}/talks/streams`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${DID_API.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_url:
        'https://res.cloudinary.com/dqzpz4w3l/image/upload/v1683232752/bushiri-transformed_znyzq1.png',
    }),
  });

  const {
    id: newStreamId,
    offer,
    ice_servers: iceServers,
    session_id: newSessionId,
  } = await sessionResponse.json();
  streamId = newStreamId;
  sessionId = newSessionId;

  try {
    sessionClientAnswer = await createPeerConnection(offer, iceServers);
  } catch (e) {
    console.log('error during streaming setup', e);
    stopAllStreams();
    closePC();
    return;
  }

  const sdpResponse = await fetch(
    `${DID_API.url}/talks/streams/${streamId}/sdp`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answer: sessionClientAnswer,
        session_id: sessionId,
      }),
    },
  );
};

const talk   = async () => {
  // connectionState not supported in firefox
  if (
    peerConnection?.signalingState === 'stable' ||
    peerConnection?.iceConnectionState === 'connected'
  ) {
    const talkResponse = await fetch(
      `${DID_API.url}/talks/streams/${streamId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${DID_API.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: {
            type: 'audio',
            audio_url:
              'https://res.cloudinary.com/dqzpz4w3l/video/upload/v1683234407/small_z9kjpd.mp3',
          },
          driver_url: 'bank://lively/',
          config: {
            stitch: true,
          },
          session_id: sessionId,
        }),
      },
    );
  }
};

const destroy = async () => {
  await fetch(`${DID_API.url}/talks/streams/${streamId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${DID_API.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id: sessionId }),
  });

  stopAllStreams();
  closePC();
};

function onIceGatheringStateChange() {
console.log('onIceGatheringStateChange', peerConnection.iceGatheringState);
}
function onIceCandidate(event) {
  console.log('onIceCandidate', event);
  if (event.candidate) {
    const { candidate, sdpMid, sdpMLineIndex } = event.candidate;

    fetch(`${DID_API.url}/talks/streams/${streamId}/ice`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate,
        sdpMid,
        sdpMLineIndex,
        session_id: sessionId,
      }),
    });
  }
}
function onIceConnectionStateChange() {
  console.log('onIceConnectionStateChange', peerConnection.iceConnectionState);
  if (
    peerConnection.iceConnectionState === 'failed' ||
    peerConnection.iceConnectionState === 'closed'
  ) {
    stopAllStreams();
    closePC();
  }
}
function onConnectionStateChange() {
  // not supported in firefox
  console.log('onConnectionStateChange', peerConnection.connectionState);
}
function onSignalingStateChange() {
  console.log('onSignalingStateChange', peerConnection.signalingState);
}
function onTrack(event) {
  const remoteStream = event.streams[0];
  setVideoElement(remoteStream);
}

async function createPeerConnection(offer, iceServers) {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection({ iceServers });
    peerConnection.addEventListener(
      'icegatheringstatechange',
      onIceGatheringStateChange,
      true,
    );
    peerConnection.addEventListener('icecandidate', onIceCandidate, true);
    peerConnection.addEventListener(
      'iceconnectionstatechange',
      onIceConnectionStateChange,
      true,
    );
    peerConnection.addEventListener(
      'connectionstatechange',
      onConnectionStateChange,
      true,
    );
    peerConnection.addEventListener(
      'signalingstatechange',
      onSignalingStateChange,
      true,
    );
    peerConnection.addEventListener('track', onTrack, true);
  }

  await peerConnection.setRemoteDescription(offer);
  console.log('set remote sdp OK');

  const sessionClientAnswer = await peerConnection.createAnswer();
  console.log('create local sdp OK');

  await peerConnection.setLocalDescription(sessionClientAnswer);
  console.log('set local sdp OK');

  return sessionClientAnswer;
}

function setVideoElement(stream) {
  if (!stream) return;
  talkVideo.srcObject = stream;

  // safari hotfix
  if (talkVideo.paused) {
    talkVideo
      .play()
      .then((_) => {})
      .catch((e) => {});
  }
}

function stopAllStreams() {
  if (talkVideo.srcObject) {
    console.log('stopping video streams');
    talkVideo.srcObject.getTracks().forEach((track) => track.stop());
    talkVideo.srcObject = null;
  }
}

function closePC(pc = peerConnection) {
  if (!pc) return;
  console.log('stopping peer connection');
  pc.close();
  pc.removeEventListener(
    'icegatheringstatechange',
    onIceGatheringStateChange,
    true,
  );
  pc.removeEventListener('icecandidate', onIceCandidate, true);
  pc.removeEventListener(
    'iceconnectionstatechange',
    onIceConnectionStateChange,
    true,
  );
  pc.removeEventListener(
    'connectionstatechange',
    onConnectionStateChange,
    true,
  );
  pc.removeEventListener('signalingstatechange', onSignalingStateChange, true);
  pc.removeEventListener('track', onTrack, true);
  console.log('stopped peer connection');
  if (pc === peerConnection) {
    peerConnection = null;
  }
}

export default async function handler(
  req, res)
{
  const { method } = req;

  switch (method) {
    case 'POST':
      await connect();
      break;
    case 'DELETE':
      await destroy();
      break;
    case 'PUT':
      await talk();
      break;
    default:
      res.setHeader('Allow', ['POST', 'DELETE', 'PUT']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
