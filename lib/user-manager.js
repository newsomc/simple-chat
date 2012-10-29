var winston = require('winston'),
	emitter = require('events').EventEmitter,
	models = require('./../models'),
	util = require('util'),
	_ = require('underscore');

/* 
	'connect'
	'disconnect'
*/

/* User Manager */
var UserManager = function(){
	this.emitter = new emitter();
	this.client_map = {};
	this.initialize();
};

UserManager.prototype.add_us = function(err, us, user, client){

	console.log('Calling ADD USER Status!');
	var us = new models.UserStatus({
		user: user,
		client_id: client.id,
		displayName: user.displayName,
		status: 'active'
	});
	
	if(!this.client_map[user._id]){
		this.client_map[user._id] = [];
	}
	this.client_map[user._id].push(client.id)
	
	us.save();
};

UserManager.prototype.update_us = function(err, us, client){
	us.status = 'active';
	us.save();
};

UserManager.prototype.add_or_update_us = function(err, user, client){
	if(err){
		winston.error(util.format('Error: %s', err));
		return;
	}
	models.UserStatus.findOne({
		user: user._id
	}, function(err, us){
		if(err || !us){
			this.add_us(err, us, user, client);
			return;
		}
		this.update_us(err, us);
	}.bind(this));
};

UserManager.prototype.connect_user = function(client){
	var self = this;

	models.User.findOne({
		id: client.manager.session.passport.user.id
	}, function(err, user){
		self.add_or_update_us(err, user, client);
	});
};

UserManager.prototype.disconnect_user = function(client){
	models.UserStatus.findOne({
		client_id: client.id
	}, function(err, us){
		if(err || !us){
			winston.warn(util.format('No us found for client %s', client.id));
			return;
		}
		this.client_map[us.user] = _.reject(this.client_map[us.user], function(val){ 
			return val===client.id;
		});
		us.remove();
	}.bind(this));
};

UserManager.prototype.message = function(data, io){
	var i, message;
	
	for(i=0; i < this.client_map[data.to].length; i++){
		io.sockets[this.client_map[data.to][i]].emit('message', {
			from: data.from,
			message: data.message,
			displayName: data.fromDisplayName
		});
	}

	message = models.Message({
		chat: data.chat._id,
		author: data.from,
		message: data.message,
		displayName: data.fromDisplayName
	})
	message.save();
};

UserManager.prototype.listeners = function(){
	this.emitter.on('connect', this.connect_user.bind(this));
	this.emitter.on('disconnect', this.disconnect_user.bind(this));	
	this.emitter.on('message', this.message.bind(this));
};

UserManager.prototype.initialize = function(){
	models.UserStatus.remove(this.listeners.bind(this));
};

module.exports = new UserManager();