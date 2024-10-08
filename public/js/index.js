/*
Zoom Video SDK Sample
*/
let ZoomVideo
let client
let stream
let videoDecode
let videoEncode
let audioDecode
let audioEncode

////////////////////////////////////////////////////////////////////////
//
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById('user_name').value = "User" + Math.floor(Math.random() * 100)
  document.getElementById('join-button').addEventListener('click', joinSession)
  document.getElementById('leave-button').addEventListener('click', leaveSession)
  console.log('DOMContentLoaded')
})

////////////////////////////////////////////////////////////////////////
// TO BEGIN
// CREATE VIDEO SDK CLIENT
// INITIALIZE VIDEO SDK CLEINT
// ADD LISTENER THEN JOIN


async function joinSession() {

  //CREATE VIDEO SDK CLIENT
  ZoomVideo = window.WebVideoSDK.default
  client = ZoomVideo.createClient()

  //INIT VSDK CLIENT
  client.init('en-US', 'CDN')
  //client.init('en-US', location.origin + '/lib')

  //LISTEN FOR CONNECTION STATUS
  client.on('connection-change', (payload) => {
   console.log("Connection Change: ", payload)
   if(payload.state == "Closed"){
     location.reload()
   }
  })

  //MEDIA ENCODER DECODER STATE
  client.on('media-sdk-change', (payload) => {
      console.log("media-sdk-change: " + JSON.stringify(payload))
      if (payload.type === 'video' && payload.result === 'success') {
        if (payload.action === 'encode') {
          // encode for sending video stream
          videoEncode = true
        } else if (payload.action === 'decode') {
          // decode for receiving video stream
          videoDecode = true
        }
      }
      if (payload.type === 'audio' && payload.result === 'success') {
        if (payload.action === 'encode') {
          // encode for sending audio stream (speak)
          audioEncode = true
        } else if (payload.action === 'decode') {
          // decode for receiving audio stream (hear)
          audioDecode = true
        }
      }
      if (payload.type === 'share' && payload.result === 'success') {
        if (payload.action === 'encode') {
          // encode for sending share stream
          shareEncode = true
        } else if (payload.action === 'decode') {
          // decode for receiving share stream
          shareDecode = true
        }
      }
  })

  //LISETN TO FAREND VIDEO STATUS
  client.on('peer-video-state-change', (payload) => {
   console.log("peer-video-state-change: " + JSON.stringify(payload))
   if (payload.action === 'Start') {
     if(videoDecode){
       toggleFarVideo(stream, payload.userId, true)
     }else{
       console.log("wait untill videoDecode gets enabled")
       waitForVideoDecoder(500, payload.userId)
     }

   } else if (payload.action === 'Stop') {
      toggleFarVideo(stream, payload.userId, false)
   }
  })


  // added listener for dimension change
  client.on('video-dimension-change', payload => {
    console.log(payload)
  })

  //GET PARAMETERS AND JOIN VSDK SESSION
  let topic = document.getElementById('session_topic').value
  let userName = document.getElementById('user_name').value
  let password = document.getElementById('session_pwd').value
  let role = document.getElementById('join-role').elements["joinRole"].value

  let token = await getSignature(topic, role, password)
  console.log("topic: "+topic+", token: "+token+", userName: "+userName+", password: "+password);

  client.join(topic, token, userName, password).then(() => {
    stream = client.getMediaStream();
    var n = client.getCurrentUserInfo();
    var m = client.getSessionInfo();
    var sessionId = m.sessionId;
    console.log("getCurrentUserInfo: ", n);
    console.log("get Session ID: ", sessionId);
    console.log("Connection Success");
    toggleNearVideo(); //automatically unmute camera when join
    audioStart(); //automatically start audio
  }).catch((error) => {
    console.log(error)
  })

}

//LEAVE OR END SESSION
function leaveSession() {
  var n = client.getCurrentUserInfo()
  console.log("isHost: " + n.isHost)
  if(n.isHost){
    client.leave(true)
  }else{
    client.leave()
  }
}


//AUDIO START
async function audioStart() {
  try{
    await stream.startAudio()
    console.log(`audioStart`)
  } catch (e){
    console.log(e)
  }
}

let testCanvas = document.getElementById('test');

//LOCAL CAMERA START STOP
async function toggleNearVideo() {
  await stream.startVideo({ hd: true });
  let isVideoOn = await stream.isCapturingVideo()
  console.log("[DEBUG]cameraStartStop isCapturingVideo: " + isVideoOn)  
  var selfId = client.getCurrentUserInfo().userId;
  console.log("[DEBUG]selfId: ", selfId)
  if(isVideoOn){
    await stream.renderVideo(
      testCanvas, 
      selfId, 
      640,
      360, 
      0, 
      0, 
      3)
  }else{
    await stream.stopRenderVideo(canvas, selfId);
    isVideoOn = false
  }
}

//TOGGLE FAR END VIDEO ON CANVAS
const toggleFarVideo = async (stream, userId, isVideoOn) => {
    if (isVideoOn) {
        await stream.renderVideo(
            testCanvas,
            userId,
            640,  // Size Width
            360,  // Size Height
            0,      // Starting point x Vertical
            360,     // Starting point y Horizon
            3       // Video Quality 0:90p, 1:180p, 2:360p, 3:720p
        )
        console.log(`${userId} video rendered.`)
    } else {
        await stream.stopRenderVideo(testCanvas, userId);
        console.log(`${userId} video removed.`)
    }
}


////////////////////////////////////////////////////////////////////////
// WAIT FOR DECODERS

//WAIT FOR VIDEO DECODER
async function waitForVideoDecoder(ms, userid){
let len = 10
 for (let i = 0; i < len; i++) {
  await sleep(ms)
  console.log("waiting for video decoder: " + i)
   if(videoDecode){
    toggleFarVideo(stream, userid, true)
     break
   }
 }
}

//WAOT FOR AUDIO DECODER
async function waitForAudioDecoder(ms){
let len = 10
 for (let i = 0; i < len; i++) {
  await sleep(ms)
  console.log("Trying to wait for audio decoder: " + i)
   if(audioDecode){
     console.log("audioStart ready.")
     audioStart();
     break
   }
 }
}

//SLEEP(WAIT)
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

////////////////////////////////////////////////////////////////////////
//　GET SIGNATURE FOR VSDK FOR WEB
function getSignature(topic, role, password) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest()
        console.log("location.hostname: " + location.hostname)
        xhr.open('POST', './', true)
        xhr.setRequestHeader('content-type', 'application/json')
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                const obj = JSON.parse(xhr.response)
                console.log("getSignature: " + xhr.response)
                resolve(obj.signature)
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                })
            }
        }
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            })
        }
        const body = JSON.parse('{}')
        body["topic"] = topic
        body["role"] = parseInt(role)
        body["password"] = password
	console.log("sending JSON request with this body: "+body)
        xhr.send(JSON.stringify(body))
    })
}
