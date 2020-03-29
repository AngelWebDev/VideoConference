// this is the server js. It will listen for connections and signals on port 8080 on the ip address of our server.
// socket.io here is used for signaling (relaying offers and answers), and other coordination messages.
"use strict";
var http = require("http");
// var fs = require('fs');
var nodeStatic = require("node-static");
var arrayOfSockets = [];
var roomLeaders = {};
var fileServer = new nodeStatic.Server();
var server = http
  .createServer(function(req, res) {
    // fs.readFile('./index.html', 'utf-8', function(error, content) {
    //     res.writeHead(200, {"Content-Type": "text/html"});
    //     res.end(content); });
    fileServer.serve(req, res); // is it safe to serve everything before authenticating a user?
  })
  .listen(8080);

// Loading socket.io
var io = require("socket.io").listen(server);
// io.set('transports',['websocket']);

// When a client connects, we note it in the console
io.sockets.on("connection", function(socket) {
  // the socket in this function is the socket object corresponding to the client who has just connected.
  // you can save this socket obkect to a variable.

  console.log("A client is connected! socket id is ", socket.id);
  // socket.emit("message", "you are connected, Mr. Client.");
  // socket.username = username sets the username of the socket object ccurrently communicating with the server.

  socket.authenticated = 0;

  socket.on("getAvailableUsers", function(groupType) {
    // later, this should be changed to return all users in the database
    //that the current user has access to; not just the ones that are online.
    // get all onlinet users
    var onlineUsers = [];
    onlineUsers = arrayOfSockets.map(function(ele, index) {
      // get username and id of online users
      if (ele != socket) return { username: ele.username, id: ele.id };
    });
    socket.emit("availableUsers", onlineUsers);
  });

  socket.on("createGroup", function(groupData, groupType) {
    // Create group named groupData.groupName with selected users
    socket.join(groupData.groupName); // join this room
    roomLeaders[groupData.groupName] = socket.id;
    socket.emit("joinedThisRoom", groupData.groupName, groupType); // to send message "joined this room"
    for (let i = 0; i < groupData.selectedUsers.length; i++) {
      // to send message all of members in this room
      for (let j = 0; j < arrayOfSockets.length; j++) {
        if (arrayOfSockets[j].id == groupData.selectedUsers[i]) {
          arrayOfSockets[j].join(groupData.groupName);
          socket.broadcast
            .to(groupData.selectedUsers[i])
            .emit("joinedThisRoom", groupData.groupName, groupType);
          break;
        }
      }
    }
  });

  socket.on("getRoomLeader", function(groupName, groupType) {
    if (roomLeaders[groupName] == socket.id)
      socket.emit("you are leader of this room", groupName, groupType);
  });

  socket.on("add participant", function(groupName) {
    // get users not included this group
    let usersCanbeadded = [];
    io.of("/")
      .in(groupName)
      .clients(function(err, clients) {
        for (let i = 0; i < arrayOfSockets.length; i++) {
          var j;
          for (j = 0; j < clients.length; j++) {
            if (arrayOfSockets[i].id == clients[j]) break;
          }
          if (clients.length == j)
            usersCanbeadded.push(arrayOfSockets[i].username);
        }
        console.log(usersCanbeadded);
        socket.emit("users can be added", usersCanbeadded);
      });
  });

  socket.on("remove participant", function(groupName) {
    let currentUsersList = [];
    io.of("/")
      .in(groupName)
      .clients(function(err, clients) {
        clients.map(client => {
          if (client != socket.id) {
            for (var i = 0; i < arrayOfSockets.length; i++) {
              if (arrayOfSockets[i].id == client)
                currentUsersList.push(arrayOfSockets[i].username);
            }
          }
        });
        console.log(currentUsersList);
        socket.emit("users that can be removed", currentUsersList);
      });
  });

  socket.on("removed users", function(userList, roomname, groupType) {
    for (let i = 0; i < arrayOfSockets.length; i++) {
      userList.map(username => {
        if (arrayOfSockets[i].username == username) {
          arrayOfSockets[i].leave(roomname);
          socket
            .to(arrayOfSockets[i].id)
            .emit("you are removed from this room", roomname, groupType);
        }
      });
    }
  });

  socket.on("new user added in this group", function(
    userList,
    roomname,
    groupType
  ) {
    for (let i = 0; i < arrayOfSockets.length; i++) {
      userList.map(username => {
        if (arrayOfSockets[i].username == username) {
          arrayOfSockets[i].join(roomname);
          socket
            .to(arrayOfSockets[i].id)
            .emit("joinedThisRoom", roomname, groupType);
        }
      });
    }
  });

  socket.on("username", function(username) {
    for (var i = 0; i < arrayOfSockets.length; i++) {
      if (username == arrayOfSockets[i].username) {
        socket.emit("usernameAleadyExist");
        break;
      }
    }
    if (i == arrayOfSockets.length) {
      // later, this username (and also a password) will first be compared to the one on the database. Then have an authenticated flag that enables the functions below.
      // perform authentication here

      // then add an if condition here that checks authentication before doing anything.
      socket.username = username;
      socket.authenticated = 1;
      // tell the old users about the new user.
      // socket.broadcast.emit("new user has joined", username);  // this does not work because it tells all connected clients, not just the authenticated ones, about the new user.
      // tell the new user about the old users (this is only needed if the new user arrives after the old users are already in a call.)
      for (let j = 0; j < arrayOfSockets.length; j++) {
        socket.broadcast
          .to(arrayOfSockets[j].id)
          .emit("new user has joined", username);
        socket.emit("new user has joined", arrayOfSockets[j].username);
      }
      // push the new user to the socketArray.
      arrayOfSockets.push(socket); // note: the only users in the arrayOfSockets are authenticated users.
    }
  });

  socket.on("message", function(message) {
    console.log("client sent a message: ", message); // later, broadcast this to all clients. And later still, emit it only to the client to whom the message is intended, or to the list of clients in a given room.
    // socket.broadcast.emit('message', message);
    // console.log("target",socket.targetUsername); //
    // emitMessageToSpecificUser(socket,message,socket.targetUsername);
    emitMessageToSpecificUser(socket, message, message.toUsername);
  });

  socket.on("signing out", function(username) {
    socket.broadcast.emit("user has left", username); // later, for security purpses, emit this only to authemticated users.
    //remove user from the Socket Array.
    for (let i = 0; i < arrayOfSockets.length; i++) {
      // find a more efficient way to do this that a for loop. May be have a list of users with the same order as the sockets list.
      if (arrayOfSockets[i].username === username) {
        arrayOfSockets.splice(i, 1);
        break;
      }
    }
  });

  socket.on("join live conference", function(groupName, groupType) {
    socket.join(groupName + "-live");

    // socket.to(groupName + "-live").emit("new user", socket.id);
    io.of("/")
      .in(groupName + "-live")
      .clients(function(err, clients) {
        if (err) throw err;
        clients.map(client => {
          if (client != socket.id) {
            socket.emit("joined to live group", socket.id, client);
            socket.to(client).emit("new user", socket.id, client);
          }
        });
      });
  });

  socket.on("candidate", function(userId, message) {
    socket.to(userId).emit("you are candidate", socket.id, userId, message);
  });

  socket.on("answer", function(id, message) {
    socket.to(id).emit("answer", socket.id, id, message);
  });

  socket.on("I am candidate", function(id, message) {
    socket.to(id).emit("I am candidate", socket.id, id, message);
  });

  socket.on("offer", function(userId, message) {
    socket.to(userId).emit("offer", socket.id, userId, message);
  });
  // socket.on("get user list", function(roomName, groupType) {
  //   let roomMembers = [];
  //   io.of("/")
  //     .in(roomName + groupType)
  //     .clients(function(err, clients) {
  //       if (err) throw err;
  //       clients.map(client => {
  //         if (client != socket.id) roomMembers.push(client);
  //       });
  //       socket.emit("userList", roomMembers);
  //     });
  // });
  // socket.on("candidate", function(id, message) {
  //   socket.to(id).emit("candidate", socket.id, message);
  // });

  socket.on("chatMessage", function(message) {
    // add the message to the messages database in the message table between the sender and receiver.
    // forward message to the receiver.
    // emitChatMessageToSpecificUser(socket,message,message.receiver);
  });

  socket.on("callCoordinationMessage", function(message) {
    // add the call record to the records database.
    // forward message to the receiver.
    emitCallCoordinationMessageToSpecificUser(
      socket,
      message,
      message.toUsername
    );
  });
});

