/*                       		  							  */
/* 		relaying msgs and name/rm changes to the server	      */
/*						 		  					          */

//a javascript prototype object 
//that will process chat commands, 
//send msgs and request room and nick changes

// javascript's equivalent of a "class" that takes a single 
// argment, a socket.io socket, when instantiated
var Chat = function(socket) {
	this.socket = socket;
};


//add function to send chat messages
Chat.prototype.sendMessage = function(room, text) {
	var message = { //create a message object
		room: room,
		text: text
	};
	this.socket.emit('message', message);
};

//add function to change rooms
Chat.prototype.changeRoom = function(room) {
	this.socket.emit('join', {
		newRoom: room
	});
};

/*
//add function to get user name
Chat.prototype.getName = function() {
	var name;
	
	this.socket.on('getName',  function(data) {
		name =  data.name;
		alert(name + 'aasdfasfd');
		socket.emit('getName');
		
	});
	
	return name;
};
*/


//add function for processing chat command
//two chat cmds are recognized:
//"join" for joining/creating a room
//"nick" for changing one's nickname

Chat.prototype.processCommand = function(command) {
	var words = command.split(' '); 						//create an array of strings with elements separated by space
	var command = words[0] 									//e.g. /jOiN -> join, /NICK -> nick
		.substring(1, words[0].length)
		.toLowerCase();
	var message = false;
	switch(command) {
		case 'join': 
			words.shift(); 									// del first elem in string array
			var room = words.join(' '); 					//create a string with remaining elems(if more than one) joined by spaces, e.g. bob's|room -> bob's room
			this.changeRoom(room); 							//invoke the above function
		break;
		case 'nick':
			words.shift();
			var name = words.join(' ');
			this.socket.emit('nameAttempt', name); 			//emit name changing event
		break;
		default:
			message = 'Unrecognized command.';
		break;
	}
	return message; 										//return msg with value: false with cmd execution is successful
															//otherwise return msg with value: 'Unrecognized command.'
};

