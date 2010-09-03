var express 	= require('./modules/express');
var couchdb 	= require('./modules/node-couchdb/lib/couchdb');
var io 		= require('./modules/Socket.IO-node/');

var client = couchdb.createClient();
var users_db = client.db('users');
var stories_db = client.db('stories');

var createUser = function(username, password, callback) {
	var user = {
		'username': username,
		'password': password,
		'stories': []
	};
	users_db.saveDoc(user, callback);
};
var newStory = function(title) {
	var story = {
		'title': title,
		'messages': [],
		'text': ''
	};
	return story;
};
var names = ['Abbel','Avery','Amadeus','Albany','Aramis','Atticus','Azure','Barrett','Braxtin','Becket','Brogan','Bransan','Bowey','Carson','Cason','Coop','Corbin','Cody','Dante','Dagmar','Dallin','Donovan','Declan','Edison','Eugenio','Eamonn','Emerson','Easton','Ezra','Freddie','Fletcher','Flynn','Fjord','Finn','Gage','Galen','Grady','Gideon','Gun','Grayson','Hogie','Holden','Ivan','Ignatio','Jag','Jet','Justice','Jasper','Kidd','Kai','Kyan','Killiam','Keaton','Keagan','Kelton','Lachlan','Layton','Maddox','Madden','Magnus','Nash','Oak','Odinn','Orion','Pyrce','Porter','Paxton','Presco','Quillan','Quinlan','Reyden','Ryyder','Ryker','Silas','Sorren','Sawyer','Sterling','Storm','Stoney','Trevion','Trucker','Turner','Ulises','Urriah','Ulrich','Vardan','Van','Vladimir','Varun','Wade','Wallace','Warn','Wiley','Walker','Wilder','Wolf','West','Wyatt','Yale','York','Yates','Xander','Zeus','Zyon'];
var generateName = function() {
	return names[Math.floor(Math.random()*names.length)];
};

var app = express.createServer(
	express.bodyDecoder(),
	express.cookieDecoder(),
	express.session(),
	express.staticProvider(__dirname + '/public')
);

app.use(app.router);

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function(req, res){
	if(req.session.errors) {
		console.log(req.session.errors);
		req.session.errors = null;
	}
	if(req.session.user) {
		res.redirect('/user/'+req.session.user._id);
		return false;
	}
	stories_db.view('stories', 'by_id', {limit: 5}, function(err, doc) {
		console.log(err);
		console.log(doc.rows);
		res.render('index', { locals: {stories: doc.rows, user: null}});
	});
});

app.get('/all', function(req, res) {
	stories_db.view('stories', 'by_id', {}, function(err, doc) {
		res.render('all', { locals: {stories: doc.rows, user: req.session.user}});
	});
});

app.post('/signin', function(req, res) {
	if(!req.body.username || !req.body.password) {
		req.session.errors = 'missing signin info';
		res.redirect('/');
		return false;
	}
	users_db.view('users', 'by_username', {key: req.body.username}, function(err, doc) {
		var user = doc.rows[0];
		if(user && user.value.password == req.body.password) {
			req.session.user = user.value;
			res.redirect('/user/'+user.value._id);
			return false;
		}
		req.session.errors = 'invalid username password combo';
		res.redirect('/');
	});
});

app.post('/signup', function(req, res) {
	if(!req.body.username || !req.body.password || !req.body.confirmation) {
		req.session.errors = 'missing signup info';
		res.redirect('/');
		return false;
	}
	if(req.body.password != req.body.confirmation) {
		req.session.errors = 'password doesn\'t match confirmation';
		res.redirect('/');
		return false;
	}
	users_db.view('users', 'by_username', {key: req.body.username}, function(err, doc) {
		var user = doc.rows[0];
		if(user && user.value.username == req.body.username) {
			req.session.errors = 'username already exists!';
			res.redirect('/');
			return false;
		}
		createUser(req.body.username, req.body.password, function(err, data) {
			users_db.view('users', 'by_id', {key: data.id}, function(err, doc) {
				var user = doc.rows[0];
				req.session.user = user.value;
				res.redirect('/user/'+data.id);	
			});
		});
	});
});

