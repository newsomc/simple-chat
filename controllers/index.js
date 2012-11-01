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

module.exports.receive_users_working_status = function(req, res){
	var user = req.session.passport.user;
	var current_status = req.body.user.current_status;
	models.UserWorkingStatus.findOne({
		user: user
	}, function(err, us){
		if(err || !us){
			add_users_working_status(err, us, user, current_status);
			return;
		}
		update_users_working_status(err, us, current_status);
	}.bind(this));
	req.flash('info', 'Your status is %s', current_status);
	res.redirect('/');
};

var add_users_working_status = function(err, us, user, current_status){
	var uws = new models.UserWorkingStatus({
		user: user._id,
		currentlyWorkingOn: current_status
	});
	uws.save();
};

var update_users_working_status = function(err, us, current_status){
	if(!err){
		models.UserWorkingStatus.findOneAndUpdate({
			user: user_id
			}, { $set: {currentlyWorkingOn: current_status}}, { safe: true }, 
			function (err, foundDocument) {
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

module.exports.users_working_status_json = function(req, res){
	models.UserWorkingStatus
	.find({})
	.sort({ts: -1})
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