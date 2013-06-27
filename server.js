var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};

/*														*/			
/* three helper functions for serving static HTTP files */
/*														*/	
		
// handler to send 404 errors when a file requested does not exist
function send404(response) {
	response.writeHead(404, {'Content-Type': 'text/plain'});
	response.write('Error 404: resource not found.');
	response.end();
}

// handler for serving file data
function sendFile(response, filePath, fileContents) {
	response.writeHead(200, 
		{"content-type": mime.lookup(path.basename(filePath))}
	);
	
	response.end(fileContents);
}

// cache static files to memory, only reading them from disk 
// the first time they are accessed
function serveStatic(response, cache, absPath) {
	if (cache[absPath]) { 												//check if file is cached in memory
	sendFile(response, absPath, cache[absPath]); 						// serve file from memory
	} else {
		fs.exists(absPath, function(exists) { 							//check if file exists
			if (exists) {
				fs.readFile(absPath, function(err, data) { 				//read file from disk
					if (err) {
						send404(response);
					} else {
						cache[absPath] = data; 							// create a field in cache obj with particular data
						sendFile(response, absPath, data); 				//serve file read from disk
					}
				});
			} else {
				send404(response); 										//send HTTP 404 response
			}
		});
	}
}


/*creating the http server*/

// create HTTP server, using anonymous function to define per-request behavior
var server = http.createServer(function(request, response) {
	var filePath = false; 
	if (request.url == '/') {
		filePath = 'public/index.html'; //determine html file to be served by default
	} else {
		filePath = 'public' + request.url; //translate url path to relative file path
	}
	var absPath = './' + filePath;
	serveStatic(response, cache, absPath); //serve the static file
});

server.listen(3000, function() {
	console.log("Server listening on port 3000.");
});

/*setting up socket.io server*/

var chatServer = require('./lib/chat_server');
chatServer.listen(server);

