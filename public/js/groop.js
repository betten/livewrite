io.setPath('client');
socket = new io.Socket();
socket.connect();
var hello = {
	'hello': true,
	'id': GROOPID
};
socket.send(JSON.stringify(hello));
socket.on('message', function(data) {
	data = JSON.parse(data);
	if(data.message) {
		addMessage(data.message);
	}
});

var addMessage = function(message) {
	$('#no-messages').hide();
	$('#messages').prepend('<li>'+message+'</li>');
	$('#new-message').val('');
};
var submitNewMessage = function() {
	var message = $('#new-message').val();
	if(message.length < 1) return false;
	var data = {
		'id': GROOPID,
		'message': message
	};
	socket.send(JSON.stringify(data));
	addMessage(message);
};
$(document).ready(function() {
	$('#post-new-message').click(function() {
		submitNewMessage();
	});
	$('#new-message').keypress(function(e) {
		if(e.keyCode == '13') submitNewMessage();
	});
});
