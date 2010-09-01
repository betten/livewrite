var express 	= require('./modules/express');
var couchdb 	= require('./modules/node-couchdb/lib/couchdb');
var io 		= require('../../socket.io-node');

var client = couchdb.createClient();
var users_db = client.db('users');
var stories_db = client.db('stories');

var createUser = function(username, password, callback) {
	var user = {
		'username': username,
		'password': password,
		'stories': null
	};
	users_db.saveDoc(user, callback);
};
var newStory = function(title) {
	var story = {
		'title': title,
		'messages': null,
		'text': null
	};
	return story;
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
	res.render('index', { locals: {stories: null}});
});

app.post('/signin', function(req, res) {
	if(!req.body.username || !req.body.password) {
		req.session.errors = 'missing signin info';
		res.redirect('/');
		return false;
	}
	users_db.allDocs(function(err, docs) {
		console.log(docs);
		console.log(req.body);
		for(var i in docs.rows) {
			var user = docs.rows[i].value;
			console.log(user);
			if(user.username == req.body.username && user.password == req.body.password) {
				req.session.user_id = user._id;
				res.redirect('/user/'+user._id);
				return false;
			}
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
	users_db.allDocs(function(err, docs) {
		for(var i in docs.rows) {
			var user = docs.rows[i].value;
			console.log(user);
			if(user.username == req.body.username) {
				req.session.errors = 'username already exists!';
				res.redirect('/');
				return false;
			}
		}
		createUser(req.body.username, req.body.password, function(err, data) {
			req.session.user_id = data.id;
			res.redirect('/user/'+data.id);	
		});
	});
});

app.get('/user/:id', function(req, res) {
	users_db.getDoc(req.params.id, function(err, doc) {
		console.log(doc);
		res.render('user', { locals: {user: doc}});
	});
});

app.post('/create', function(req, res) {
	if(!req.session.user_id) {

	}
	var user_id = req.session.user_id;
	users_db.getDoc(user_id, function(err, user) {
		if(!user.stories) user.stories = new Array();
		stories_db.saveDoc({
			'title': req.body.title, 
			'messages': [], 
			'text': null, 
			'user_id': user_id
		}, function(err, data) {
			var story_id = data.id;
			user.stories.push({'id': story_id, 'title': req.body.title});
			users_db.saveDoc(user_id, user, function(err, data) {
				res.redirect('/story/'+story_id);
			});
		});
	});
});

app.get('/story/:id', function(req, res) {
	console.log(req);
	res.send('hi');
});

app.listen(8080);

var socket = io.listen(app);
