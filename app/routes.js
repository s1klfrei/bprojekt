var mysql = require('mysql');
var unquote = require('unquote');

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

        if (req.user.username == "admin") {

            var users;
            console.log("================== Admin-Profile-Seite wird aufgerufen =================");
            connectionLoginDB.query('SELECT * FROM `users` WHERE username != "admin"', function(err, results){
    			if (err) {
                    console.log('Admin: Fehler beim Abfragen der UserList!', err);
                }
    			else {
                    console.log("UserListe abfragen");
                    users = results;
                }
                res.render('profile_admin.ejs', {
                    userList    : users
                });
    		});


        } else {

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


                    // ***************************************************************
                    // ***************************************************************
                    //
                    //  Hinzufuegen von KPIS:
                    //
                    //  1) KPI-Ergebnis-Variable deklarieren in Block ab Zeile 80 ca.
                    //  2) Query einfügen
                    //  3) KPI-Ergebnis-Variable in Query initialisieren
                    //  4) Variable in while-Schleife mit '(kpiX === undefined)' hinzufügen
                    //  5) Variable mit im render-Befehl übergeben
                    //
                    // ***************************************************************
                    // ***************************************************************

                    // Setup der verschiedenen KPI-Ergebnisse
                    var kpis = require('./kpi_queries.js');
                    // var years = kpis.getYearsData(connectionCustomerDB),
                    //     kpi1_1 = kpis.getKpiUmsatzProJahr(connectionCustomerDB),
                    //     kpi1_2 = kpis.getKpiUmsatzProMonat(connectionCustomerDB);
                    var kpi1_1,
                        years,
                        selectedYear,
                        kpi1_2,
                        kpi2,
                        kpi3,
                        kpi4,
                        kpi5_1,
                        kpi5_2,
                        kpi6,
                        numberTopProducts
                        ;

                    if (numberTopProducts === undefined) numberTopProducts = 10;
                    // else numberTopProducts = req.query.numberTopProducts;



                    // Helper: Jahre für Umsatz pro Monat --> Jahr einlesen!!
                    // RETURN: JSON mit verschiedenen Jahren, in denen Daten zur Verfügung stehen
                    connectionCustomerDB.query(
                        'SELECT YEAR(session_date) AS year \
                        FROM visitor \
                        GROUP BY year \
                        ORDER BY year DESC',
                        function(err, results) {
                            if (!err) {
                                years = results;
                                // set selectedYear to present year at the beginning
                                selectedYear = JSON.stringify(results[0].year);
                            }
                            else {
                                console.log('Error while performing Query YearsData.', err);
                            }
                        }
                    );

                    while (selectedYear === undefined) {
                    	deasync.runLoopOnce();
                    }


                    // KPI 1_1: Umsatz pro Jahr --> Jahr einlesen!!
                    // RETURN: Jahresumsatz als Zahl
                    connectionCustomerDB.query(
                        'SELECT SUM(item_total_order_value) AS umsatz \
                        FROM visitor \
                        WHERE YEAR(session_date) = ' + selectedYear,
                        function(err, results) {
                            if (!err) {
                                kpi1_1 = JSON.stringify(results[0].umsatz);
                            }
                            else {
                                console.log('Error while performing Query KPI 1_1 (Umsatz pro Jahr).', err);
                            }
                        }
                    );


                    // KPI 1_2: Umsatz pro Monat --> JAHR EINLESEN!!
                    // RETURN: JSON mit Monate und jeweiligem Umsatz (bis zu 12 Werte-Paare)
                    connectionCustomerDB.query(
                        'SELECT DATE_FORMAT(session_date, "%m/%Y")  AS monat, SUM(item_total_order_value) AS umsatz \
                        FROM visitor \
                        WHERE YEAR(session_date) = ' + selectedYear + '\
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
                        WHERE item_total_order_value != 0 AND YEAR(session_date) = ' + selectedYear + ' \
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

                    // KPI 4: Umsatz pro Stunde
                    // RETURN: JSON mit Stunden und jeweiligem Gesamtumsatz (bis zu 24 Werte-Paare)
                    connectionCustomerDB.query(
                        'SELECT a.stunde AS stunde, (a.umsatzProStunde / b.gesamtumsatz) AS umsatz \
                        FROM    ( \
                                SELECT HOUR(session_date) as stunde, SUM(item_total_order_value) AS umsatzProStunde \
                                FROM visitor \
                                GROUP BY HOUR(session_date) \
                                ) a, \
                                ( \
                                SELECT SUM(item_total_order_value) AS gesamtumsatz \
                                FROM visitor \
                                ) b',
                        function(err, results) {
                            if (!err){
                                kpi4 = results;
                            }
                            else {
                                console.log('Error while performing Query KPI 4 (Umsatz pro Stunde).', err);
                            }
                        }
                    );

                    // KPI 5_1: Durchschnittlicher Wert der Warenkörbe
                    // RETURN: Wert als Zahl
                    connectionCustomerDB.query(
                        'SELECT ROUND((AVG(item_total_add_to_basket_value) - AVG(item_total_rm_from_basket_value)),2) AS avg_wk \
                        FROM customer3.visitor',
                    	function(err, results) {
                            if (!err){
                                kpi5_1 = JSON.stringify(results[0].avg_wk);
                            }
                            else {
                                console.log('Error while performing Query KPI 5_1 (Durchschnittlicher Wert der Warenkörbe).', err);
                            }
                        }
                    );

                    // KPI 5_2: Rate nicht-bestellter Warenkörbe
                    // RETURN: Wert als Zahl
        			connectionCustomerDB.query(
                        'SELECT ROUND((1 - ordered.ANZAHL_BESTELLTER_WARENKOERBE / hinzugefuegt.ANZAHL_HINZUGEFUEGTER_WARENKOERBE),4)*100 AS rate_n_wk \
                        FROM    ( \
                                SELECT COUNT(DISTINCT session_id) AS ANZAHL_BESTELLTER_WARENKOERBE \
                                FROM tracking_events \
                                WHERE event_type = "ORDER_COMPLETE" \
                                ) ordered, \
                                ( \
                                SELECT COUNT(DISTINCT session_id) AS ANZAHL_HINZUGEFUEGTER_WARENKOERBE \
                                FROM tracking_events \
                                WHERE event_type = "BASKET_ADD" \
                                ) hinzugefuegt',
        				function(err, results) {
                            if (!err){
                                kpi5_2 = JSON.stringify(results[0].rate_n_wk);
                            }
                            else{
                                console.log('Error while performing Query KPI 5_2 (Rate nicht-bestellter Warenkörbe).', err);
                            }
                        }
                    );

                    // KPI 6: Top X Trending-Produkte der letzten 30 Tage --> TODO: aktuelles Datum: "2017-03-20" an 2 Stellen durch CURDATE() ersetzen
                    // RETURN: JSON mit 10 Produkten
                    connectionCustomerDB.query(
                        'SELECT vi.item_id, i.description AS description, SUM(vi.total_order_value) AS umsatz \
                        FROM    ( \
                                SELECT visitor_id as vid \
                                FROM tracking_events \
                                WHERE event_type = "ORDER_COMPLETE" AND DATEDIFF("2017-03-20",FROM_UNIXTIME(creation_timestamp)) < 31 AND DATEDIFF("2017-03-20",FROM_UNIXTIME(creation_timestamp)) >= 0 \
                                ) o, visitor_item vi, item i \
                        WHERE o.vid = vi.visitor_id AND vi.item_id = i.id \
                        GROUP BY vi.item_id \
                        ORDER BY SUM(vi.total_order_value) DESC \
                        LIMIT ' + numberTopProducts,
                        function(err, results) {
                            if (!err){
                                kpi6 = results;
                            }
                            else{
                                console.log('Error while performing Query KPI 6 (Top Trending-Produkte der letzten 30 Tage.', err);
                            }
                        }
                    );




                    while (years === undefined || kpi1_1 === undefined || kpi1_2 === undefined || kpi2 === undefined || kpi3 === undefined || kpi4 === undefined || kpi5_1 === undefined || kpi5_2 === undefined || kpi6 === undefined) {
                    	deasync.runLoopOnce();
                    }


            		res.render('profile.ejs', {
                        user        : req.user.username,
                        years_kpi1  : years,
                        result4_1   : kpi1_1,
                        result4_2   : kpi1_2,
                        result5     : kpi2,
                        result6     : kpi3,
                        result7     : kpi4,
                        result8_1   : kpi5_1,
                        result8_2   : kpi5_2,
                        result9     : kpi6
                    });

                    console.log("******" + req.query.year + "--" + req.query.numberTopProducts);

                });
        }
    });


    // =====================================
    // ChangeUser (nur Admins) =============
    // =====================================
    app.get('/changeUser', function(req, res) {

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
                    host            : unquote(JSON.stringify(selectedUserData[0].host)),
                    username_db     : unquote(JSON.stringify(selectedUserData[0].username_db)),
                    password_db     : unquote(JSON.stringify(selectedUserData[0].password_db)),
                    db              : unquote(JSON.stringify(selectedUserData[0].db))
                });
            }
        });
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
