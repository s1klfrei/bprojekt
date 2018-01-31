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

        console.log("================== Profile-Seite wird aufgerufen =================");

		var connectionCustomerDB;

        // mit Kunden-DB verbinden
		connectionLoginDB.query('SELECT * FROM users WHERE username = "' + req.user.username + '"', function(err, results) {

			connectionCustomerDB = mysql.createConnection({
			  host     : results[0].host,
			  user     : results[0].username_db,
			  password : results[0].password_db,
			  database : results[0].db
			});

    		connectionCustomerDB.connect();

            console.log("'" + req.user.username + "'" + " hat die Verbindung zu seiner verknüpften Datenbank hergestellt.");

            // Setup der verschiedenen KPI-Ergebnisse
            var kpis = require('./kpi_queries.js');
            // var years = kpis.getYearsData(connectionCustomerDB),
            //     kpi1_1 = kpis.getKpiUmsatzProJahr(connectionCustomerDB),
            //     kpi1_2 = kpis.getKpiUmsatzProMonat(connectionCustomerDB);
            var kpi1_1,
                years,
                kpi1_2,
                kpi2,
                kpi3,
                kpi4
                ;


/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////

                                                // KPI 1_1: Umsatz pro Jahr --> Jahr einlesen!!
                                                // RETURN: Jahresumsatz als Zahl
                                                connectionCustomerDB.query(
                                                    'SELECT SUM(item_total_order_value) AS umsatz \
                                                    FROM visitor \
                                                    WHERE YEAR(session_date) = 2017',
                                                    function(err, results) {
                                                        if (!err) {
                                                            kpi1_1 = JSON.stringify(results[0].umsatz);
                                                        }
                                                        else {
                                                            console.log('Error while performing Query KPI 1_1 (Umsatz pro Jahr).', err);
                                                        }
                                                    }
                                                );

                                                // Helper: Jahre für Umsatz pro Monat --> Jahr einlesen!!
                                                // RETURN: JSON mit verschiedenen Jahren, in denen Daten zur Verfügung stehen
                                                connectionCustomerDB.query(
                                                    'SELECT YEAR(session_date) AS year \
                                                    FROM visitor \
                                                    GROUP BY year',
                                                    function(err, results) {
                                                        if (!err) {
                                                            years = results;
                                                        }
                                                        else {
                                                            console.log('Error while performing Query YearsData.', err);
                                                        }
                                                    }
                                                );


                                                // KPI 1_2: Umsatz pro Monat --> JAHR EINLESEN!!
                                                // RETURN: JSON mit Monate und jeweiligem Umsatz (bis zu 12 Werte-Paare)
                                                connectionCustomerDB.query(
                                                    'SELECT DATE_FORMAT(session_date, "%m/%Y")  AS monat, SUM(item_total_order_value) AS umsatz \
                                                    FROM visitor \
                                                    WHERE YEAR(session_date) = (SELECT MAX(YEAR(session_date)) FROM visitor) \
                                                    GROUP BY YEAR(session_date), DATE_FORMAT(session_date, "%m/%Y") \
                                                    ORDER BY ANY_VALUE(session_date) DESC',
                                                    function(err, results) {
                                                        if (!err) {
                                                            kpi1_2 = results;
                                                        }
                                                        else {
                                                            console.log('Error while performing Query KPI 1_2 (Umsatz pro Monat).', err);
                                                        }
                                                    }
                                                );


                                                // KPI 2: Durchschnittliche Bestellsumme --> JAHR EINLESEN!!
                                                // RETURN: JSON mit Monate und jeweiliger durchschnittlichen Bestellsumme (bis zu 12 Werte-Paare)
                                                connectionCustomerDB.query(
                                                    'SELECT DATE_FORMAT(session_date, "%m/%Y") as monat, AVG(item_total_order_value) AS avg_bestellsumme \
                                                    FROM visitor \
                                                    WHERE item_total_order_value != 0 AND YEAR(session_date) = 2017 \
                                                    GROUP BY DATE_FORMAT(session_date, "%m/%Y") \
                                                    ORDER BY ANY_VALUE(session_date) DESC',
                                        			function(err, results) {
                                                		if (!err){
                                                            kpi2 = results;
                                                		}
                                            			else {
                                                            console.log('Error while performing Query KPI 2 (Durchschnittliche Bestellsumme).', err);
                                            			}
                                                    }
                                                );

                                                // KPI 3: Conversionrate in absoluten Zahlen pro Monat
                                                // RETURN: JSON mit Monate und Conversionrate pro Monat (bis zu 12 Werte-Paare)
                                                connectionCustomerDB.query(
                                                    'SELECT o.monat, o.anzahl_orders, v.anzahl_visitor \
                                                    FROM    ( \
                                                            SELECT COUNT(*) AS anzahl_orders, \
                                                            DATE_FORMAT(FROM_UNIXTIME(creation_timestamp), "%m/%Y") AS monat \
                                                            FROM tracking_events \
                                        					WHERE event_type = "ORDER_COMPLETE" \
                                                            GROUP BY DATE_FORMAT(FROM_UNIXTIME(creation_timestamp), "%m/%Y") \
                                                            ORDER BY ANY_VALUE(FROM_UNIXTIME(creation_timestamp)) DESC \
                                                            ) o, \
                                                            ( \
                                                            SELECT COUNT(*) AS anzahl_visitor, DATE_FORMAT(session_date, "%m/%Y") AS monat \
                                                            FROM visitor \
                                                            GROUP BY DATE_FORMAT(session_date, "%m/%Y") \
                                                            ORDER BY ANY_VALUE(session_date) DESC \
                                                            ) v \
                                                    WHERE o.monat = v.monat;',
                                                    function(err, results) {
                                                        if (!err){
                                                            kpi3 = results;
                                                        }
                                                        else{
                                            				console.log('Error while performing Query KPI 3 (Conversionrate pro Monat).', err);
                                                        }
                                                    }
                                                );

                                                // KPI 4: Umsatz pro Stunde als Gesamtsumme
                                                // RETURN: JSON mit Stunden und jeweiligem Gesamtumsatz (bis zu 24 Werte-Paare)
                                                connectionCustomerDB.query(
                                                    'SELECT HOUR(session_date) as stunde, SUM(item_total_order_value) AS umsatz \
                                                    FROM visitor \
                                                    GROUP BY HOUR(session_date);',
                                                    function(err, results) {
                                                        if (!err){
                                                            kpi4 = results;
                                                        }
                                                        else{
                                                            console.log('Error while performing Query KPI 4 (Umsatz pro Stunde als Gesamtsumme).', err);
                                                        }
                                                    }
                                                );


/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////


            while (years === undefined || kpi1_1 === undefined || kpi1_2 === undefined || kpi2 === undefined || kpi3 === undefined || kpi4 === undefined) {
            	deasync.runLoopOnce();
            }

    		res.render('profile.ejs', {

                user        : req.user.username,
                years_kpi1  : years,
                result4_1   : kpi1_1,
                result4_2   : kpi1_2,
                result5     : kpi2,
                result6     : kpi3,
                result7     : kpi4
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
