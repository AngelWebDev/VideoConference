// ToDos:
// - If you are in a call, do not accept new calls. Use the currentlyInACall flag. Send the remote user a busy signal. Add a socket handle for "remote is busy".
// - If a user clicks Join conference, the video of all remote is captured --- no ringing, no Modal, no nothing. If possible, capture local media only if the modal is open.
// - Make it possible to change between users and not have to refresh.
// - Figure out conference calling and groups:
//   User clicks the create new group button -> popup comes up to select users (from the friends database (even offline ones)) who are going to be in the new group ->
//   user clicks ok -> a list of userIds is created and stored in in the chat database (note that it is not a list of PcPackages because some of the users won't be online. When a call to the group is about to be
//   be made or something, the pcPackage correspinding to the online users is fetched from the pcPackageArray). For now, because we don't have a database, don't worry about the storage part;
//   just keep the List in some local variable in a list of groups. Each group will have a unique Id or name. Set the currentlychattingwith variable to the list of usernames of the group, and set
//   the type to "group" (yes, give it a type; {name: name, userList: [userList]}). Also, make the room available to the users who have been added to the group.
//   Good. Now, when you call currentlyChattingWith, the pcPackage will be fetched from the usernames in the userslist; then if the pcPackage is not null the user is going to be called.
//   After you add this functionality remove the persistent conference room.
//   Look, time is tight so don't waste it on on the create button and the popup right now. Keep the conference room. Treat it like a group. Users automatically get added to it and leave it as they
//   sign in and sign out. Just fix it.

// This file will be somewhere on the server where an (authenticated) client can access them.

// 'use strict';

var localVideo = document.getElementById("localVideo");
var localVideoConference = document.getElementById("myVideo");
var videoCallButton = document.getElementById("videoCallButton");
var voiceCallButton = document.getElementById("voiceCallButton");
var pickUpButton = document.getElementById("pickUpCallImageButton");
var declineCallButton = document.getElementById("declineCallImageButton");
var endCallButton = document.getElementById("endCallImageButton");
var videoConferencePage = document.getElementById("videoConferencePage");
var addParticipantToRoom = document.getElementById("addParticipantToRoom");
var addParticipantBtn = document.getElementById("addParticipantBtn");
var removeParticipantBtn = document.getElementById("removeParticipantBtn");
var removeParticipantFromRoom = document.getElementById(
  "removeParticipantFromRoom"
);
var removeParticipantCancelBtn = document.getElementById(
  "removeParticipantCancelBtn"
);
var createVideoBroadcastingBtn = document.getElementById(
  "createVideoBroadcastingButton"
);
var createVideoConferenceButton = document.getElementById(
  "createVideoConferenceButton"
);
var addParticipantCancelBtn = document.getElementById(
  "addParticipantCancelBtn"
);
// var createGroupButton = document.getElementById("createGroupButton");
videoCallButton.disabled = true;
voiceCallButton.disabled = true;
var localStream; // check if local stream is not null before starting a call.
var pcPackageArray = []; //Objects in this array will be of the form {pc: pc, localUser: localUser, remoteUser: remoteUser, remoteVideo: remoteVideo, isRunning: isRunning, isOfferingVideo: isOfferingVideo, isOfferingAudip: isOfferingAudio}   // type is either user or group.
// this list will be updated everytime the server announces that a new user is available to be called, and everytime the server announces that user is not available anymore.
var localUsername; // local user's username.
var submitButton = document.getElementById("submitButton");
var createGroupButton = document.getElementById("createGroupButton");
var createGroupModal = document.getElementById("createGroupModal");
var createButton = document.getElementById("createButton");
var createGroupModalCancelButton = document.getElementById(
  "createGroupModalCancelButton"
);
var currentlyChattingWith; // this will be the name or id of the user or group you are chatting with (go with name until you have the database).
var currentlyInACall = false; // set that true when the Modal opens and set it false when the modal closes.
var currentlyInACallWith; // username or group id with whom the local user is in a call goes here.   // uncomment this.
var phoneRingTone;
var peerConnections = {};
var localStreamConference; //local stream for video confernece
var room;
// var conferenceRoomGroup = [];    // this is fetched if the currentlyChattingWith is "conferenceRoomHeader". // this is for now only for the demo. Later, groups will be fetched from the database.   // uncomment this. // Actually there is no need for that at the moment.
// update this as users sign in or leave. If you click on the conference room tab, update currentlyChattingWith.

// var socket = io.connect('https://localhost:8080', {secure: true, upgrade: false, transports: ['websocket']});    // this address is later going to be the address of the server that hosts the website.
var socket = io.connect("http://localhost:8080");

socket.on("message", function(message) {
  console.log("The server sent the message: " + message);
});

socket.on("joinedThisRoom", function(groupName, groupType) {
  // You are joined this room
  console.log("I was invited this room:" + groupName);
  console.log(groupType);
  document.getElementById("roomsOfme").innerHTML += //add room name to conference rooms list
    "<a href='#' id='" +
    groupName +
    "RoomHeaderinFriendsBar' class='conferenceRoomHeader' groupType= '" +
    groupType +
    "'>" +
    groupName +
    "</>";
});

socket.on("availableUsers", function(onlineUsers) {
  // get online users
  // switch (groupType) {
  //   case "videoBroadcasting":
  //     document.getElementById("groupType").textContent = "Video Broadcasting";
  //     document.getElementById("maxNumOfGroup").textContent = "30";
  //     break;

  //   case "videoConference":
  //     document.getElementById("groupType").textContent = "Video Conference";
  //     document.getElementById("maxNumOfGroup").textContent = "9";
  //   default:
  //     break;
  // }
  for (let i = 0; i < onlineUsers.length; i++) {
    if (onlineUsers[i])
      document.getElementById("availableUsers").innerHTML += // add users list to create group modal so that users can select someones among them
        "<input type='checkbox' name='" +
        onlineUsers[i].id +
        "' id='" +
        onlineUsers[i].id +
        "'><label for='" +
        onlineUsers[i].id +
        "'>" +
        onlineUsers[i].username +
        "</label>";
  }
});

