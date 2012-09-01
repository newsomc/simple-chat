var GenericHook = require('./generic-hook'),
	user_manager = require('./../user-manager');


var UsersHook = function(){
	this.ctor();
};

UsersHook.prototype = GenericHook.prototype;

UsersHook.prototype.send_to_client = function(client, data){
	if(data){ client.emit(data.type, data); }
};

UsersHook.prototype.listen = function(){
	var self = this;

	user_manager.emitter.on('connect', function(data){
		self.send({
			type: 'connect',
			user: data.manager.session.passport.user
		});
	});

	user_manager.emitter.on('disconnect', function(data){
		self.remove_client(data);
		self.send({
			type: 'disconnect',
			user: data.manager.session.passport.user
		});
	});
};

module.exports = UsersHook;