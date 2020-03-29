After you install node, you might need to update it to the latest (stable) version. To do that: 
$ npm install -g n
$ n stable.

Then install socket.io: 
$ npm install socket.io --save


Then close and re-open the terminal.

Start the server by running
    node index.js


Note: make sure socket.io is installed in the right path. 
The path to the  socket.io.js file for me was secuforce.app/webrtc_socketio_test/node_modules/socket.io-client/dist/socket.io.js.
Note: make sure you socket connections are on the right addresses.


