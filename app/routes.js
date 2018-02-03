var mysql = require('mysql');
var unquote = require('unquote');
var passwordHash = require('password-hash');

module.exports = function(app, passport, connectionLoginDB) {

    // Wichtig für Synchronisierung der DB-Anfragen
    var deasync = require('deasync');

    // Setup der verschiedenen KPI-Ergebnisse

    var kpi1_1,
        years,
        selectedYear,
        leastSelectedYear,
        kpi1_2,
        kpi2,
        kpi3, // nach jahr beliebigem jahr noch selecten!!!
        kpi4,
        kpi5_1,
        kpi5_2,
        kpi5_3,
        kpi6 = [],
        kpi7_1,
        kpi7_2,
        kpi7_3,
        numberTopProducts
        ;

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
    // PROFILE SECTION =====================
    // =====================================
    // Geschützt durch isLoggedIn-Funktion
    app.get('/profile', isLoggedIn, function(req, res) {

        // Wenn der Admin daruaf zugreift, leite ihn zur profileAdmin-Seite weiter
        if (req.user.username == "admin") {

            var users;
            connectionLoginDB.query('SELECT * FROM `users` WHERE username != "admin"', function(err, results){
    			if (err) {
                    console.log('Admin: Fehler beim Abfragen der UserList!', err);
                }
    			else {
                    console.log("UserListe abfragen");
                    users = results;
                }
                res.render('profile_admin.ejs', {
                    userList           : users,
                    addUserMessage     : req.flash('addUserMessage'),
                    deleteUserMessage  : req.flash('deleteUserMessage')
                });
    		});


        }
        // Wenn normaler User, fahre fort
        else {

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

                    // Setze Abfrage-Jahr auf ausgewähltes Jahr
                    selectedYear = req.query.year;

                    // Wenn Kein Jahr von Seite ausgewählt wurde (Default), dann gebe Höchstes Jahr der Daten zurück
                    if (selectedYear === undefined) {
                        // Helper: Höchstes Jahr der Daten abfragen
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
                                    leastSelectedYear = selectedYear;
                                }
                                else {
                                    console.log('Error while performing Query YearsData.', err);
                                }
                            }
                        );

                        // Warte auf Ergebnis der Query
                        while (selectedYear === undefined) {
                        	deasync.runLoopOnce();
                        }
                    }
                    // Wurde Jahr geändert, rufe Queries neu auf
                    else {
                        kpi1_1 = undefined;
                        kpi1_2 = undefined;
                        kpi2   = undefined;
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


                    // KPI 1_2: Umsatz pro Monat in ausgewähltem Jahr
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

                    // KPI 2: Ze
                    // RETURN: JSON mit Monate und jeweiligem Umsatz (bis zu 12 Werte-Paare)


                    // KPI 3: Conversionrate in absoluten Zahlen pro Monat
                    // RETURN: JSON mit Monate und Conversionrate pro Monat (bis zu 12 Werte-Paare)
                    // connectionCustomerDB.query(
                    //     'SELECT o.monat, o.anzahl_orders, v.anzahl_visitor, \
                    //     FROM    ( \
                    //             SELECT COUNT(*) AS anzahl_orders, \
                    //             DATE_FORMAT(FROM_UNIXTIME(creation_timestamp), "%m/%Y") AS monat \
                    //             FROM tracking_events \
            		// 			WHERE event_type = "ORDER_COMPLETE" \
                    //             GROUP BY DATE_FORMAT(FROM_UNIXTIME(creation_timestamp), "%m/%Y") \
                    //             ORDER BY ANY_VALUE(FROM_UNIXTIME(creation_timestamp)) DESC \
                    //             ) o, \
                    //             ( \
                    //             SELECT COUNT(*) AS anzahl_visitor, DATE_FORMAT(session_date, "%m/%Y") AS monat \
                    //             FROM visitor \
                    //             GROUP BY DATE_FORMAT(session_date, "%m/%Y") \
                    //             ORDER BY ANY_VALUE(session_date) DESC \
                    //             ) v \
                    //     WHERE o.monat = v.monat',
                    //     function(err, results) {
                    //         if (!err){
                    //             kpi3 = results;
                    //         }
                    //         else{
                	// 			console.log('Error while performing Query KPI 3 (Conversionrate pro Monat).', err);
                    //         }
                    //     }
                    // );

                    // KPI 4: Umsatz pro Stunde
                    // RETURN: JSON mit Stunden und jeweiligem Gesamtumsatz (bis zu 24 Werte-Paare)
                    // connectionCustomerDB.query(
                        // 'SELECT a.stunde AS stunde, (a.umsatzProStunde / b.gesamtumsatz * 100) AS umsatz \
                        // FROM    ( \
                                // SELECT HOUR(session_date) as stunde, SUM(item_total_order_value) AS umsatzProStunde \
                                // FROM visitor \
                                // GROUP BY HOUR(session_date) \
                                // ) a, \
                                // ( \
                                // SELECT SUM(item_total_order_value) AS gesamtumsatz \
                                // FROM visitor \
                                // ) b',
                        // function(err, results) {
                            // if (!err){
                                // kpi4 = results;
                            // }
                            // else {
                                // console.log('Error while performing Query KPI 4 (Umsatz pro Stunde).', err);
                            // }
                        // }
                    // );

                    // KPI 5_1: Durchschnittlicher Wert der Warenkörbe
                    // RETURN: Wert als Zahl gerundet auf 2 Nachkommastellen
                    // connectionCustomerDB.query(
                        // 'SELECT ROUND((AVG(item_total_add_to_basket_value) - AVG(item_total_rm_from_basket_value)),2) AS avg_wk \
                        // FROM visitor \
                        // WHERE item_total_add_to_basket_value > 0',
                    	// function(err, results) {
                            // if (!err){
                                // kpi5_1 = JSON.stringify(results[0].avg_wk);
                            // }
                            // else {
                                // console.log('Error while performing Query KPI 5_1 (Durchschnittlicher Wert der Warenkörbe).', err);
                            // }
                        // }
                    // );

                    // KPI 5_2: Rate nicht-bestellter Warenkörbe
                    // RETURN: Wert als Zahl gerundet auf 1 Nachkommastelle
        			// connectionCustomerDB.query(
                        // 'SELECT ROUND((1 - ordered.ANZAHL_BESTELLTER_WARENKOERBE / hinzugefuegt.ANZAHL_HINZUGEFUEGTER_WARENKOERBE),3)*100 AS rate_n_wk \
                        // FROM    ( \
                                // SELECT COUNT(DISTINCT session_id) AS ANZAHL_BESTELLTER_WARENKOERBE \
                                // FROM tracking_events \
                                // WHERE event_type = "ORDER_COMPLETE" \
                                // ) ordered, \
                                // ( \
                                // SELECT COUNT(DISTINCT session_id) AS ANZAHL_HINZUGEFUEGTER_WARENKOERBE \
                                // FROM tracking_events \
                                // WHERE event_type = "BASKET_ADD" \
                                // ) hinzugefuegt',
        				// function(err, results) {
                            // if (!err){
                                // kpi5_2 = JSON.stringify(results[0].rate_n_wk);
                            // }
                            // else{
                                // console.log('Error while performing Query KPI 5_2 (Rate nicht-bestellter Warenkörbe).', err);
                            // }
                        // }
                    // );

                    // KPI 5_3: Durchschnittliche Bestellsumme
                    // RETURN: Wert als Zahl gerundet auf 2 Nachkommastellen
                    // connectionCustomerDB.query(
                        // 'SELECT ROUND(AVG(a.item_total_order_value), 2) AS Bestellsumme_AVG \
                        // FROM    ( \
                                // SELECT item_total_order_value \
                                // FROM visitor \
                                // WHERE item_total_order_value > 0 \
                                // ) a',
            			// function(err, results) {
                    		// if (!err){
                                // kpi5_3 = JSON.stringify(results[0].Bestellsumme_AVG);
                    		// }
                			// else {
                                // console.log('Error while performing Query KPI 5_3 (Durchschnittliche Bestellsumme).', err);
                			// }
                        // }
                    // );

                    // Setze numberTopProducts auf ausgewählten Wert
                    numberTopProducts = req.query.numberTopProducts;
					if (numberTopProducts === undefined) {
						numberTopProducts = 10;
					}
                    // KPI 6: Top X BESTSELLER
                    // RETURN: JSON mit 10 Produkten
                    // Rufe Query standardmäßig mit 10 Produkten auf, wenn nichts ausgewählt wurde
                    // if (numberTopProducts === undefined) {
                        // numberTopProducts = 10;
                        // connectionCustomerDB.query(
                            // 'SELECT vi.item_id, i.description AS Beschreibung, SUM(vi.total_order_qty) AS Anzahl \
                            // FROM    ( \
                                    // SELECT visitor_id as vid \
                                    // FROM tracking_events \
                                    // WHERE event_type = "ORDER_COMPLETE" \
                                    // ) o, visitor_item vi, item i \
                            // WHERE o.vid = vi.visitor_id AND vi.item_id = i.id \
                            // GROUP BY vi.item_id \
                            // ORDER BY SUM(vi.total_order_qty) DESC \
                            // LIMIT ' + numberTopProducts,
                            // function(err, results) {
                                // if (!err){

                                    // kpi6 = results;

                                // }
                                // else {
                                    // console.log('Error while performing Query KPI 6 (Top 10 Bestseller).', err);
                                // }
                            // }
                        // );
                    // }
                    // Rufe Query mit X Produkten auf, falls auf Webseite Button geändert wurde
                    // else {
                        // kpi6 = undefined;
                        // console.log("______________________: " + numberTopProducts);
                        // connectionCustomerDB.query(
                            // 'SELECT vi.item_id, i.description AS Beschreibung, SUM(vi.total_order_qty) AS Anzahl \
                            // FROM    ( \
                                    // SELECT visitor_id as vid \
                                    // FROM tracking_events \
                                    // WHERE event_type = "ORDER_COMPLETE" \
                                    // ) o, visitor_item vi, item i \
                            // WHERE o.vid = vi.visitor_id AND vi.item_id = i.id \
                            // GROUP BY vi.item_id \
                            // ORDER BY SUM(vi.total_order_qty) DESC \
                            // LIMIT ' + numberTopProducts,
                            // function(err, results) {
                                // if (!err){
                                    // kpi6 = results;
                                    // console.log("result9: " + kpi6);
                                // }
                                // else {
                                    // console.log('Error while performing Query KPI 6 (Top X Bestseller).', err);
                                // }
                            // }
                        // );
                    // }


                    // KPI 7_1: Durchschnittliche Zeit auf Seite
                    // RETURN: Wert als Zahl
        			// connectionCustomerDB.query(
                        // 'SELECT ROUND(AVG(JSON_EXTRACT(event_data,"$.active_page_view_time")), 1) AS average_page_view_time \
                        // FROM tracking_events \
                        // WHERE event_type = "PAGEVIEW_COMPLETE"',
        				// function(err, results) {
                            // if (!err){
                                // kpi7_1 = JSON.stringify(results[0].average_page_view_time);
                                // console.log("ZEIT: " + kpi7_1);
                            // }
                            // else{
                                // console.log('Error while performing Query KPI 7_1 (Durchschnittliche Zeit auf Seite).');
                            // }
                        // }
                    // );

                    // KPI 7_2: Durchschnittliche Zeit bis zum Kauf #SCHWELLWERT: unter 4 Stunden
                    // RETURN: Wert als Zahl
                    // connectionCustomerDB.query(
                        // 'SELECT ROUND((AVG(max.ende - min.anfang) / 60), 0) AS durchschnittliche_zeit_bis_kauf \
                    	// FROM ( \
                            // SELECT session_id, MIN(creation_timestamp) AS anfang \
                    	    // FROM tracking_events \
                    	    // GROUP BY session_id \
                             // ) min, \
                    		// ( \
                            // SELECT session_id, MAX(creation_timestamp) AS ende \
                    		// FROM tracking_events \
                    		// WHERE event_type = "ORDER_COMPLETE" \
                    		// GROUP BY session_id \
                            // ) max \
                    	// WHERE min.session_id = max.session_id AND (max.ende - min.anfang) < 14400',
        				// function(err, results) {
                            // if (!err){
                                // kpi7_2 = JSON.stringify(results[0].durchschnittliche_zeit_bis_kauf);
                            // }
                            // else{
                                // console.log('Error while performing Query KPI 7_2 (Durchschnittliche Zeit bis zum Kauf).');
                            // }
                        // }
                    // );

                    // KPI 7_3: Anteil Besucher, die Zeittracking erlauben
                    // RETURN: Wert als Zahl in Prozent (ohne Prozentzeichen), zb. 49
        			// connectionCustomerDB.query(
                        // 'SELECT ROUND((pageview_complete_events.pageview_sessions / all_tracking_events.all_sessions * 100), 1) AS ratio_js_users \
                    	// FROM \
                    		// ( \
                    		// SELECT COUNT(DISTINCT(session_id)) AS pageview_sessions \
                    		// FROM tracking_events \
                    		// WHERE event_type = "PAGEVIEW_COMPLETE" \
                            // ) pageview_complete_events, \
                    		// ( \
                    		// SELECT COUNT(DISTINCT(session_id)) AS all_sessions \
                    		// FROM tracking_events \
                            // ) all_tracking_events',
                            // function(err, results) {
                                // if (!err){
                                    // kpi7_3 = JSON.stringify(results[0].ratio_js_users);
                                    // console.log("ZEIT: " + kpi7_3);
                                // }
                                // else{
                                    // console.log('Error while performing Query KPI 7_3 (Anteil TrackingUser).');
                                // }
                            // }
                    // );






                    // ======== HIER NOCH TOP-TRENDING DER LETZTEN 30 TAGE IMPLEMENTIEREN --> QUERY ABÄNDERN =======
                    // =============================================================================================
                        // // Setze numberTopProducts auf ausgewählten Wert
                        // numberTopProducts = req.query.numberTopProducts;
                        //
                        // // KPI 6: Top X Trending-Produkte der letzten 30 Tage --> TODO: aktuelles Datum: "2017-03-20" an 2 Stellen durch CURDATE() ersetzen
                        // // RETURN: JSON mit 10 Produkten
                        // // Rufe Query standardmäßig mit 10 Produkten auf, wenn nichts ausgewählt wurde
                        // if (numberTopProducts === undefined) {
                        //     numberTopProducts = 10;
                        //     connectionCustomerDB.query(
                        //         'SELECT vi.item_id, i.description AS description, SUM(vi.total_order_value) AS umsatz \
                        //         FROM    ( \
                        //                 SELECT visitor_id as vid \
                        //                 FROM tracking_events \
                        //                 WHERE event_type = "ORDER_COMPLETE" AND DATEDIFF("2017-03-20",FROM_UNIXTIME(creation_timestamp)) < 31 AND DATEDIFF("2017-03-20",FROM_UNIXTIME(creation_timestamp)) >= 0 \
                        //                 ) o, visitor_item vi, item i \
                        //         WHERE o.vid = vi.visitor_id AND vi.item_id = i.id \
                        //         GROUP BY vi.item_id \
                        //         ORDER BY SUM(vi.total_order_value) DESC \
                        //         LIMIT ' + numberTopProducts,
                        //         function(err, results) {
                        //             if (!err){
                        //
                        //                 kpi6 = results;
                        //
                        //             }
                        //             else {
                        //                 console.log('Error while performing Query KPI 6 (Top 10 Trending-Produkte der letzten 30 Tage).', err);
                        //             }
                        //         }
                        //     );
                        // }
                        // // Rufe Query mit X Produkten auf, falls auf Webseite Button geändert wurde
                        // else {
                        //     kpi6 = undefined;
                        //     console.log("______________________: " + numberTopProducts);
                        //     connectionCustomerDB.query(
                        //         'SELECT vi.item_id, i.description AS description, SUM(vi.total_order_qty) AS umsatz \
                        //         FROM    ( \
                        //                 SELECT visitor_id as vid \
                        //                 FROM tracking_events \
                        //                 WHERE event_type = "ORDER_COMPLETE" AND DATEDIFF("2017-03-20",FROM_UNIXTIME(creation_timestamp)) < 31 AND DATEDIFF("2017-03-20",FROM_UNIXTIME(creation_timestamp)) >= 0 \
                        //                 ) o, visitor_item vi, item i \
                        //         WHERE o.vid = vi.visitor_id AND vi.item_id = i.id \
                        //         GROUP BY vi.item_id \
                        //         ORDER BY SUM(vi.total_order_qty) DESC \
                        //         LIMIT ' + numberTopProducts,
                        //         function(err, results) {
                        //             if (!err){
                        //                 kpi6 = results;
                        //                 console.log("result9: " + kpi6);
                        //             }
                        //             else {
                        //                 console.log('Error while performing Query KPI 6 (Top X Trending-Produkte der letzten 30 Tage).', err);
                        //             }
                        //         }
                        //     );
                        // }

					//numberTopProducts entfernen
					while (years === undefined
					|| kpi1_1 === undefined
					|| kpi1_2 === undefined
					|| numberTopProducts === undefined) {
                    	deasync.runLoopOnce();
                    }


					connectionLoginDB.query('SELECT kpi4, kpi5_1, kpi5_2, kpi5_3, kpi6, kpi7_1, kpi7_2, kpi7_3 \
						FROM users WHERE username ="'+req.user.username+'"', function(err, results){
							if(!err){
								kpi4=JSON.parse(results[0].kpi4);
								kpi5_1=JSON.parse(results[0].kpi5_1);
								kpi5_2=JSON.parse(results[0].kpi5_2);
								kpi5_3=JSON.parse(results[0].kpi5_3);
							    kpi6=JSON.parse(results[0].kpi6);
								kpi7_1=JSON.parse(results[0].kpi7_1);
								kpi7_2=JSON.parse(results[0].kpi7_2);
								kpi7_3=JSON.parse(results[0].kpi7_3);

                                var kpi6_parametrisiert=[];
                                for (var i = 0; i < numberTopProducts; i++) {
                                    kpi6_parametrisiert.push(kpi6[i]);
                                    console.log(kpi6_parametrisiert.length);
                                }

								res.render('profile.ejs', {
									user                : req.user.username,
									years_kpi1          : years,
									result4_1           : kpi1_1,
									result4_2           : kpi1_2,
									result5             : kpi2,
									result6             : kpi3,
									result7             : kpi4,
									result8_1           : kpi5_1,
									result8_2           : kpi5_2,
									result8_3           : kpi5_3,
									result9             : kpi6_parametrisiert,
									result10_1          : kpi7_1,
									result10_2          : kpi7_2,
									result10_3          : kpi7_3,
									numberTopProducts   : numberTopProducts,
									year                : selectedYear
								});
							}

						});



            		// res.render('profile.ejs', {
                        // user                : req.user.username,
                        // years_kpi1          : years,
                        // result4_1           : kpi1_1,
                        // result4_2           : kpi1_2,
                        // result5             : kpi2,
                        // result6             : kpi3,
                        // result7             : kpi4,
                        // result8_1           : kpi5_1,
                        // result8_2           : kpi5_2,
                        // result8_3           : kpi5_3,
                        // result9             : kpi6,
                        // result10_1          : kpi7_1,
                        // result10_2          : kpi7_2,
                        // result10_3          : kpi7_3,
                        // numberTopProducts   : numberTopProducts,
                        // year                : selectedYear
                    // });

                });
        }
    });


    // =====================================
    // CHANGEUSER (nur Admins) =============
    // =====================================
    // Geschützt durch isLoggedInAdmin-Funktion
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
        // Wenn der Nutzer nur geändert werden soll, fahre fort
        if (req.query.type === "change") {
            var actualPassword;
            // Hole aktuelles gehashtes Passwort
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
                // Checken, ob Passwort geändert wurde
                // Wenn es nicht geändert wurde, hashe Passwort nicht nochmal und update das Passwort nicht
                if (actualPassword === req.body.password && req.body.password === req.body.passwordConfirm) {
                    connectionLoginDB.query(' \
                        UPDATE users \
                        SET username = "'+req.body.username+'", host = "'+req.body.host+'", username_db = "'+req.body.username_db+'", password_db = "'+req.body.password_db+'", db = "'+req.body.db+'" \
                        WHERE username = "' + req.query.username + '"', function(err, results){
                            if (err) {
                                console.log('Admin: Fehler beim Updaten der UserData!', err);
                            }
                            else {
                                // Zeige Seite erneut mit Success-Flash-Message
                                req.flash('changeUserMessage', 'Die Daten wurden erfolgreich geändert.');
                                res.redirect('/changeUser?username='+req.body.username);
                            }
                    });
                }
                // Mindestens eins der Passwort-Felder wurde geändert
                else {
                    // Wenn Passwort geändert wurde & zweimal identisch eingegeben wurde, hashe und update es in der DB
                    if (req.body.password === req.body.passwordConfirm) {
                        connectionLoginDB.query(' \
                            UPDATE users \
                            SET username = "'+req.body.username+'", password = "'+passwordHash.generate(req.body.password)+'", host = "'+req.body.host+'", username_db = "'+req.body.username_db+'", password_db = "'+req.body.password_db+'", db = "'+req.body.db+'" \
                            WHERE username = "' + req.query.username + '"', function(err, results){
                                if (err) {
                                    console.log('Admin: Fehler beim Updaten der UserData!', err);
                                }
                                else {
                                    // Zeige Seite erneut mit Success-Flash-Message an
                                    req.flash('changeUserMessage', 'Die Daten wurden erfolgreich geändert.');
                                    res.redirect('/changeUser?username='+req.body.username);
                                }
                        });
                    }
                    // Passwort wurde nicht identisch eingegeben, also zeige Failure-Flash-Message
                    else {
                        // Zeige Seite erneut mit Failure-Flash-Message an
                        req.flash('changeUserMessage', 'Das Passwort stimmt nicht überein.');
                        res.redirect('/changeUser?username='+req.body.username);
                    }
                }
            });
        }
        // Wenn der Nutzer gelöscht werden soll, folgendes ausführen
        else {
            connectionLoginDB.query(' \
                DELETE FROM users \
                WHERE username = "' + req.query.username + '"', function(err, results){
                    if (err) {
                        console.log('Admin: Fehler beim Löschen des Benutzers!', err);
                    }
                    else {
                        // Zeige Profile-Seite mit Success-Flash-Message an, falls erfolgreich gelöscht
                        req.flash('deleteUserMessage', 'Der Nutzer "'+req.query.username+'" wurde erfolgreich aus der Datenbank entfernt.');
                        res.redirect('/profile');
                    }
            });
        }
    });


    // =====================================
    // ADDUSER (nur Admins) =============
    // =====================================
    // Geschützt durch isLoggedInAdmin-Funktion
    app.get('/addUser', isLoggedInAdmin, function(req, res) {

        res.render('addUser.ejs', {
            message     : req.flash('addUserMessage')
        });

    });

    app.post('/addUser', function(req, res) {

        // Checken, ob alle Felder ausgefüllt wurden und fahre fort, wenn ja
        if (req.body.username.length > 0 && req.body.password.length > 0 && req.body.passwordConfirm.length > 0 && req.body.host.length > 0 && req.body.username_db.length > 0 && req.body.password_db.length > 0 && req.body.db.length > 0) {
            // Checken, ob Benutzername schon in DB vorhanden
            connectionLoginDB.query(' \
                SELECT count(*) AS anzahlVorhandenderNutzer \
                FROM users \
                WHERE username = "'+req.body.username+'"',
                function(err, results){
                    if (err) {
                        console.log('Admin: Fehler beim Checken, ob Benutzername schon in LoginDB vorhanden ist (Hinzufügen eines neuen Benutzers).', err);
                    }
                    else {
                        // Wenn Benutzername noch verfügbar, dann fahre fort
                        if (results[0].anzahlVorhandenderNutzer == 0) {
                            // Wenn Passwort übereinstimmt, füge neuen Benutzer hinzu
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
                                            // Zeige Profile-Seite mit Success-Flash-Message
                                            req.flash('addUserMessage', 'Der neue Benutzer "'+req.body.username+'" wurde erfolgreich hinzugefügt.');
                                            res.redirect('/profile');
                                        }
                                });
                            }
                            // Wenn Passwörter nicht übereinstimmen, dann zeige AddUser-Seite erneut mit Failure-Flash-Message an
                            else {
                                req.flash('addUserMessage', 'Die Passwörter stimmen nicht überein.');
                                res.redirect('/addUser');
                            }
                        }
                        // Wenn Benutzername schon vorhanden, dann zeige AddUser-Seite erneut mit Failure-Flash-Message an
                        else {
                            req.flash('addUserMessage', 'Der Benutzername ist leider schon vergeben.');
                            res.redirect('/addUser');
                        }
                    }
            });
        }
        // Wenn nicht alle Felder ausgefüllt wurden, Failure-Message anzeigen
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

    // if they aren't redirect them to the home page
    res.redirect('/profile');
}
