io.setPath('client');
socket = new io.Socket(null, {port: 8080});
socket.connect();
socket.on('message', function(data) {
	data = JSON.parse(data);
	if(data.type && data.type == 'story-new' && data.id && data.title) {
		$('#stories').prepend('<div class="story"><a href="/story/'+data.id+'">'+data.title+'</a></div>');
	}
});
