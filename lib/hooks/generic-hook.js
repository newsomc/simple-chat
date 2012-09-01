var GenericHook = function(){};
GenericHook.prototype.ctor = function(){
	this.client_map = {};
	this.listen();
};
GenericHook.prototype.add_client = function(client){
	this.client_map[client.id] = client;
	this.send_to_client(client);
};
GenericHook.prototype.remove_client = function(client){
	delete this.client_map[client.id];
};
GenericHook.prototype.send = function(data){
	var k;
	
	for(k in this.client_map){
		if(this.client_map.hasOwnProperty(k)){
			this.send_to_client(this.client_map[k], data);
		}
	}
}
GenericHook.prototype.listen = function(){};
GenericHook.prototype.send_to_client = function(client, data){};

module.exports = GenericHook;