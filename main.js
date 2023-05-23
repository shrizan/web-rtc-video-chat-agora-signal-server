
const APP_ID = "AGORA_APP_ID";

let token = null;
let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;


let localStream;
let remoteStream;
let peerConnection;
const servers = {
  iceServers: [{
    urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
  }]
}

let init = async () => {

  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid, token });

  channel = client.createChannel("main");
  await channel.join();

  channel.on('MemberJoined', handleUserJoined);


  client.on('MessageFromPeer', handleMessageFromPeer);

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  document.getElementById('user-1').srcObject = localStream;
}

let createPeerConnection = async (MemberId) => {
  peerConnection = new RTCPeerConnection();
  remoteStream = new MediaStream();
  document.getElementById('user-2').srcObject = remoteStream;

  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    document.getElementById('user-1').srcObject = localStream;
  }

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
  }

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      client.sendMessageToPeer({ text: JSON.stringify({ type: "candidate", candidate: event.candidate }) }, MemberId);
    }
  }
}

let createOffer = async (MemberId) => {
  await createPeerConnection(MemberId);

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  client.sendMessageToPeer({ text: JSON.stringify({ type: "offer", offer }) }, MemberId);
}

let createAnswer = async (MemberId, offer) => {
  await createPeerConnection(MemberId);
  await peerConnection.setRemoteDescription(offer);
  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  client.sendMessageToPeer({ text: JSON.stringify({ type: "answer", answer }) }, MemberId);
}

async function addAnswer(answer) {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer);
  }
}

async function handleMessageFromPeer(message, memberId) {
  message = JSON.parse(message.text);
  if (message.type === "offer") {
    createAnswer(memberId, message.offer);
  }
  else if (message.type === "answer") {
    addAnswer(message.answer);
  }
  else if (message.type === "candidate") {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.candidate);
    }
  }

}

async function handleUserJoined(MemberId) {
  createOffer(MemberId);
}

init();