socket.on("usernameAleadyExist", function() {
  // form validation(username already exist)
  alert("Other user is using your username already!!!");
  document.getElementById("username").value = "";
  submitButton.disabled = false;
  createGroupButton.disabled = true;
});

var pcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" } // replace this by our own stun server.
    // {'urls': 'turn:136.144.226.129:3478'}
    // 'urls': 'stun:stun.133300.ru:3478'
  ]
};
var videoConferenceConst = { audio: true, video: true };

submitButton.addEventListener("click", function() {
  // just set the local user name
  localUsername = document.getElementById("username").value;
  if (!localUsername) alert("Please input username");
  else {
    socket.emit("username", localUsername);
    submitButton.disabled = true;
    // createGroupButton.disabled = false;
    // createVideoBroadcastingBtn.disabled = false;
    createVideoConferenceButton.disabled = false;
  }
});

// createGroupButton.addEventListener("click", function() {
//   createGroupModal.style.display = "block"; // Open create group modal
//   socket.emit("getAvailableUsers", "normalGroup"); // get online users
// });

createButton.addEventListener("click", function() {
  // create group with selected users
  var groupName = document.getElementById("groupName").value; // group name can't be empty
  var groupType = document.getElementById("groupType").value;

  if (!groupName) {
    alert("Please input group name");
  } else {
    var groupData = {
      selectedUsers: [],
      groupName: groupName
    };
    var checkboxList = document.getElementById("availableUsers").childNodes; // get selected users list
    for (let i = 0; i < checkboxList.length; i++) {
      if (checkboxList[i].type == "checkbox" && checkboxList[i].checked)
        groupData.selectedUsers.push(checkboxList[i].name);
    }
    socket.emit("createGroup", groupData, groupType); // create group with selected users
    document.getElementById("availableUsers").innerHTML = ""; // initialize users list on creating group modal
    createGroupModal.style.display = "none"; // modal hide
  }
});

createGroupModalCancelButton.addEventListener("click", function() {
  // hide creating group modal
  document.getElementById("availableUsers").innerHTML = ""; // initialize users list on creating group modal
  createGroupModal.style.display = "none";
});

// createVideoBroadcastingBtn.addEventListener("click", function() {
//   createGroupModal.style.display = "block"; // Open create group modal
//   socket.emit("getAvailableUsers", "videoBroadcasting"); // get online users
// });

createVideoConferenceButton.addEventListener("click", function() {
  createGroupModal.style.display = "block"; // Open create group modal
  socket.emit("getAvailableUsers", "videoConference");
});

document.addEventListener("click", function(e) {
  if (
    e.target &&
    e.target.type == "checkbox" &&
    e.target.parentElement.id == "availableUsers"
  ) {
    // to check checked user for counting number of selected users,
    var numOfSelectedUsers = 0;
    var maxNumOfGroup;
    groupType = document.getElementById("groupType").value;

    switch (groupType) {
      case "videoConference":
        maxNumOfGroup = 9;
        break;
      case "voiceConference":
        maxNumOfGroup = 25;
      default:
        break;
    }
    //This is dynamically added checkbox so can't use event.addeventListner
    var checkboxList = document.getElementById("availableUsers").childNodes; // get selected users list
    for (let i = 0; i < checkboxList.length; i++) {
      if (checkboxList[i].type == "checkbox" && checkboxList[i].checked) {
        numOfSelectedUsers++;

        if (numOfSelectedUsers == maxNumOfGroup - 1) {
          //check maximum number
          alert("maximum number is " + maxNumOfGroup);
        }
      }
    }
  } else if (
    // room onclick event listener
    e.target.getAttribute("groupType") &&
    e.target.classList.contains("conferenceRoomHeader")
  ) {
    let groupType = e.target.getAttribute("groupType");
    let groupName = e.target.textContent;
    //add join this conference button
    socket.emit("getRoomLeader", groupName, groupType);
    document.getElementById("videoPaneButtonGroup").innerHTML +=
      "<button id='" +
      groupName +
      "' groupType='" +
      groupType +
      "'>Join this Conference</button>";
    e.target.style.background = "orange"; // have to remove background of other rooms
    if (document.getElementById("videoPane").style.display === "none") {
      document.getElementById("videoPane").style.display = "block";
      var theTempUsernameBox = document.getElementById("theTempUsernameBox");
      theTempUsernameBox.parentNode.removeChild(theTempUsernameBox);
    }
  } else if (
    // join video conference event listener
    e.target.getAttribute("groupType") &&
    e.target.tagName == "BUTTON"
  ) {
    let groupType = e.target.getAttribute("groupType");
    room = e.target.id;
    // videoConferencePage.style.display = "block";
    //get local stream
    // navigator.mediaDevices
    //   .getUserMedia(videoConferenceConst)
    //   .then(function(stream) {
    //     localStreamConference = stream;
    //     localVideoConference.srcObject = stream;
    //     socket.emit("join live conference", groupName, groupType);
    //     // socket.emit("get user list", groupName, groupType);
    //   })
    //   .catch(function(err) {
    //     console.log(err);
    // });

    joinConference(room);
  }
});

addParticipantBtn.addEventListener("click", function() {
  let groupName = document
    .getElementById("leaderRole")
    .getAttribute("roomname");
  socket.emit("add participant", groupName);
  document.getElementById("addParticipant").style.display = "block";
});