app.get('/signout', function(req, res) {
	req.session.user = null;
	res.redirect('/');
});

app.get('/user/:id', function(req, res) {
	if(!req.session.user) {
		res.redirect('/');
		return false;
	}
	users_db.getDoc(req.params.id, function(err, doc) {
		console.log(doc);
		res.render('user', { locals: {user: doc}});
	});
});

app.post('/create', function(req, res) {
	if(!req.session.user) {
		res.redirect('/');
		return false;
	}
	var user_id = req.session.user._id;
	users_db.getDoc(user_id, function(err, user) {
		stories_db.saveDoc({
			'title': req.body.title, 
			'messages': [], 
			'text': '', 
			'user_id': user_id
		}, function(err, data) {
			var story_id = data.id;
			console.log(user);
			user.stories.push({'id': story_id, 'title': req.body.title});
			users_db.saveDoc(user_id, user, function(err, data) {
				var story = {
					type: 'story-new',
					id: story_id,
					title: req.body.title
				};
				socket.broadcast(JSON.stringify(story));	
				res.redirect('/create/'+story_id);
			});
		});
	});
});

app.get('/create/:id', function(req, res) {
	if(!req.session.user) {
		res.redirect('/');
		return false;
	}
	stories_db.view('stories', 'by_id', {key: req.params.id}, function(err, doc) {
		var story = doc.rows[0];
		if(story) {
			res.render('create', { locals: {story: story.value, user: req.session.user}});
		}
	});
});

app.post('/save/:id', function(req, res) {
	if(!req.session.user || !req.body.text) return false;
	stories_db.view('stories', 'by_id', {key: req.params.id}, function(err, doc) {
		if(err) {
			console.log(err);
			return false;
		}
		var story = doc.rows[0];
		if(!story) return false;
		story.value.text = req.body.text;
		stories_db.saveDoc(story.value._id, story.value);
	});
});

app.get('/story/:id', function(req, res) {
	stories_db.view('stories', 'by_id', {key: req.params.id}, function(err, doc) {
		var story = doc.rows[0];
		if(!story) return false;
		if(req.session.user && req.session.user._id == story.value.user_id) {
			res.redirect('/create/'+story.value._id);
			return false;
		}
		name = generateName();
		res.render('story', { locals: {story: story.value, user: req.session.user, name: name}});
	});
});

app.listen(8080);

var viaSocket = {};
viaSocket.updateStory = function(client, data) {
	if(!data.id) return false;
	if(!data.text) data.text = '';
	stories_db.view('stories', 'by_id', {key: data.id}, function(err, doc) {
		var story = doc.rows[0];
		if(!story) return false;
		var output = {
			type: 'story',
			id: data.id,
			text: data.text
		};
		client.broadcast(JSON.stringify(output));
	});
};
viaSocket.updateMessages = function(client, data) {
	if(!data.id || !data.message || !data.by) return false;
	stories_db.view('stories', 'by_id', {key: data.id}, function(err, doc) {
		var story = doc.rows[0];
		if(!story) return false;
		story.value.messages.unshift({
			message: data.message,
			by: data.by
		});
		stories_db.saveDoc(story.value._id, story.value);
		client.broadcast(JSON.stringify(data));
	});
};
var socket = io.listen(app);
var sys = require('sys');
socket.on('connection', function(client) {
	client.on('message', function(data) {
		data = JSON.parse(data);
		console.log(data);
		if(!data.type) return false;
		switch(data.type) {
			case 'story-update':
				viaSocket.updateStory(client,data);
				break;
			case 'message':
				viaSocket.updateMessages(client,data);
			default:
		}
	});
});
