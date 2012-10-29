var nconf = require('nconf');

nconf.argv().env().file({file: './config/production.json'});

nconf.defaults({
	mongo_port: '27017',
	mongo_host: 'localhost',
	mongo_db: 'Chat',
	port: 8086,
	url: 'http://10.0.1.5:8086',
	//url: 'http://10.176.32.135:8086',
	session_secret: "goes-in-production.json",
	socket_log_level: 3,
	transports: 'websocket'
});