var mysql = require('mysql');
var unquote = require('unquote'); // helps to unquote Strings
var passwordHash = require('password-hash'); // helps to hash passwords
var deasync = require('deasync');// helps to synchronize queries


module.exports = function(app, passport, connectionLoginDB) {

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function(req, res) {
        res.render('index.ejs'); // load the index.ejs file
    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    app.get('/login', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage') });
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));


    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // protected by isLoggedIn-function
    app.get('/profile', isLoggedIn, function(req, res) {

        // if an admin tries to login, let him access the admin page
        if (req.user.username == "admin") {

            var users;

            // get all users and their data
            connectionLoginDB.query('SELECT * FROM `users` WHERE username != "admin"', function(err, results) {
    			if (err) {
                    console.log('Admin: Fehler beim Abfragen der UserList!', err);
                }
    			else {
                    users = results;
                }
    		});

            // wait for result of query
            while (users === undefined) {
                deasync.runLoopOnce();
            }

            // load the admin-page and pass the users and some flash messages
            res.render('profile_admin.ejs', {
                userList           : users,
                addUserMessage     : req.flash('addUserMessage'),
                deleteUserMessage  : req.flash('deleteUserMessage')
            });

        }
        // if a user tries to login, let him access the usual profile page
        else {

            var years,
                selectedYear,
                kpi1_1,
                kpi1_1_parametrized,
                kpi1_2,
                kpi1_2_parametrized = [],
                kpi3,
        		kpi3_1,
        		kpi4,
                kpi5_1,
                kpi5_2,
                kpi5_3,
                kpi6 = [],
                kpi6_parametrized = [],
                kpi7_1,
                kpi7_2,
                kpi7_3,
                numberTopProducts
                ;

                // ===================================
                // Variables for Parametrization =====
                // ===================================
                selectedYear = req.query.year; // set selectedYear to selected value on page
                // ---------- DELETE THIS if you have current data and uncomment next line
                if (selectedYear === undefined) selectedYear = 2017;
                // if (selectedYear === undefined) selectedYear = new Date().getFullYear(); // if no year is selected, set selectedYear-default to current year

                numberTopProducts = req.query.numberTopProducts; // set numberTopProducts to selected value on page
                if (numberTopProducts === undefined) numberTopProducts = 10; // if there's no selected value set default value to


                // get all the KPI-data and pass it to the profile-page
    			connectionLoginDB.query(
                    'SELECT years, kpi1_1, kpi1_2, kpi3, kpi3_1, kpi4, kpi5_1, kpi5_2, kpi5_3, kpi6, kpi7_1, kpi7_2, kpi7_3 \
    				FROM users \
                    WHERE username ="'+req.user.username+'"',
                    function(err, results) {

    					if (!err) {
                            // get all the KPI data from DC-DB
                            years   = JSON.parse(results[0].years);
                            kpi1_1  = JSON.parse(results[0].kpi1_1);
                            kpi1_2  = JSON.parse(results[0].kpi1_2);
                            kpi3    = JSON.parse(results[0].kpi3);
                            kpi3_1  = JSON.parse(results[0].kpi3_1);
                            kpi4    = JSON.parse(results[0].kpi4);
                            kpi5_1  = JSON.parse(results[0].kpi5_1);
                            kpi5_2  = JSON.parse(results[0].kpi5_2);
                            kpi5_3  = JSON.parse(results[0].kpi5_3);
                            kpi6    = JSON.parse(results[0].kpi6);
                            kpi7_1  = JSON.parse(results[0].kpi7_1);
                            kpi7_2  = JSON.parse(results[0].kpi7_2);
                            kpi7_3  = JSON.parse(results[0].kpi7_3);

                            // get the kpi1_1 data for the selected year
                            for (var i of kpi1_1) {
                                if (i.year == selectedYear) {
                                    kpi1_1_parametrized = i.umsatz;
                                    break;
                                }
                            }

                            // get the kpi1_2 data for the selected year
                            for (var i of kpi1_2) {
                                if (i.year == selectedYear) {
                                    kpi1_2_parametrized.push(i);
                                }
                            }

                            // get the kpi6 data for the selected numberTopProducts
                            for (var i = 0; i < numberTopProducts; i++) {
                                kpi6_parametrized.push(kpi6[i]);
                            }

                            // show profile-page and pass KPI data
    						res.render('profile.ejs', {
    							user                : req.user.username,
    							years_kpi1          : years,
    							result4_1           : kpi1_1_parametrized,
    							result4_2           : kpi1_2_parametrized,
    							result6             : kpi3,
    							result6_1 			: kpi3_1,
    							result7             : kpi4,
    							result8_1           : kpi5_1,
    							result8_2           : kpi5_2,
    							result8_3           : kpi5_3,
    							result9             : kpi6_parametrized,
    							result10_1          : kpi7_1,
    							result10_2          : kpi7_2,
    							result10_3          : kpi7_3,
    							numberTopProducts   : numberTopProducts,
    							year                : selectedYear
    						});
    					}
				});
            }
    });


    // =====================================
    // CHANGEUSER (only for Admins) ========
    // =====================================
    // protected by isLoggedInAdmin-function
    app.get('/changeUser', isLoggedInAdmin, function(req, res) {

        var selectedUserData;

        connectionLoginDB.query('SELECT * FROM `users` WHERE username = "' + req.query.username + '"', function(err, results){
            if (err) {
                console.log('Admin: Fehler beim Abfragen der UserData!', err);
            }
            else {
                selectedUserData = results;
                res.render('changeUser.ejs', {
                    selectedUser    : req.query.username,
                    username        : unquote(JSON.stringify(selectedUserData[0].username)),
                    password        : unquote(JSON.stringify(selectedUserData[0].password)),
                    host            : unquote(JSON.stringify(selectedUserData[0].host)),
                    username_db     : unquote(JSON.stringify(selectedUserData[0].username_db)),
                    password_db     : unquote(JSON.stringify(selectedUserData[0].password_db)),
                    db              : unquote(JSON.stringify(selectedUserData[0].db)),
                    message         : req.flash('changeUserMessage')
                });
            }
        });
    });

    app.post('/changeUser', function(req, res) {
        // if user is just to be changed, go on
        if (req.query.type === "change") {
            var actualPassword;
            // get current hashed password
            connectionLoginDB.query(' \
                SELECT password \
                FROM users \
                WHERE username = "' + req.query.username + '"', function(err, results){
                    if (err) {
                        console.log('Admin: Fehler beim Auslesen der UserData zum Vergleich vom Passwort!', err);
                    }
                    else {
                        actualPassword = results[0].password;
                    }
                // check whether password has been changed
                // if it hasn't, don't hash password and don't update it
                if (actualPassword === req.body.password && req.body.password === req.body.passwordConfirm) {
                    connectionLoginDB.query(' \
                        UPDATE users \
                        SET username = "'+req.body.username+'", host = "'+req.body.host+'", username_db = "'+req.body.username_db+'", password_db = "'+req.body.password_db+'", db = "'+req.body.db+'" \
                        WHERE username = "' + req.query.username + '"', function(err, results){
                            if (err) {
                                console.log('Admin: Fehler beim Updaten der UserData!', err);
                            }
                            else {
                                // show page again with success-flash-message
                                req.flash('changeUserMessage', 'Die Daten wurden erfolgreich geändert.');
                                res.redirect('/changeUser?username='+req.body.username);
                            }
                    });
                }
                // at least one of the password-fields has been changed
                else {
                    // if password has been changed & is identical in both fields, hash it and update it in the database
                    if (req.body.password === req.body.passwordConfirm) {
                        connectionLoginDB.query(' \
                            UPDATE users \
                            SET username = "'+req.body.username+'", password = "'+passwordHash.generate(req.body.password)+'", host = "'+req.body.host+'", username_db = "'+req.body.username_db+'", password_db = "'+req.body.password_db+'", db = "'+req.body.db+'" \
                            WHERE username = "' + req.query.username + '"', function(err, results){
                                if (err) {
                                    console.log('Admin: Fehler beim Updaten der UserData!', err);
                                }
                                else {
                                    // show page again with success-flash-message
                                    req.flash('changeUserMessage', 'Die Daten wurden erfolgreich geändert.');
                                    res.redirect('/changeUser?username='+req.body.username);
                                }
                        });
                    }
                    // if password has been changed & is NOT identical in both fields, load page again with failure-flash-message
                    else {
                        // show page again with failure-flash-message
                        req.flash('changeUserMessage', 'Das Passwort stimmt nicht überein.');
                        res.redirect('/changeUser?username='+req.body.username);
                    }
                }
            });
        }
        // if a user is to be deleted, go on
        else {
            connectionLoginDB.query(' \
                DELETE FROM users \
                WHERE username = "' + req.query.username + '"', function(err, results){
                    if (err) {
                        console.log('Admin: Fehler beim Löschen des Benutzers!', err);
                    }
                    else {
                        // show profile-page with success-flash-message
                        req.flash('deleteUserMessage', 'Der Nutzer "'+req.query.username+'" wurde erfolgreich aus der Datenbank entfernt.');
                        res.redirect('/profile');
                    }
            });
        }
    });


    // =====================================
    // ADDUSER (only Admins) =============
    // =====================================
    // protected by isLoggedInAdmin-function
    app.get('/addUser', isLoggedInAdmin, function(req, res) {

        res.render('addUser.ejs', {
            message     : req.flash('addUserMessage')
        });

    });

    app.post('/addUser', function(req, res) {

        // Check whether all field have been filled out and if so, go on
        if (req.body.username.length > 0 && req.body.password.length > 0 && req.body.passwordConfirm.length > 0 && req.body.host.length > 0 && req.body.username_db.length > 0 && req.body.password_db.length > 0 && req.body.db.length > 0) {
            // check whether username is already registered in DB
            connectionLoginDB.query(' \
                SELECT count(*) AS numberOfIdenticalUsers \
                FROM users \
                WHERE username = "'+req.body.username+'"',
                function(err, results){
                    if (err) {
                        console.log('Admin: Fehler beim Checken, ob Benutzername schon in LoginDB vorhanden ist (Hinzufügen eines neuen Benutzers).', err);
                    }
                    else {
                        // if username is still available, go on
                        if (results[0].numberOfIdenticalUsers == 0) {
                            // if passwords are identical, add new user
                            if (req.body.password === req.body.passwordConfirm) {
                                connectionLoginDB.query(' \
                                    INSERT INTO users \
                                    (`username`, `password`, `host`, `username_db`, `password_db`, `db`) VALUES \
                                    ("'+req.body.username+'","'+passwordHash.generate(req.body.password)+'", "'+req.body.host+'", "'+req.body.username_db+'", "'+req.body.password_db+'", "'+req.body.db+'")',
                                    function(err, results){
                                        if (err) {
                                            console.log('Admin: Fehler beim Hinzufügen eines neuen Benutzers zu der LoginDB.', err);
                                        }
                                        else {
                                            // show profile-page with success-flash-message
                                            req.flash('addUserMessage', 'Der neue Benutzer "'+req.body.username+'" wurde erfolgreich hinzugefügt.');
                                            res.redirect('/profile');
                                        }
                                });
                            }
                            // if passwords are NOT identical, show addUser-page again with failure-flash-message
                            else {
                                req.flash('addUserMessage', 'Die Passwörter stimmen nicht überein.');
                                res.redirect('/addUser');
                            }
                        }
                        // if username is NOT available, show addUser-page again with failure-flash-message
                        else {
                            req.flash('addUserMessage', 'Der Benutzername ist leider schon vergeben.');
                            res.redirect('/addUser');
                        }
                    }
            });
        }
        // if NOT all fields are filled out, show addUser-page again with failure-flash-message
        else {
            req.flash('addUserMessage', 'Es wurden nicht alle Felder ausgefüllt.');
            res.redirect('/addUser');
        }

    });


    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });


};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}

// route middleware to make sure an admin is logged in
function isLoggedInAdmin(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated() && req.user.username == "admin")
        return next();

    // if they aren't redirect them to the profile page
    res.redirect('/');
}
