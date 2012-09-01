var winston = require('winston'),
	util = require('util'),
	UsersHook = require('./hooks/users-hook');


/* All Hooks */
var Hooks = {};
Hooks.users = new UsersHook();

/* Hook Manager */
var HookManager = function(){
	this.clients = {};
};

HookManager.prototype.io_hook = function(hook, client){
	try{
		Hooks[hook].add_client(client);

		if(!this.clients[client.id]){
			this.clients[client.id] = [];
		}
		this.clients[client.id].push(hook);
	}catch(err){
		winston.warn(util.format('Failed hooking into %', hook));
	}
};

HookManager.prototype.remove_client = function(client){
	if(!this.clients[client.id]){ return; }

	var i;
	for(i=0; i<this.clients[client.id]; i++){
		Hooks[this.clients[client.id][i].hook].remove_client(client);
	}
};

module.exports = new HookManager();