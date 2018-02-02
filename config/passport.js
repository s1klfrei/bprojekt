// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
var passwordHash = require('password-hash');

var mysql = require('mysql');

// expose this function to our app using module.exports
module.exports = function(passport, connectionLoginDB) {

	// =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        connectionLoginDB.query("select * from users where id = '" + id + "'", function(err, rows){
			  done(err, rows[0]);
		});
    });


    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) { // callback with username and password from our form

        connectionLoginDB.query("SELECT * FROM `users` WHERE `username` = '" + username + "'", function(err, rows){

			if (err) {
                console.log("Fehler beim Verbinden mit der Login-DB!");
                return done(err);
            }
			if ((!rows.length) || !(passwordHash.verify(password, rows[0].password))) {
                return done(null, false, req.flash('loginMessage', 'Der Benutzername oder das Passwort sind falsch. Bitte versuche dich erneut anzumelden.')); // create the loginMessage and save it to session as flashdata
            }
            // all is well, return successful user
            console.log("Neuer Benutzer eingeloggt: %s", username);
            return done(null, rows[0]);
		});
    }));

};
