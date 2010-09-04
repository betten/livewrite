io.setPath('client');
socket = new io.Socket(null, {port: 8888});
socket.connect();
socket.on('message', function(data) {
	data = JSON.parse(data);
	console.log(data);
	if(data.id && data.id == STORY_ID && data.type == 'message') addMessage(data);	
});
var addMessage = function(data) {
	if(!data.message || !data.by) return false;
	$('#messages').prepend('<div class="message">'+data.message+'<strong> by '+data.by+'</strong></div>');
};
$(document).ready(function() {
	$('#story').keyup(function(e) {
		var data = {
			type: 'story-update',
			id: STORY_ID,
			text: $(this).val()
		};
		socket.send(JSON.stringify(data));
	});
	$('#save').click(function() {
		$.post('/save/'+STORY_ID, { text: $('#story').val() });
	});
});
