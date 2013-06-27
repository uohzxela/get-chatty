var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {}; //object
var namesUsed = []; //array
var currentRoom = {}; //object

exports.listen = function(server) {
	io = socketio.listen(server); 										//start the socket.io server, allowing it to piggyback on the existing HTTP server
	io.set('log level', 1); 											//limits the verbosity of socket.io's logging to console
	io.sockets.on('connection', function(socket) { 						//define how each user connection will be handled
		guestNumber = assignGuestName(socket, guestNumber, 
			nickNames, namesUsed); 										// Assign user a guest name when they connect
		joinRoom(socket, 'Lobby'); 										// place user in the "Lobby" room
		
		//handle user in the "Lobby" room when they connect
		handleMessageBroadcasting(socket, nickNames); 
		handleNameChangeAttempts(socket, nickNames, namesUsed); 
		handleRoomJoining(socket);
		
		socket.on('rooms', function() { 								//provide user with a list of occupied rooms on request
			socket.emit('rooms', io.sockets.manager.rooms);
		});
		console.log(nickNames[socket.id]);
		socket.on('getName', function() {
			socket.emit('getName', {name: nickNames[socket.id]});
		});
		socket.emit('getName', {name: nickNames[socket.id]});
		
		handleClientDisconnection(socket, nickNames, namesUsed); 		//define "cleanup" logic when a user disconnects
	});
};
/*                       */
/* assigning guest names */
/*						 */	

//when a user first connects to the chat server
//the user is placed in a chat room named "Lobby" 
//assignGuestName is called to assign them a name 
//each guest name is the word "Guest" + number which increments each time a new user connects
//the guest name is added to nickNames obj for reference, assoc with internal socket ID
//it is also added to namesUsed array	
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	var name = 'Guest' + guestNumber; 									//generate a new guest name (guestNumber init value = 1)
	nickNames[socket.id] = name; 										//create a field in nickNames obj whose name is client connection ID with value containing guest name
	socket.emit('nameResult', { 										//let user know their guest name
		success: true,
		name: name
	});
																		//push is a method to add an elem to the end of an array
	namesUsed.push(name); 												//note that gust name is now used
	return guestNumber + 1; 											//increment counter used to generate guest names
}
		
/*                       */
/*     joining rooms	 */
/*						 */	

// user joins a socket.io room
// requiring a call to the join method of a socket object (a feature of socket.io)
// the app communicates details to the user and other users in the same room
// 		let the user know what other users are in the room
// 		and let these other users know that the user is now present

function joinRoom(socket, room) {
	socket.join(room); 													//make user join room
	currentRoom[socket.id] = room; 										//associate user id with name of room
	socket.emit('joinResult', {room: room}); 							//let user know they're now in a new room
	socket.broadcast.to(room).emit('message', { 						// let other users know that a user has joined
		text: nickNames[socket.id] + ' has joined ' + room + '.'
	});
	
	//determine what users are in the same room as the user
	var usersInRoom = io.sockets.clients(room); 						//an array of user objects
	if (usersInRoom.length > 1) { 										// if there are more than one ppl in the rm
		var usersInRoomSummary = 'Users currently in ' + room + ': '; 	// a string for summarising users
		for (var index in usersInRoom) { 								//loop through the array of users
			var userSocketId = usersInRoom[index].id;
			if (userSocketId != socket.id) { 							// if user id is not the same as newcomer's id
				if (index > 0) {
					usersInRoomSummary += ', '; 
				}
			usersInRoomSummary += nickNames[userSocketId]; 				//concatenate string with user nicks
			}
		}
		usersInRoomSummary += '.';
		socket.emit('message', {text: usersInRoomSummary}); 			//send summary of other users to the newcomer
	}
}

/*                       		  */
/* handling name change requests  */
/*						 		  */

//a client sent a nameAttempt event with string data "Bob Dobbs"
//the server turn nameResult event with JSON data {success: true, name: name}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
	socket.on('nameAttempt', function(name) { 								//added listener for name change attempts, 'name' is a string here not obj
		
		//don't allow nicknames to begin with Guest
		if (name.indexOf('Guest') == 0) {  
			// emit to user that name didn't change successfully
			socket.emit('nameResult', { 
				success: false,
				message: 'Names cannot begin with "Guest".'
			});
		} else {
			// if the name isn't alr registered, register it
			if (namesUsed.indexOf(name) == -1) {
				var previousName = nickNames[socket.id];  					//get prev name from nickNames obj
				var previousNameIndex = namesUsed.indexOf(previousName); 	//get index of prev name from namesUsed array
				namesUsed.push(name); 										//add new name into the namesUsed array
				nickNames[socket.id] = name; 								//replace the prev name with new name in nickNames obj
				delete namesUsed[previousNameIndex]; 						//del prev name from namesUsed array
				//emit to user that name changes successfully
				socket.emit('nameResult', { 
					success: true,
					name: name
				});
				//broadcast to other users abt the name change
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' is now known as ' + name + '.'
				});
			} else {
				//emit to user that name is alr taken
				socket.emit('nameResult', {
					success: false,
					message: 'That name is already in use.'
				});
			}
		}
         //emit getName event
			
	});

}

/*                       		  */
/*     sending chat messages      */
/*						 		  */

// imagine a room containing clients A,B,C,D in room "Lobby"
// client A sent an event to the server with JSON data {room: "Lobby", text: "Hi all!"}
// server then sends JSON data {text: "Bob: Hi all!"} to clients B,C,D in the same room


function handleMessageBroadcasting(socket) {
	socket.on('message', function (message) {
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	});
}	

/*                       		  */
/*          creating rooms	      */
/*						 		  */

// allows user to join an existing room, or if that doesn't exist, create it
// actually we don't have to worry abt creating, socket.io's 'join' feature will take care of it
// client sent 'join' event with JSON data containg string data "Bob's Room"
// server sent joinResult event with JSON data {room: "Bob's Room"}

function handleRoomJoining(socket) {
	socket.on('join', function(room) {
		socket.leave(currentRoom[socket.id]); //note the use of socket.io's leave method
		joinRoom(socket, room.newRoom);		  //invoke the use of joinRoom function
	});
}

/*                       		  */
/*  handling user disconnections  */
/*						 		  */

//remove a user's nickname from nickNames obj and namesUsed arr when the user leaves

function handleClientDisconnection(socket) {
	socket.on('disconnect', function() {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex]; 								//del an elem containig user's nickname in the namesUsed array
		delete nickNames[socket.id]; 								//del a field containing user's nicknames in the nickNames obj
	});
}