function emitMessageToSpecificUser(socket, message, username) {
  // add a condition to check if a user is online. simple check on whether a username is in the list.
  for (let i = 0; i < arrayOfSockets.length; i++) {
    // find a more efficient way to do this that a for loop. May be have a list of users with the same order as the sockets list.
    if (arrayOfSockets[i].username === username) {
      // console.log("found the target!");
      socket.broadcast.to(arrayOfSockets[i].id).emit("message", message);
      break;
    }
  }
}

function emitChatMessageToSpecificUser(socket, message, username) {
  // add a condition to check if a user is online. simple check on whether a username is in the list.
  for (let i = 0; i < arrayOfSockets.length; i++) {
    // find a more efficient way to do this that a for loop. May be have a list of users with the same order as the sockets list.
    if (arrayOfSockets[i].username === username) {
      // console.log("found the target!");
      socket.broadcast.to(arrayOfSockets[i].id).emit("chatMessage", message);
      break;
    }
  }
}

function emitCallCoordinationMessageToSpecificUser(socket, message, username) {
  // add a condition to check if a user is online. simple check on whether a username is in the list.
  for (let i = 0; i < arrayOfSockets.length; i++) {
    // find a more efficient way to do this that a for loop. May be have a list of users with the same order as the sockets list.
    if (arrayOfSockets[i].username === username) {
      // console.log("found the target!");
      socket.broadcast
        .to(arrayOfSockets[i].id)
        .emit("callCoordinationMessage", message);
      break;
    }
  }
}

// server.listen(8080);
