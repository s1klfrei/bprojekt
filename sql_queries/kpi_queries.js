var mysql = require('mysql');
var deasync = require('deasync');

module.exports = function(connectionLoginDB) {


	var connectionCustomerDB;

			// mit Kunden-DB verbinden
	connectionLoginDB.query('SELECT * FROM users WHERE username != "admin"', function(err, results) {
		for(var i=0; i<results.length; i++){
			connectionCustomerDB = mysql.createConnection({
			  host     : results[i].host,
			  user     : results[i].username_db,
			  password : results[i].password_db,
			  database : results[i].db
			});

			connectionCustomerDB.connect();


			var kpi4,
				kpi5_1,
				kpi5_2,
				kpi5_3,
				kpi6,
				kpi7_1,
				kpi7_2,
				kpi7_3
				;







			// KPI 4: Umsatz pro Stunde
			// RETURN: JSON mit Stunden und jeweiligem Gesamtumsatz (bis zu 24 Werte-Paare)
			connectionCustomerDB.query(
				'SELECT a.stunde AS stunde, (a.umsatzProStunde / b.gesamtumsatz * 100) AS umsatz \
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
						kpi4 = JSON.stringify(results);
					}
					else {
						console.log('Error while performing Query KPI 4 (Umsatz pro Stunde).', err);
					}
				}
			);

			// KPI 5_1: Durchschnittlicher Wert der Warenkörbe
			// RETURN: Wert als Zahl gerundet auf 2 Nachkommastellen
			connectionCustomerDB.query(
				'SELECT ROUND((AVG(item_total_add_to_basket_value) - AVG(item_total_rm_from_basket_value)),2) AS avg_wk \
				FROM visitor \
				WHERE item_total_add_to_basket_value > 0',
				function(err, results) {
					if (!err){
						kpi5_1 = JSON.stringify(results);//[0].avg_wk
					}
					else {
						console.log('Error while performing Query KPI 5_1 (Durchschnittlicher Wert der Warenkörbe).', err);
					}
				}
			);

			// KPI 5_2: Rate nicht-bestellter Warenkörbe
			// RETURN: Wert als Zahl gerundet auf 1 Nachkommastelle
			connectionCustomerDB.query(
				'SELECT ROUND((1 - ordered.ANZAHL_BESTELLTER_WARENKOERBE / hinzugefuegt.ANZAHL_HINZUGEFUEGTER_WARENKOERBE),3)*100 AS rate_n_wk \
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
						kpi5_2 = JSON.stringify(results);//[0].rate_n_wk
					}
					else{
						console.log('Error while performing Query KPI 5_2 (Rate nicht-bestellter Warenkörbe).', err);
					}
				}
			);

			// KPI 5_3: Durchschnittliche Bestellsumme
			// RETURN: Wert als Zahl gerundet auf 2 Nachkommastellen
			connectionCustomerDB.query(
				'SELECT ROUND(AVG(a.item_total_order_value), 2) AS Bestellsumme_AVG \
				FROM    ( \
						SELECT item_total_order_value \
						FROM visitor \
						WHERE item_total_order_value > 0 \
						) a',
				function(err, results) {
					if (!err){
						kpi5_3 = JSON.stringify(results);//[0].Bestellsumme_AVG
					}
					else {
						console.log('Error while performing Query KPI 5_3 (Durchschnittliche Bestellsumme).', err);
					}
				}
			);



			// KPI 6: Alle produkte geordnet nach bestselled
			// RETURN: JSON mit 10 Produkten
			// Rufe Query standardmäßig mit 10 Produkten auf, wenn nichts ausgewählt wurde
			connectionCustomerDB.query(
				'SELECT vi.item_id, i.description AS Beschreibung, SUM(vi.total_order_qty) AS Anzahl \
				FROM    ( \
						SELECT visitor_id as vid \
						FROM tracking_events \
						WHERE event_type = "ORDER_COMPLETE" \
						) o, visitor_item vi, item i \
				WHERE o.vid = vi.visitor_id AND vi.item_id = i.id \
				GROUP BY vi.item_id \
				ORDER BY SUM(vi.total_order_qty) DESC LIMIT 20',
				function(err, results) {
					if (!err){

						kpi6 = JSON.stringify(results);

					}
					else {
						console.log('Error while performing Query KPI 6 (Top 10 Bestseller).', err);
					}
				}
			);

			// KPI 7_1: Durchschnittliche Zeit auf Seite
			// RETURN: Wert als Zahl
			connectionCustomerDB.query(
				'SELECT ROUND(AVG(JSON_EXTRACT(event_data,"$.active_page_view_time")), 1) AS average_page_view_time \
				FROM tracking_events \
				WHERE event_type = "PAGEVIEW_COMPLETE"',
				function(err, results) {
					if (!err){
						kpi7_1 = JSON.stringify(results);//[0].average_page_view_time
					}
					else{
						console.log('Error while performing Query KPI 7_1 (Durchschnittliche Zeit auf Seite).');
					}
				}
			);

			// KPI 7_2: Durchschnittliche Zeit bis zum Kauf #SCHWELLWERT: unter 4 Stunden
			// RETURN: Wert als Zahl
			connectionCustomerDB.query(
				'SELECT ROUND((AVG(max.ende - min.anfang) / 60), 0) AS durchschnittliche_zeit_bis_kauf \
				FROM ( \
					SELECT session_id, MIN(creation_timestamp) AS anfang \
					FROM tracking_events \
					GROUP BY session_id \
					 ) min, \
					( \
					SELECT session_id, MAX(creation_timestamp) AS ende \
					FROM tracking_events \
					WHERE event_type = "ORDER_COMPLETE" \
					GROUP BY session_id \
					) max \
				WHERE min.session_id = max.session_id AND (max.ende - min.anfang) < 14400',
				function(err, results) {
					if (!err){
						kpi7_2 = JSON.stringify(results);//[0].durchschnittliche_zeit_bis_kauf
					}
					else{
						console.log('Error while performing Query KPI 7_2 (Durchschnittliche Zeit bis zum Kauf).');
					}
				}
			);

			// KPI 7_3: Anteil Besucher, die Zeittracking erlauben
			// RETURN: Wert als Zahl in Prozent (ohne Prozentzeichen), zb. 49
			connectionCustomerDB.query(
				'SELECT ROUND((pageview_complete_events.pageview_sessions / all_tracking_events.all_sessions * 100), 1) AS ratio_js_users \
				FROM \
					( \
					SELECT COUNT(DISTINCT(session_id)) AS pageview_sessions \
					FROM tracking_events \
					WHERE event_type = "PAGEVIEW_COMPLETE" \
					) pageview_complete_events, \
					( \
					SELECT COUNT(DISTINCT(session_id)) AS all_sessions \
					FROM tracking_events \
					) all_tracking_events',
					function(err, results) {
						if (!err){
							kpi7_3 = JSON.stringify(results);//[0].ratio_js_users
						}
						else{
							console.log('Error while performing Query KPI 7_3 (Anteil TrackingUser).');
						}
					}
			);



			while (kpi4 === undefined
			|| kpi5_1 === undefined
			|| kpi5_2 === undefined
			|| kpi5_3 === undefined
			|| kpi6 === undefined
			|| kpi7_1 === undefined
			|| kpi7_2 === undefined
			|| kpi7_3 === undefined)
			{
				deasync.runLoopOnce();
			}




			var update_query="UPDATE users SET kpi4 ='"+kpi4+"', kpi5_1 ='"+kpi5_1+"', kpi5_2 ='"+kpi5_2+
			"', kpi5_3 ='"+kpi5_3+"', kpi6 ='"+kpi6+"', kpi7_1 ='"+kpi7_1+"', kpi7_2 ='"+kpi7_2+"', kpi7_3 ='"+kpi7_3+
			"' WHERE username ='"+results[i].username+"'";


			connectionLoginDB.query(update_query, function(err){
				if(err){
					console.log('Error while updating kpi results', err);
				}
				else{

				}
			});


		}
		console.log('Updated kpi results for all users');
		//sleep einfügen
	});
};
