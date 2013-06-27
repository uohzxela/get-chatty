/*                       		  							  	  */
/* 	logic that interacts directly with the browser-based UI	      */
/*						 		  					              */

//displaying untrusted content
function divEscapedContentElement(message) {
	return $('<div></div>').text(message);
}
//displaying sys messages
function divSystemContentElement(message) {
	return $('<div></div>').html('<i>' + message + '</i>');
}

//processing raw user input
//if user begin with '/' character, it is treated as cmd
//if not it is sent to the server as a msg to be broadcasted to other users
//and added to the chat room text of the rm the user's currently in

function processUserInput(chatApp, socket) {
	var message = $('#send-message').val();
	var systemMessage;
	if (message.charAt(0) == '/') {
		systemMessage = chatApp.processCommand(message);
		
		if (systemMessage) { 													//if command is invalid, then systemMessage = 'Unrecognized command.'
																				//otherwise systemMessage = false
			$('#messages').append(divSystemContentElement(systemMessage));		//display 'Unrecognized command.' in message box
		}

	} else { 																	//broadcast non-command input to other users
		chatApp.sendMessage($('#room').text(), message);						//invoke sendMessage function with room name and message as arguments
		$('#messages').append(divEscapedContentElement(message));				//add message to sender's message box
		$('#messages').scrollTop($('#messages').prop('scrollHeight'));			//adjust scroll bar
	}
	$('#send-message').val('');													//clear the send-message input field
}

/*                       		  							  	  */
/* 	logic to execute when the webpage is fully loaded in browser  */
/*						 		  					              */

//this code handles client-side initiation of socket.io handling

var socket = io.connect();

$(document).ready(function() {
	var chatApp = new Chat(socket);
	socket.on('nameResult', function(result) { 									//display the results of a name change attempt
		var message;
		if (result.success) {
			message = 'You are now known as ' + result.name + '.';
		} else {
			message = result.message;
		}
		$('#messages').append(divSystemContentElement(message));
	});
	socket.on('joinResult', function(result) { 									//display the result of a room change
		$('#room').text(result.room);
		$('#messages').append(divSystemContentElement('Room changed.'));
	});
	socket.on('message', function (message) { 									//display received message
		var newElement = $('<div></div>').text(message.text);
		$('#messages').append(newElement);
	});
	socket.on('rooms', function(rooms) { 										//display list of rooms available
		$('#room-list').empty();
		for(var room in rooms) {
			room = room.substring(1, room.length);
			if (room != '') {
				$('#room-list').append(divEscapedContentElement(room));
			}
		}
		$('#room-list div').click(function() { 									//allow the click of a room name to change to that room
			chatApp.processCommand('/join ' + $(this).text());
			$('#send-message').focus();
		});
	});
	setInterval(function() { 													//request list of rooms available intermittantly
		socket.emit('rooms');
	}, 1000);
	$('#send-message').focus();
	$('#send-form').submit(function() { 										//allow the clicking of button to send a msg
		processUserInput(chatApp, socket);
		return false;
	});
});