addParticipantToRoom.addEventListener("click", function() {
  var newUserList = [];
  var roomname = document.getElementById("leaderRole").getAttribute("roomname");
  var groupType = document
    .getElementById("leaderRole")
    .getAttribute("grouptype");
  var checkboxList = document.getElementById("addUsersDiv").childNodes; // get selected users list
  for (let i = 0; i < checkboxList.length; i++) {
    if (checkboxList[i].type == "checkbox" && checkboxList[i].checked)
      newUserList.push(checkboxList[i].id);
  }
  socket.emit("new user added in this group", newUserList, roomname, groupType);
  document.getElementById("addParticipant").style.display = "none";
  document.getElementById("addUsersDiv").innerHTML = "";
});

addParticipantCancelBtn.addEventListener("click", function() {
  document.getElementById("addUsersDiv").innerHTML = "";
  document.getElementById("addParticipant").style.display = "none";
});

removeParticipantBtn.addEventListener("click", function() {
  let groupName = document
    .getElementById("leaderRole")
    .getAttribute("roomname");
  socket.emit("remove participant", groupName);
  document.getElementById("removeParticipant").style.display = "block";
});

removeParticipantFromRoom.addEventListener("click", function() {
  var removeUserList = [];
  var roomname = document.getElementById("leaderRole").getAttribute("roomname");
  var groupType = document
    .getElementById("leaderRole")
    .getAttribute("grouptype");
  var checkboxList = document.getElementById("removeUsersDiv").childNodes; // get selected users list
  for (let i = 0; i < checkboxList.length; i++) {
    if (checkboxList[i].type == "checkbox" && checkboxList[i].checked)
      removeUserList.push(checkboxList[i].id);
  }
  socket.emit("removed users", removeUserList, roomname, groupType);
  document.getElementById("removeParticipant").style.display = "none";
  document.getElementById("removeUsersDiv").innerHTML = "";
});

removeParticipantCancelBtn.addEventListener("click", function() {
  document.getElementById("removeUsersDiv").innerHTML = "";
  document.getElementById("removeParticipant").style.display = "none";
});

socket.on("users can be added", function(userlist) {
  console.log(userlist);
  document.getElementById("addParticipant").style.display = "block";
  userlist.map(user => {
    document.getElementById("addUsersDiv").innerHTML +=
      "<input type='checkbox' id=" +
      user +
      "><label for=" +
      user +
      ">" +
      user +
      "</label>";
  });
});

socket.on("users that can be removed", function(userlist) {
  console.log(userlist);
  document.getElementById("removeParticipant").style.display = "block";
  userlist.map(user => {
    document.getElementById("removeUsersDiv").innerHTML +=
      "<input type='checkbox' id=" +
      user +
      "><label for=" +
      user +
      ">" +
      user +
      "</label>";
  });
});

socket.on("you are removed from this room", function(roomname) {
  var roomList = document.getElementById("roomsOfme").childNodes;
  for (let i = 0; i < roomList.length; i++) {
    if (roomList[i].textContent == roomname)
      roomList[i].parentNode.removeChild(roomList[i]);
  }
});

socket.on("you are leader of this room", function(groupName, groupType) {
  document.getElementById("leaderRole").style.display = "block";
  document.getElementById("leaderRole").setAttribute("roomname", groupName);
  document.getElementById("leaderRole").setAttribute("grouptype", groupType);
});

socket.on("joined to live group", function(myId, userId) {
  const peerConnectionFromUser = new RTCPeerConnection(pcConfig);
  peerConnections[userId] = {};
  peerConnections[userId][myId] = peerConnectionFromUser;
  console.log(peerConnections);
});

socket.on("new user", function(userId, myId) {
  console.log(userId + ":" + myId);

  const peerConnection = new RTCPeerConnection(pcConfig);
  peerConnections[myId] = {};
  peerConnections[myId][userId] = peerConnection;

  console.log(peerConnections[myId][userId]);

  let stream = localVideoConference.srcObject;
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", userId, event.candidate);
    }
  };

  peerConnection
    .createOffer()
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("offer", userId, peerConnection.localDescription);
    });
});

socket.on("answer", function(userId, myId, descriptiton) {
  peerConnections[userId][myId].setRemoteDescription(descriptiton);
});

