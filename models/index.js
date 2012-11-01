var C = require('./../config'),
	nconf = require('nconf'),
	mongoose = require('mongoose'),
	util = require('util'),
	Schema = mongoose.Schema;

mongoose.connect(util.format('mongodb://%s:%s/%s', nconf.get('mongo_host'), nconf.get('mongo_port'), nconf.get('mongo_db')));

var User = new Schema({
	id: {type: String, unique: true},
	familyName: String,
	givenName: String,
	displayName: String,
	emails: []
});
module.exports.User = mongoose.model('User', User);

var Chat = new Schema({
	user_1: mongoose.Schema.Types.ObjectId,
	user_2: mongoose.Schema.Types.ObjectId
});
module.exports.Chat = mongoose.model('Chat', Chat);

var Message = new Schema({
	chat: mongoose.Schema.Types.ObjectId, 
	ts: {type: Date, default: Date.now},
	author: mongoose.Schema.Types.ObjectId,
	displayName: String,
	message: String
});
module.exports.Message = mongoose.model('Message', Message);

var UserStatus = new Schema({
	user: mongoose.Schema.Types.ObjectId,
	displayName: String,
	client_id: String,
	status: String
});
module.exports.UserStatus = mongoose.model('UserStatus', UserStatus);

var UserWorkingStatus = new Schema({
	user: mongoose.Schema.Types.ObjectId,
	ts: {type: Date, default: Date.now},
	currentlyWorkingOn: String
});
module.exports.UserWorkingStatus = mongoose.model('UserWorkingStatus', UserWorkingStatus);