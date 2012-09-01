var util = require('util')
	, nconf = require('nconf')
	, passport = require('passport')
	, models = require('./../models')
	, controllers = require('./../controllers')
	, GoogleStrategy = require('passport-google').Strategy
	, HookManager = require('./../lib/hook-manager')
	, UserManager = require('./../lib/user-manager');

/* Socket Routes */
exports.io_connection = function(client){
	var io = this;

	client.on('hook', function(hook) {
		UserManager.emitter.emit('connect', client);
		HookManager.io_hook(hook, client);
	});

	client.on('message', function(data){
		UserManager.emitter.emit('message', data, io);
	});

	client.on('disconnect', function(){
		UserManager.emitter.emit('disconnect', client);
	});
};

/* HTTP Routes */

exports.hook = function(app){
	app.get('/', ensureAuthenticated, function(req, res){
		res.render('index');
	});

	/* Data */
	app.get('/me.json', ensureAuthenticated, controllers.me);
	app.get('/find-chat/:user_id.json', ensureAuthenticated, controllers.find_chat);
	app.get('/online-users.json', ensureAuthenticated, controllers.online_users);

	/* Passport Routes */
	app.get('/auth/google', passport.authenticate('google'));
	app.get('/auth/google/return', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' }));
	app.get('/logout', function(req, res){ req.logOut(); res.redirect('/login'); });
	app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login' }) );
	app.get('/login', function(req, res){ res.render('login'); });
};

var find_or_create_user = function(identifier, profile, cb){
	models.User.findOne({id: identifier}, function(err, user){
		if(err){ winston.warn(JSON.stringify(err, null, '  ')); }

		profile.id = identifier;

		if(!user){
			var user = new models.User();
			user.familyName = profile.familyName;
			user.displayName = profile.displayName;
			user.givenName = profile.givenName;
			user.emails = profile.emails
			user.id = identifier;
			user.save(cb);
		}else{
			cb(err, user);
		}
	});
};

var auth = function(identifier, profile, done) {
	find_or_create_user(identifier, profile, function(err, user){
		profile._id = user._id;
		if(err){ winston.warn(JSON.stringify(err, null, '  ')); }
		done(err, profile);
	});
};


/* Passport Config */
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GoogleStrategy({ returnURL: util.format('%s/auth/google/return', nconf.get('url')), realm: util.format('%s/', nconf.get('url')) }, auth));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
};