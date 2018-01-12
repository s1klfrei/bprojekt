// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;

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
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
	  // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) {
        var generateHash = function(password) {
            return bCrypt.hashSync(password, bCrypt.genSaltSync(8), null);
        };

		// find a user whose email is the same as the forms email
		// we are checking to see if the user trying to login already exists
        connectionLoginDB.query("select * from users where username = '" + username + "'", function(err,rows){
			console.log(rows);
			if (err)
                return done(err);
			if (rows.length) {
                return done(null, false, req.flash('signupMessage', 'Der Benutzername ist leider schon vergeben. Bitte wählen Sie einen anderen.'));
            } else {

				// if there is no user with that username
                // create the user
                var newUserMysql = new Object();

				newUserMysql.username = username;
                newUserMysql.password = password; // use the generateHash function

				var insertQuery = "INSERT INTO users ( username, password ) values ('" + username + "','" + password + "')";
				console.log("Neuer User hinzugefuegt: %s, mit Passwort: %s", username, password);
				connectionLoginDB.query(insertQuery,function(err,rows) {
                    newUserMysql.id = rows.insertId;
				    return done(null, newUserMysql);
				});
            }
		});
    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
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
			if (!rows.length) {
                return done(null, false, req.flash('loginMessage', 'Der Benutzername existiert nicht.')); // req.flash is the way to set flashdata using connect-flash
            }
			// if the user is found but the password is wrong
            if (!( rows[0].password == password)) {
                return done(null, false, req.flash('loginMessage', 'Das Passwort ist falsch. Bitte versuche dich erneut anzumelden.')); // create the loginMessage and save it to session as flashdata
            }
            // all is well, return successful user
            console.log("Neuer Benutzer eingeloggt: %s", username);
            return done(null, rows[0]);
		});
    }));

};