socket.on("I am candidate", function(userId, myId, candidate) {
  peerConnections[userId][myId].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("offer", function(myId, userId, descriptiton) {
  console.log(descriptiton);

  // var peerConnection = new RTCPeerConnection(pcConfig);
  // peerConnections[myId][userId] = peerConnection;
  peerConnections[myId][userId]
    .setRemoteDescription(descriptiton)
    .then(() => peerConnections[myId][userId].createAnswer())
    .then(sdp => peerConnections[myId][userId].setLocalDescription(sdp))
    .then(() => {
      socket.emit(
        "answer",
        myId,
        peerConnections[myId][userId].localDescription
      );
    });

  peerConnections[myId][userId].ontrack = event => {
    videoConferencePage.innerHTML +=
      "<video id='" +
      myId +
      "_video' autoplay playsinline></video><p>" +
      myId +
      "</p>";
    document.getElementById(myId + "_video").srcObject = event.streams[0];
  };

  peerConnections[myId][userId].onicecandidate = event => {
    if (event.candidate) {
      socket.emit("I am a candidate", myId, event.candidate);
    }
  };
});

socket.on("you are candidate", function(myId, userId, candidate) {
  console.log(myId, userId);
  console.log(peerConnections);
  console.log(candidate);
  peerConnections[myId][userId]
    .addIceCandidate(new RTCIceCandidate(candidate))
    .catch(e => console.log(e));
});

function captureLocalMediaAndCallUser(
  pcPackage,
  audioBool,
  videoBool,
  initiatorBool
) {
  // move this to be inside openModal. Check first that openModal("outgoing call") is called only inside CallVideo or something like that.
  console.log("Getting user media (video) ...");
  navigator.mediaDevices
    .getUserMedia({
      audio: audioBool,
      video: videoBool
    })
    .then(function(stream) {
      console.log("got stream");
      gotStream(stream);
      pcPackage.pc.addStream(stream);
      console.log("stream added to pc.");
      if (initiatorBool) {
        createPeerConnectionAndInitiateCall(pcPackage);
      } else {
        answerCall(pcPackage);
      }
    })
    .catch(function(e) {
      alert("getUserMedia() error: " + e.name);
    });
}

function gotStream(stream) {
  localVideo.srcObject = stream;
  localStream = stream; // we store it to be able to manipluate it later (mute it and so on).
}

/////////////////////   WebRTC stuff.

function createPeerConnectionAndInitiateCall(pcPackage) {
  initiateCall(pcPackage);
}

function hangUp(pcPackage) {
  if (pcPackage.pc != null) {
    pcPackage.pc = new RTCPeerConnection(pcConfig);
    setUpWebRTCPCHandlers(pcPackage); // re-set up the handlers.
    if (pcPackage.remoteVideo != null) {
      // change this to a check on isRunning instead.
      pcPackage.remoteVideo.srcObject = null;
      pcPackage.remoteVideo.remove(); // removes the remote video tag from the document body.
      pcPackage.remoteVideo = null;
      socket.emit("callCoordinationMessage", {
        message: "hanging up",
        fromUsername: localUsername,
        toUsername: pcPackage.remoteUser
      }); // this is not inside this condition or a similar one it will keep firing forever. hangup -> handle hang up -> hang up ...
    }
    pcPackage.isOfferingAudio = null;
    pcPackage.isOfferingVideo = null;
    pcPackage.isRunning = false;
  }

  var noneIsRunning = true; //  When a remote user hangs up, this part checks if there are any remote users that the local user is still connected to before closing the modal.
  for (let i = 0; i < pcPackageArray.length; i++) {
    if (pcPackageArray[i].isRunning) {
      noneIsRunning = false;
      break;
    }
  }
  if (noneIsRunning) {
    closeModal();
  }
}

function handleRemoteHungUp(pcPackage) {
  // console.log("Remote user has hung up.");
  hangUp(pcPackage);
}

function initiateCall(pcPackage) {
  console.log("Sending offer to peer");
  // pc1.createOffer(setLocalAndSendMessage, handleCreateOfferError);
  pcPackage.pc.createOffer(function(sessionDescription) {
    pcPackage.pc.setLocalDescription(sessionDescription);
    sendMessage(pcPackage, sessionDescription);
  }, onCreateSessionDescriptionError);
}

function handleCreateOfferError(event) {
  // this function might change later to re-attempt offer creation or something.
  console.log("createOffer() error: ", event);
}

function answerCall(pcPackage) {
  console.log("Sending answer to peer.");
  // pc1.createAnswer(setLocalAndSendMessage, onCreateSessionDescriptionError);
  pcPackage.pc.createAnswer(function(sessionDescription) {
    pcPackage.pc.setLocalDescription(sessionDescription);
    sendMessage(pcPackage, sessionDescription);
  }, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
  trace("Failed to create session description: " + error.toString());
}

function handleRemoteStreamRemoved(event) {
  // this is fine for now.
  console.log("Remote stream removed. Event: ", event);
}

/////////////////////   Socket.io stuff.

function sendMessage(pcPackage, message) {
  socket.emit("message", {
    data: message,
    fromUsername: pcPackage.localUser,
    toUsername: pcPackage.remoteUser
  });
}

socket.on("message", function(message) {
  console.log("Client received message:", message);
  var pcPackage = findPcPackageFromUsername(message.fromUsername);
  if (message.data.type === "offer") {
    pcPackage.pc.setRemoteDescription(new RTCSessionDescription(message.data));
    var audio = pcPackage.isOfferingAudio;
    var video = pcPackage.isOfferingVideo;
    var initiator = false;
    captureLocalMediaAndCallUser(pcPackage, audio, video, initiator);
  } else if (message.data.type === "answer") {
    pcPackage.pc.setRemoteDescription(new RTCSessionDescription(message.data));
  } else if (message.data.type === "candidate") {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.data.label,
      candidate: message.data.candidate
    });
    pcPackage.pc.addIceCandidate(candidate);
  }
});

socket.on("callCoordinationMessage", function(message) {
  // this function is a mess. Do something about that.
  if (message.message === "calling video") {
    if (currentlyInACall == false) {
      // what happens if the caller is from the same group. When fixing that, don't just check whether the user is in the group; that's not enough because the user might be in the group but calling from outside the group. What you must do instead is check somehow if the user is calling from within the group. Handle that after you add groups.
      currentlyInACall = true;
      currentlyInACallWith = message.fromUsername;
      setModalText("Video call from " + message.fromUsername);
      openModal("incoming call");
      phoneStartsRinging();
      pickUpButton.onclick = function() {
        pickUpCall(message.fromUsername, true, false);
      };
      declineCallButton.onclick = function() {
        declineCall(message.fromUsername);
      };
      endCallButton.onclick = function() {
        hangUp(findPcPackageFromUsername(message.fromUsername));
      };
    } else {
      socket.emit("callCoordinationMessage", {
        message: "declining call",
        fromUsername: localUsername,
        toUsername: message.fromUsername
      });
    }
  } else if (message.message === "calling voice") {
    if (currentlyInACall == false) {
      currentlyInACall = true; // set the iscurrentlyinacallflag if it is not set yet.
      currentlyInACallWith = message.fromUsername;
      setModalText("Voice call from " + message.fromUsername);
      openModal("incoming call");
      phoneStartsRinging();
      pickUpButton.onclick = function() {
        pickUpCall(message.fromUsername, false, false);
      };
      endCallButton.onclick = function() {
        hangUp(findPcPackageFromUsername(message.fromUsername));
      };
      declineCallButton.onclick = function() {
        declineCall(message.fromUsername);
      };
    } else {
      socket.emit("callCoordinationMessage", {
        message: "declining call",
        fromUsername: localUsername,
        toUsername: message.fromUsername
      });
    }
  } else if (message.message === "answering video") {
    console.log("User " + message.fromUsername + " has picked up.");
    setModalText("Connected.");
    callUserVideo(message.fromUsername); // this way of doing it is not good and should not go into production. A user can be forced to pick up if
    // another user hacks the website, skips the callCoordinationMessaging, and calls callUserVideo directly. What you instead must do is create a webRTC answer
    // only when the callee has picked up.
  } else if (message.message === "answering voice") {
    console.log("User " + message.fromUsername + " has picked up.");
    setModalText("Connected.");
    callUserAudio(message.fromUsername); // this way of doing it is not good and should not go into production. A user can be forced to pick up if
    // another user hacks the website, skips the callCoordinationMessaging, and calls callUserVideo directly. What you instead must do is create a webRTC answer
    // only when the callee has picked up.
  } else if (message.message === "hanging up") {
    handleRemoteHungUp(findPcPackageFromUsername(message.fromUsername));
  } else if (message.message === "declining call") {
    handleRemoteHungUp(findPcPackageFromUsername(message.fromUsername));
    alert("user is busy.");
  } else if (message.message === "calling video group") {
    // check currentlyInACall and currentlyInACallWith.
    if (currentlyInACall == false) {
      currentlyInACall = true;
      currentlyInACallWith = "conferenceRoomHeader";
      var phoneRingingModalText = document.getElementById(
        "phoneRingingModalText"
      );
      phoneRingingModalText.textContent =
        "User " +
        message.fromUsername +
        " wants you to join a video conference.";
      openModal("incoming call");
      phoneStartsRinging();
      pickUpButton.onclick = function() {
        pickUpCall(message.fromUsername, true, true);
      };
      endCallButton.onclick = function() {
        for (let i = 0; i < pcPackageArray.length; i++) {
          hangUp(pcPackageArray[i]);
        }
      };
      declineCallButton.onclick = function() {
        declineCall(message.fromUsername);
      };
    } else if (currentlyInACallWith === "conferenceRoomHeader") {
      if (phoneRingTone == null) {
        // checking if the phone is ringing. If not, then answer the call; else do nothing, and the call is just going to be initialized by the local user once the pickUpButton has been clicked.
        socket.emit("callCoordinationMessage", {
          message: "answering video group",
          fromUsername: localUsername,
          toUsername: message.fromUsername
        });
        setModalText("Connected.");
      }
    } else {
      socket.emit("callCoordinationMessage", {
        message: "declining call",
        fromUsername: localUsername,
        toUsername: message.fromUsername
      });
    }
  } else if (message.message === "calling voice group") {
    // check currentlyInACall and currentlyInACallWith.
    if (currentlyInACall == false) {
      currentlyInACall = true;
      currentlyInACallWith = "conferenceRoomHeader"; // later, this will be changed to the id of the group.
      setModalText(
        "User " +
          message.fromUsername +
          " wants you to join a voice conference."
      );
      openModal("incoming call");
      phoneStartsRinging();
      pickUpButton.onclick = function() {
        pickUpCall(message.fromUsername, false, true);
      };
      endCallButton.onclick = function() {
        for (let i = 0; i < pcPackageArray.length; i++) {
          hangUp(pcPackageArray[i]);
        }
      };
      declineCallButton.onclick = function() {
        declineCall(message.fromUsername);
      };
    } else if (currentlyInACallWith === "conferenceRoomHeader") {
      // it is a good idea to also check if the calling pc is not already running
      if (phoneRingTone == null) {
        // checking if the phone is ringing. If not, then answer the call; else do nothing, and the call is just going to be initialized by the local user once the pickUpButton has been clicked.
        socket.emit("callCoordinationMessage", {
          message: "answering voice group",
          fromUsername: localUsername,
          toUsername: message.fromUsername
        });
        setModalText("Connected.");
      }
    } else {
      socket.emit("callCoordinationMessage", {
        message: "declining call",
        fromUsername: localUsername,
        toUsername: message.fromUsername
      });
    }
  } else if (message.message === "answering video group") {
    callUserVideo(message.fromUsername);
    setModalText("Connected.");
  } else if (message.message === "answering voice group") {
    callUserAudio(message.fromUsername);
    setModalText("Connected.");
  } else if (message.message === "abort call") {
    phoneStopsRinging(); // in the future, you might want to check who sent the abort call before aborting, because it might be a troll.
    hangUp(findPcPackageFromUsername(message.fromUsername));
  }
});

socket.on("new user has joined", function(remoteUsername) {
  //check if the user is already in the pcPackageArray
  // if not, create a new pcPackage and push it to the array.
  if (checkUserOnline(remoteUsername) == false) {
    var pcPackage = {
      pc: new RTCPeerConnection(pcConfig),
      localUser: localUsername,
      remoteUser: remoteUsername,
      remoteVideo: null,
      isRunning: false,
      isOfferingVideo: null,
      isOfferingAudio: null
    };
    setUpWebRTCPCHandlers(pcPackage);
    addRemoteUserToOnlineFriendsBar(pcPackage);
    // conferenceRoomGroup.append(remoteUsername);    // uncomment this  // This is not needed at the moment.
    pcPackageArray.push(pcPackage);
  } else {
    console.log(
      "newly arrived user already exists in list. This shouldn't happen."
    );
  }
});

function setUpWebRTCPCHandlers(pcPackage) {
  // add also a handle for on remove stream.
  pcPackage.pc.onicecandidate = function(event) {
    console.log("icecandidate event: ", event);
    if (event.candidate) {
      sendMessage(pcPackage, {
        type: "candidate",
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
    } else {
      console.log("End of candidates.");
    }
  };

  pcPackage.pc.onaddstream = function(event) {
    // called when the remote user has added her stream to the peer connection.
    createNewVideoContainer(pcPackage);
    pcPackage.remoteVideo.srcObject = event.stream;
    pcPackage.isRunning = true;
  };
}

function createNewVideoContainer(pcPackage) {
  var video = document.createElement("video");
  video.autoplay = true;
  video.playsinline = true;
  video.class = "remoteVideo";
  video.style =
    "width:auto; height:auto; max-width:20vw; -webkit-transform: scaleX(-1); transform: scaleX(-1);"; // for some reason, css style is not applied to newly appended elements. So this is a cheap fix until we figure out why.
  document.getElementById("videosDiv").appendChild(video);
  pcPackage.remoteVideo = video;
}

function addRemoteUserToOnlineFriendsBar(pcPackage) {
  var friend = document.createElement("a");
  friend.id = pcPackage.remoteUser + "inFriendsBar";
  friend.textContent = pcPackage.remoteUser;
  friend.href = "#";
  friend.onclick = function() {
    switchUItoUser(pcPackage.remoteUser);
    document.getElementById("remoteUserTitle").textContent =
      "Chatting with " + pcPackage.remoteUser + ".";
  };
  document.getElementById("onlineUsers").appendChild(friend);
}

function removeRemoteUserFromOnlineFriendsBar(pcPackage) {
  var friend = document.getElementById(pcPackage.remoteUser + "inFriendsBar");
  friend.parentNode.removeChild(friend);
}

var conferenceRoomHeader = document.getElementById(
  "conferenceRoomHeaderinFriendsBar"
); // remove this in the future.
conferenceRoomHeader.onclick = function() {
  videoCallButton.textContent = "Join conference (video)";
  voiceCallButton.textContent = "Join conference (audio)";
  conferenceRoomHeader.style.background = "orange";
  var oldFriend = document.getElementById(
    currentlyChattingWith + "inFriendsBar"
  );
  if (oldFriend != null) {
    oldFriend.style.background = "";
  }
  currentlyChattingWith = "conferenceRoomHeader";

  if (document.getElementById("videoPane").style.display === "none") {
    document.getElementById("videoPane").style.display = "block";
    var theTempUsernameBox = document.getElementById("theTempUsernameBox");
    theTempUsernameBox.parentNode.removeChild(theTempUsernameBox);
  }

  videoCallButton.onclick = function() {
    openModal("outgoing call");
    setModalText("Ringing ...");
    currentlyInACall = true;
    currentlyInACallWith = "conferenceRoomHeader";
    endCallButton.onclick = function() {
      for (let i = 0; i < pcPackageArray.length; i++) {
        hangUp(pcPackageArray[i]);
        socket.emit("callCoordinationMessage", {
          message: "abort call",
          fromUsername: localUsername,
          toUsername: pcPackageArray[i].remoteUser
        }); // in the future, consider moving this inside hangUp().
      }
    };
    for (let i = 0; i < pcPackageArray.length; i++) {
      // callUserVideo(pcPackageArray[i].remoteUser);   // Don't call right away. Emit a group call message with the group id/name, which in this case is "conferenceRoomHeader"; // comment this out.
      socket.emit("callCoordinationMessage", {
        message: "calling video group",
        fromUsername: localUsername,
        toUsername: pcPackageArray[i].remoteUser
      }); // later, add a group id property to this message type to specify the calling group. // uncomment this.
    }
  };

  voiceCallButton.onclick = function() {
    openModal("outgoing call");
    setModalText("Ringing ...");
    currentlyInACall = true;
    currentlyInACallWith = "conferenceRoomHeader";
    endCallButton.onclick = function() {
      for (let i = 0; i < pcPackageArray.length; i++) {
        hangUp(pcPackageArray[i]);
        socket.emit("callCoordinationMessage", {
          message: "abort call",
          fromUsername: localUsername,
          toUsername: pcPackageArray[i].remoteUser
        }); // in the future, consider moving this inside hangUp().
      }
    };
    for (let i = 0; i < pcPackageArray.length; i++) {
      // callUserAudio(pcPackageArray[i].remoteUser);  // comment this out.
      socket.emit("callCoordinationMessage", {
        message: "calling voice group",
        fromUsername: localUsername,
        toUsername: pcPackageArray[i].remoteUser
      }); // later, add a group id property to this message type to specify the calling group. // uncomment this.
    }
  };

  // enable the call buttons.
  videoCallButton.disabled = false;
  voiceCallButton.disabled = false;
};

socket.on("user has left", function(username) {
  //check if the user is in the pcPackageList.
  var pcPackage = findPcPackageFromUsername(username);
  if (pcPackage != null) {
    //if yes,
    hangUp(pcPackage); //call hangUp on the corresponding pcPackage
    pcPackageArray.splice(pcPackageArray.indexOf(pcPackage), 1); //then splice that pcPackage out of the array.
    removeRemoteUserFromOnlineFriendsBar(pcPackage); //and remove user from the online friends bar.
  }

  // conferenceRoomGroup.splice(confereneRoomGroup.indexOf(username),1);   // uncomment  this. This is not needed at the moment.

  //if not, do nothing.
});

// emit a signing out signal before the window closes.
window.onbeforeunload = function() {
  socket.emit("signing out", localUsername);
};

/////////////////////

function switchUItoUser(username) {
  //when a user in the friends bar is clicked, this function is called to update chat and so on.
  console.log(username);
  videoCallButton.textContent = "Video Call"; // this is to change the text back from "join conference" if it was so.
  voiceCallButton.textContent = "Voice Call";
  if (currentlyChattingWith != null) {
    var oldFriend = document.getElementById(
      currentlyChattingWith + "inFriendsBar"
    );
    if (oldFriend != null) {
      oldFriend.style.background = "";
    }
  }
  //highlight the friend in the friends bar.
  var newFriend = document.getElementById(username + "inFriendsBar");
  newFriend.style.background = "orange";
  // switch title of chat.
  //switch avatar pic.
  //load chat history from database.
  if (document.getElementById("videoPane").style.display === "none") {
    document.getElementById("videoPane").style.display = "block";
    // document.getElementById("chatTextAreaAndButtons").style.display = "block";
    var theTempUsernameBox = document.getElementById("theTempUsernameBox");
    theTempUsernameBox.parentNode.removeChild(theTempUsernameBox);
  }

  // Add event listener to the call button.

  videoCallButton.onclick = function() {
    console.log("Ringing user " + username + ".");
    openModal("outgoing call");
    setModalText("Ringing ...");
    currentlyInACall = true;
    currentlyInACallWith = username;
    callerRingingTone();
    endCallButton.onclick = function() {
      hangUp(findPcPackageFromUsername(username));
      socket.emit("callCoordinationMessage", {
        message: "abort call",
        fromUsername: localUsername,
        toUsername: username
      }); // in the future, consider moving this inside hangUp(), as it is similar to the "hanging up" signal; indeed, in some cases, it is redundant and might cause problems.
    };
    socket.emit("callCoordinationMessage", {
      message: "calling video",
      fromUsername: localUsername,
      toUsername: username
    }); // send a call signal first before initiating the webrtc sequence.
    // callUserVideo(username);
  };

  voiceCallButton.onclick = function() {
    console.log("Ringing user " + username + ".");
    openModal("outgoing call");
    setModalText("Ringing ...");
    currentlyInACall = true;
    currentlyInACallWith = username;
    callerRingingTone();
    endCallButton.onclick = function() {
      hangUp(findPcPackageFromUsername(username));
      socket.emit("callCoordinationMessage", {
        message: "abort call",
        fromUsername: localUsername,
        toUsername: username
      }); // in the future, consider moving this inside hangUp().
      // closeModal();
    };
    socket.emit("callCoordinationMessage", {
      message: "calling voice",
      fromUsername: localUsername,
      toUsername: username
    }); // send a call signal first before initiating the webrtc sequence.
    // callUserVideo(username);
  };

  // enable the call buttons.
  videoCallButton.disabled = false;
  voiceCallButton.disabled = false;

  //update currentlyChattingWith
  currentlyChattingWith = username;
}

function callUserVideo(username) {
  // first, find the pcPackage of the right user.
  var pcPackage = findPcPackageFromUsername(username);
  // then, call that user.
  if (pcPackage.remoteVideo == null) {
    // change this to a check on isRunning.
    var audio = true;
    var video = true;
    var initiator = true;
    captureLocalMediaAndCallUser(pcPackage, audio, video, initiator);
  }
}

function callUserAudio(username) {
  var pcPackage = findPcPackageFromUsername(username);
  // then, call that user.
  if (pcPackage.remoteVideo == null) {
    // change this to a check on isRunning.
    var audio = true;
    var video = false;
    var initiator = true;
    captureLocalMediaAndCallUser(pcPackage, audio, video, initiator);
  }
}

function findPcPackageFromUsername(username) {
  var pcPackage;
  for (let i = 0; i < pcPackageArray.length; i++) {
    if (String(pcPackageArray[i].remoteUser) === username) {
      pcPackage = pcPackageArray[i];
      break;
    }
  }
  return pcPackage;
}

function checkUserOnline(username) {
  // online users should be in the pcPackageArray.
  for (let i = 0; i < pcPackageArray.length; i++) {
    if (pcPackageArray[i].remoteUser === username) {
      return true;
    }
  }
  return false;
}

function phoneStartsRinging() {
  phoneRingTone = new Audio("Telephone_Ring.mp3");
  phoneRingTone.play();
}

function phoneStopsRinging() {
  if (phoneRingTone != null) {
    phoneRingTone.pause();
    phoneRingTone = null;
  }
}

function callerRingingTone() {
  // just do ringing here --- nothing else.
}

function closeModal() {
  // closes the call modal.
  stopCapturingLocalMedia();
  var modal = document.getElementById("phoneRingingModal");
  modal.style.display = "none";
  currentlyInACall = false;
  currentlyInACallWith = null;
  setModalText("");
}

function openModal(typeOfModal) {
  var modal = document.getElementById("phoneRingingModal");
  modal.style.display = "block";
  updateModalButtons(typeOfModal);
  // if (typeOfModal === "outgoing call"){
  //
  // } else if (typeOfModal === "incoming call"){
  //
  // }
}

function stopCapturingLocalMedia() {
  console.log("stopping local media capture");
  if (localStream != null) {
    localStream.getTracks().forEach(function(track) {
      track.stop();
    });
    localStream = null;
    if (localVideo != null) {
      localVideo.srcObject = null;
    }
  }
}

function updateModalButtons(type) {
  if (type === "outgoing call") {
    pickUpButton.style.display = "none";
    declineCallButton.style.display = "none";
    endCallButton.style.display = "block";
  } else if (type === "incoming call") {
    pickUpButton.style.display = "inline-block";
    declineCallButton.style.display = "inline-block";
    endCallButton.style.display = "none";
  } else if (type === "call answered") {
    pickUpButton.style.display = "none";
    declineCallButton.style.display = "none";
    endCallButton.style.display = "block";
  }
}

function setModalText(text) {
  var phoneRingingModalText = document.getElementById("phoneRingingModalText");
  phoneRingingModalText.textContent = text;
}

function declineCall(username) {
  phoneStopsRinging();
  closeModal();
  socket.emit("callCoordinationMessage", {
    message: "declining call",
    fromUsername: localUsername,
    toUsername: username
  });
}

function pickUpCall(username, videoBool, groupBool) {
  phoneStopsRinging();
  updateModalButtons("call answered");
  setModalText("Connected.");
  findPcPackageFromUsername(username).isOfferingVideo = videoBool;
  findPcPackageFromUsername(username).isOfferingAudio = true;
  if (videoBool == true && groupBool == false) {
    socket.emit("callCoordinationMessage", {
      message: "answering video",
      fromUsername: localUsername,
      toUsername: username
    });
  } else if (videoBool == false && groupBool == false) {
    socket.emit("callCoordinationMessage", {
      message: "answering voice",
      fromUsername: localUsername,
      toUsername: username
    });
  } else if (videoBool == true && groupBool == true) {
    socket.emit("callCoordinationMessage", {
      message: "answering video group",
      fromUsername: localUsername,
      toUsername: username
    });
    for (let i = 0; i < pcPackageArray.length; i++) {
      if (pcPackageArray[i].remoteUser != username) {
        socket.emit("callCoordinationMessage", {
          message: "calling video group",
          fromUsername: localUsername,
          toUsername: pcPackageArray[i].remoteUser
        }); // this is needed for the callee of a conference call to connect to the others.
      }
    }
  } else if (videoBool == false && groupBool == true) {
    socket.emit("callCoordinationMessage", {
      message: "answering voice group",
      fromUsername: localUsername,
      toUsername: username
    });
    for (let i = 0; i < pcPackageArray.length; i++) {
      if (pcPackageArray[i].remoteUser != username) {
        socket.emit("callCoordinationMessage", {
          message: "calling voice group",
          fromUsername: localUsername,
          toUsername: pcPackageArray[i].remoteUser
        }); // this is needed for the callee of a conference call to connect to the others.
      }
    }
  }
}

/////////////// Start Video Group Conference///////////////////////////////////
// when Bistri API client is ready, function
// "onBistriConferenceReady" is invoked
// var room;

// when Bistri API client is ready, function
// "onBistriConferenceReady" is invoked
onBistriConferenceReady = function () {

    // test if the browser is WebRTC compatible
    if ( !BistriConference.isCompatible() ) {
        // if the browser is not compatible, display an alert
        alert( "your browser is not WebRTC compatible !" );
        // then stop the script execution
        return;
    }

    // initialize API client with application keys
    // if you don't have your own, you can get them at:
    // https://api.developers.bistri.com/login
    BistriConference.init( {
        appId: "7a5eebc7",
            appKey: "4465c0d6fb1f64b3d870e90e93080b57",
    } );

    /* Set events handler */

    // when local user is connected to the server
    BistriConference.signaling.addHandler( "onConnected", function () {
        // show pane with id "pane_1"
        showPanel( "pane_1" );
    } );

    // when an error occured on the server side
    BistriConference.signaling.addHandler( "onError", function ( error ) {
        // display an alert message
        alert( error.text + " (" + error.code + ")" );
    } );

    // when the user has joined a room
    BistriConference.signaling.addHandler( "onJoinedRoom", function ( data ) {
        // set the current room name
        room = data.room;
        // ask the user to access to his webcam
        BistriConference.startStream( "webcamSD", function( localStream ){
            // when webcam access has been granted
            // show pane with id "pane_2"
            showPanel( "videoConferencePage" );
            // insert the local webcam stream into div#video_container node
            BistriConference.attachStream( localStream, q( "#video_container" ) );
            // then, for every single members present in the room ...
            for ( var i=0, max=data.members.length; i<max; i++ ) {
                // ... request a call
                BistriConference.call( data.members[ i ].id, data.room );
            }
        } );
    } );

    // when an error occurred while trying to join a room
    BistriConference.signaling.addHandler( "onJoinRoomError", function ( error ) {
        // display an alert message
       alert( error.text + " (" + error.code + ")" );
    } );

    // when the local user has quitted the room
    BistriConference.signaling.addHandler( "onQuittedRoom", function( room ) {
        // show pane with id "pane_1"
        showPanel( "pane_1" );
        // stop the local stream
        BistriConference.stopStream();
    } );

    // when a new remote stream is received
    BistriConference.streams.addHandler( "onStreamAdded", function ( remoteStream ) {
        // insert the new remote stream into div#video_container node
        BistriConference.attachStream( remoteStream, q( "#video_container" ) );
    } );

    // when a local or a remote stream has been stopped
    BistriConference.streams.addHandler( "onStreamClosed", function ( stream ) {
        // remove the stream from the page
        BistriConference.detachStream( stream );
    } );

    // bind function "joinConference" to button "Join Conference Room"
    // q( "#join" ).addEventListener( "click", joinConference );

    // bind function "quitConference" to button "Quit Conference Room"
    q( "#quit" ).addEventListener( "click", quitConference );

    // open a new session on the server
    BistriConference.connect();
}

// when button "Join Conference Room" has been clicked
function joinConference(room){
    var roomToJoin = room;
    // if "Conference Name" field is not empty ...
    if( roomToJoin ){
        // ... join the room
        BistriConference.joinRoom( roomToJoin );
    }
    else{
        // otherwise, display an alert
        alert( "you must enter a room name !" )
    }
}

// when button "Quit Conference Room" has been clicked
function quitConference(){
    // quit the current conference room
    BistriConference.quitRoom( room );
}

function showPanel( id ){
    var panes = document.querySelectorAll( ".pane" );
    // for all nodes matching the query ".pane"
    for( var i=0, max=panes.length; i<max; i++ ){
        // hide all nodes except the one to show
        panes[ i ].style.display = panes[ i ].id == id ? "block" : "none";
    };
}

function q( query ){
    // return the DOM node matching the query
    return document.querySelector( query );
}
////////////////////////////////// End Video Group Conference///////////////////////////////////////