// server.js

// set up ======================================================================
// get all the tools we need
var express  = require('express');
var app      = express();
var port     = process.env.PORT || 8080;
var mysql    = require('mysql');
var passport = require('passport');
var flash    = require('connect-flash');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');

var connectionLoginDB = require('./config/database.js');


// Datenbank-Konfiguration ===============================================================
// DB-Verbindung aufbauen
connectionLoginDB.connect(function(err) {
  if (err) throw err;
  console.log("----------- Successfully Connected to Database -----------");
});

// Datenbank-Error handler
connectionLoginDB.on('close', function(err) {
  if (err) {
    // Oops! Unexpected closing of connection, lets reconnect back.
    connectionLoginDB = mysql.createConnection(connectionLoginDB.config);
  } else {
    console.log('Connection closed normally.');
  }
});

require('./config/passport')(passport, connectionLoginDB); // pass passport for configuration

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
// get information from html forms
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(session({
  secret: 'ilovedynamiccommerce', // encryption
  resave: true, 					// These two that no warnings appear
  saveUninitialized: true //
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// routes ======================================================================
require('./sql_queries/kpi_queries.js')(connectionLoginDB);
require('./app/routes.js')(app, passport, connectionLoginDB); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);
