
/**
 * Module dependencies.
 */

var express = require('express')
  , config = require('./config')
  , nconf = require('nconf')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , util = require('util')
  , winston = require('winston')
  , connect = require('connect')
  , cookie = require('cookie')
  , socketio = require("socket.io")
  , fs = require('fs')
  , flash = require('connect-flash')
  , passport = require('passport');



var MongoStore = require('connect-mongo')(express);
var sessionStore = new MongoStore({
  db: nconf.get('mongo_db')
});

/* configure logging */
require('winston-mongodb').MongoDB;
winston.add(winston.transports.MongoDB,{
  db: nconf.get('mongo_db')
});

var app = express();

app.configure(function(){
  app.set('port', nconf.get('port'));
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(nconf.get('session_secret')));
  app.use(express.session({ 
    secret: nconf.get('session_secret'),
    store: sessionStore,
    cookie: { maxAge: 60000}
  }));
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

routes.hook(app);

var server = http.createServer(app).listen(nconf.get('port'), function(){
  winston.info(util.format("Express server listening on port %s", nconf.get('port')));
});

var io = socketio.listen(server);

io.configure(function(){
  io.set('authorization', function(data, callback){
    var self = this;
    var sid = cookie.parse(connect.utils.parseSignedCookie(decodeURIComponent(data.headers.cookie)))['connect.sid'].split('.')[0].split(':')[1];
    sessionStore.get(sid
    , function(err, session){
      if(session && session.passport && session.passport.user && !err){
        self.session = session;
        callback(null, true);
      }
    });
  });
});
io.set('log level', nconf.get('socket_log_level'));
io.set('browser client minification', true);
io.set('transports', [nconf.get('transports')]);
io.sockets.on('connection', routes.io_connection);

var ga_file = util.format('%s/views/ga.jade', __dirname);
fs.exists(ga_file, function(exists){
  if(!exists){
    fs.writeFile(ga_file, '');
  }
});

