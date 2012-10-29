var models = require('./../models');

module.exports.me = function(req, res){
	res.send(req.session.passport.user);
};

module.exports.online_users = function(req, res){
	models.UserStatus
	.find({})
	.sort('displayName')
	.exec(function(err, docs){
		if(err){
			res.send({
				err: {
					type: 'global'
				}
			});
			return;
		}
		res.send(docs);
	});
};

var add_chat = function(me, other_user, cb){
	var chat = new models.Chat({
		user_1: me,
		user_2: other_user
	});
	chat.save(function(){
		cb({
			_id: chat._id,
			me: me,
			other_user: other_user,
			messages: []
		})
	});
};

var find_chat = function(me, other_user, cb){
	models.Chat.findOne({
		user_1: me,
		user_2: other_user
	}, function(err, chat){
		if(chat){
			cb(err, chat);
			return;
		}
		models.Chat.findOne({
			user_1: other_user,
			user_2: me
		}, cb);
	});
};

var find_or_create_chat = function(me, other_user, cb){
	find_chat(me, other_user, function(err, chat){
		if(err || !chat){
			add_chat(me, other_user, cb);
			return;
		}

		var before = new Date();
		before.setHours(before.getHours() - 4);

		models.Message.find({
			chat: chat,
			ts: {$gte: before}
		})
		.sort('ts')
		.exec(function(err, messages){
			cb({
				_id: chat._id,
				me: me,
				other_user: other_user,
				messages: messages
			});
		});

	});	
};

module.exports.find_chat = function(req, res){
	models.User.findById(req.params.user_id, function(err, other_user){
		if(err || !other_user){
			res.send({err: {
				type: 'global'
			}});
			return;
		}

		find_or_create_chat(req.session.passport.user._id, other_user, function(chat){
			res.send(chat);
		});
	});
};

module.exports.get_user_data = function(req, res){
	var username = req.session.passport.user;
	var firstName = username.name.givenName;
	var myWorkMessage = "Welcome, " + firstName + "! What are you working on today?";
	res.render('user-data', { testMessage: myWorkMessage});
};

module.exports.receive_user_status = function(req, res){

	var user = req.session.passport.user;
	var current_status = req.body.user.current_status;

	models.UserStatus.findOne({
		user: user
	}, function(err, us){
		if(err || !us){
			add_user_status(err, us, user, current_status);
			return;
		}

		update_user_status(err, us);
	}.bind(this));

	res.redirect('/');
};

var add_user_status = function(err, us, user, current_status){
	var us = new models.UserStatus({
		user: user._id,
		displayName: user.displayName,
		status: 'active',
		currentlyWorkingOn: current_status
	});
	us.save();
};

var update_user_status = function(err, us){
	if(!err){
		models.UserStatus.findOneAndUpdate({user: user_id}, {$set: {currentlyWorkingOn: current_status}}, {safe: true}, function (err, foundDocument) {
		    if (err){
		        console.log(err);
		        console.log('Error found',foundDocument);
		        res.status(500).send();
		        return;
		    }else{
		        console.log('Found document', foundDocument);
		        res.redirect('/');
		    }
		});
	}
};


