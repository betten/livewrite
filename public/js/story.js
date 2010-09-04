io.setPath('client');
socket = new io.Socket(null, {port: 8888});
socket.connect();
socket.on('message', function(data) {
	data = JSON.parse(data);
	if(!data.type || !data.id || data.id != STORY_ID) return false;
	switch(data.type) {
		case 'story':
			updateStory(data);
			break;
		case 'message':
			addMessage(data);
			break
		default:
	}
});
var updateStory = function(data) {
	$('#story').text(data.text);
};
var addMessage = function(data) {
	if(!data.message || !data.by) return false;
	$('#messages').prepend('<div class="message">'+data.message+'<strong> by '+data.by+'</strong></div>');
};
$('document').ready(function() {
	$('#message').keypress(function(e) {
		if(e.keyCode != 13) return true;
		var data = {
			type: 'message',
			id: STORY_ID,
			message: $(this).val(),
			by: $('#name').text()
		};
		socket.send(JSON.stringify(data));
		addMessage(data);
		$(this).val('');
	});
});
