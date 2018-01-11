var mysql = require('mysql');

module.exports = function(app, passport, connectionLoginDB) {

    // Wichtig für Synchronisierung der DB-Anfragen
    var deasync = require('deasync');

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function(req, res) {
        res.render('index.ejs'); // load the index.ejs file
    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
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
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/profile', isLoggedIn, function(req, res) {
        console.log("================== Jetzt kommen Daten =================");

		var selectString = 'SELECT * FROM users WHERE username = "' + req.user.username + '"';
		var connectionCustomerDB;

        // mit Kunden-DB verbinden
		connectionLoginDB.query(selectString, function(err, results) {

			connectionCustomerDB = mysql.createConnection({
			  host     : results[0].host,
			  user     : results[0].username_db,
			  password : results[0].password_db,
			  database : results[0].db
			});

    		connectionCustomerDB.connect();

            console.log(req.user.username + "hat die Verbindung zu seiner verknüpften Datenbank hergestellt.");

            // Setup der verschiedenen KPI-Ergebnisse
    		var res1;
    		var res2;
    		var res3;
    		var res4_1;
    		var res4_2;
    		var res5;
    		var res6;

    		/*
    		//testquery	1
    		connectionCustomerDB.query('SELECT description AS name, id AS age FROM item where id<10', function(err, results) {
    		  if (!err){
    			res1=results;
    		  }
    		  else{
    			console.log('Error while performing Query.', err);
    		  }
    		});

    		//testquery	2
    		connectionCustomerDB.query('SELECT session_date AS date, item_total_order_qty	AS close FROM visitor WHERE id<6606788 ORDER BY session_date ASC ', function(err, results) {
    		  if (!err){
    			res2=results;

    		  }
    		  else{
    			console.log('Error while performing Query.', err);
    		  }
    		});

    		//testquery	3
    		connectionCustomerDB.query('SELECT description AS age, total_order_qty AS population FROM item WHERE id<9 AND id>1 ', function(err, results) {
    		  if (!err){
    			res3=results;
    		  }
    		  else{
    			console.log('Error while performing Query.', err);
    		  }
    		});

            */

            //Umsatz pro Jahr --> Jahr einlesen!!
    		connectionCustomerDB.query('SELECT SUM(item_total_order_value) AS umsatz'+
    			' FROM visitor WHERE YEAR(session_date)=2017',
    			function(err, results) {
            		if (!err) {
            			res4_1 = JSON.stringify(results[0].umsatz);
            		}
            		else {
            			console.log('Error while performing Query.', err);
            		}
    		});

    		// Umsatz pro Monat --> JAHR EINLESEN!!
    		connectionCustomerDB.query('SELECT MONTHNAME(session_date)  AS monat,'+
                ' SUM(item_total_order_value) AS umsatz'+
    			' FROM visitor WHERE YEAR(session_date) = 2017'+
    			' GROUP BY YEAR(session_date), MONTHNAME(session_date)',
    			function(err, results) {
                    if (!err) {
                        res4_2 = results;
            		}
            		else {
            			console.log('Error while performing Query.', err);
            		}
    		});

    		// Durchschnittliche Bestellsumme pro Monat --> JAHR EINLESEN!!
    		connectionCustomerDB.query('SELECT MONTHNAME(session_date) as monat,'+
    		' AVG(item_total_order_value) AS avg_bestellsumme'+
    		' FROM visitor WHERE item_total_order_value != 0'+
    		' AND YEAR(session_date) = 2017'+
    		' GROUP BY YEAR(session_date), MONTHNAME(session_date)',
            function (err, results) {
        		  if (!err) {
        			res5 = results;
        		  }
        		  else {
        			console.log('Error while performing Query.', err);
        		  }
    		});

            // Auf KPI-Query-Ergebnisse warten
    		while (res4_1 === undefined || res4_2 === undefined || res5 === undefined) {
    			deasync.runLoopOnce();
    		}

    		res.render('profile.ejs', {
                user        : req.user.username,
                result4_1   : res4_1,
                result4_2   : res4_2,
                result5     : res5
            });

        });
    });
//////////////////////////////////////////////////////////////


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
