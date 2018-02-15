var mysql = require('mysql');
var deasync = require('deasync');


module.exports = function(connectionLoginDB) {

	// Get all KPIs for every customer
	connectionLoginDB.query('SELECT * FROM users WHERE username != "admin"', function(err, res) {
		if (!err) {
			for (i = 0; i < res.length; i++) {
				updateKpiResults(connectionLoginDB, res[i]);
			}
			console.log('All User-KPIs updated.');
		}
		else {
			console.log('Error while performing Query to get all User-KPIs.', err);
		}
	});

};

// function for updating KPI-Results of one passed customer
function updateKpiResults(connectionLoginDB, customer) {

	// set up connection to database of passed customer
	var connectionCustomerDB = mysql.createConnection({
	  host     : customer.host,
	  user     : customer.username_db,
	  password : customer.password_db,
	  database : customer.db
	});

	// connect to customerDB
	connectionCustomerDB.connect();

	var years,
		kpi1_1,
		kpi1_2,
		kpi3,
		kpi3_1,
		kpi4,
		kpi5_1,
		kpi5_2,
		kpi5_3,
		kpi6,
		kpi7_1,
		kpi7_2,
		kpi7_3
		;

	// Years: all years for which data exist
	// RETURN: JSON with all years for which data exist
	connectionCustomerDB.query(
		'SELECT YEAR(session_date) AS year \
		FROM visitor \
		GROUP BY year \
		ORDER BY year DESC',
		function(err, results) {
			if (!err) {
				years = JSON.stringify(results);
			}
			else {
				console.log('Error while performing Query Years.', err);
			}
		}
	);

	// KPI 1_1: Volume of Sales (per year)
	// RETURN: JSON with years and their associated volume of sales
	connectionCustomerDB.query(
		'SELECT YEAR(session_date) as year, SUM(item_total_order_value) AS umsatz \
		FROM visitor \
		GROUP BY YEAR(session_date)',
		function (err, results) {
			if (!err) {
				kpi1_1 = JSON.stringify(results);
			}
			else {
				console.log('Error while performing Query KPI 1_1 (Volume of Sales (per year)).', err);
			}
		}
	);

	// KPI 1_2: Volume of Sales (per month)
	// RETURN: JSON with months and their associated volume of sales
	connectionCustomerDB.query(
		'SELECT YEAR(session_date) as year, DATE_FORMAT(session_date, "%m/%Y") AS monat, SUM(item_total_order_value) AS umsatz \
		FROM visitor \
		GROUP BY YEAR(session_date), DATE_FORMAT(session_date, "%m/%Y") \
		ORDER BY ANY_VALUE(session_date) DESC',
		function(err, results) {
			if (!err) {
				kpi1_2 = JSON.stringify(results);
			}
			else {
				console.log('Error while performing Query KPI 1_2 (Volume of Sales (per month)).', err);
			}
		}
	);

	// KPI 3: Conversionrate (total) per Month
	// RETURN: JSON with Visitors and Orders per Month
	connectionCustomerDB.query(
		'SELECT o.monat, o.anzahl_orders, v.anzahl_visitor \
		FROM    ( \
					SELECT COUNT(*) AS anzahl_orders, DATE_FORMAT(FROM_UNIXTIME(creation_timestamp), "%m/%Y") AS monat \
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
		WHERE o.monat = v.monat',
		function(err, results) {
			if (!err) {
				kpi3 = JSON.stringify(results);
			}
			else{
				console.log('Error while performing Query KPI 3 (Conversionrate (total) per Month).', err);
			}
		}
	);

	// KPI 3_1: Conversionrate (total)
	// RETURN: Single percentage-value rounded to 1 decimal place (without %-symbol), e.g. "10.5"
	connectionCustomerDB.query(
		'SELECT ROUND(((anzahl_orders / anzahl_sessions) * 100), 1) AS conversion_rate \
		FROM 	( \
					SELECT count(distinct session_id) AS anzahl_sessions \
					FROM visitor \
				) sessions, \
				( \
					SELECT count(session_id) AS anzahl_orders \
					FROM tracking_events \
					WHERE event_type = "ORDER_COMPLETE" \
				) orders;',
		function(err, results){
			if (!err) {
					kpi3_1 = JSON.stringify(results);
			}
			else {
				console.log('Error while performing Query KPI 3_1 (Conversionrate (total)).', err);
			}
		}
	);

	// KPI 4: Volume of Sales over Time (total per hour)
	// RETURN: JSON with 24 hours and total Volume of Sales per hour
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
			if (!err) {
				kpi4 = JSON.stringify(results);
			}
			else {
				console.log('Error while performing Query KPI 4 (Volume of Sales over Time (total per hour)).', err);
			}
		}
	);

	// KPI 5_1: Average Basket Value
	// RETURN: Single value rounded to 2 decimal places
	connectionCustomerDB.query(
		'SELECT ROUND((AVG(item_total_add_to_basket_value) - AVG(item_total_rm_from_basket_value)),2) AS avg_wk \
		FROM visitor \
		WHERE item_total_add_to_basket_value > 0',
		function(err, results) {
			if (!err) {
				kpi5_1 = JSON.stringify(results);
			}
			else {
				console.log('Error while performing Query KPI 5_1 (Average Basket Value).', err);
			}
		}
	);

	// KPI 5_2: Non-ordered Basket Rate
	// RETURN: Single value rounded to 1 decimal place
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
			if (!err) {
				kpi5_2 = JSON.stringify(results);
			}
			else{
				console.log('Error while performing Query KPI 5_2 (Non-ordered Basket Rate).', err);
			}
		}
	);

	// KPI 5_3: Average Order Value
	// RETURN: Single value rounded to 2 decimal places
	connectionCustomerDB.query(
		'SELECT ROUND(AVG(a.item_total_order_value), 2) AS Bestellsumme_AVG \
		FROM    ( \
					SELECT item_total_order_value \
					FROM visitor \
					WHERE item_total_order_value > 0 \
				) a',
		function(err, results) {
			if (!err) {
				kpi5_3 = JSON.stringify(results);
			}
			else {
				console.log('Error while performing Query KPI 5_3 (Average Order Value).', err);
			}
		}
	);

	// KPI 6: Top Bestseller
	// RETURN: JSON with 20 Top Bestsellers
	connectionCustomerDB.query(
		'SELECT vi.item_id, i.description AS Beschreibung, SUM(vi.total_order_qty) AS Anzahl \
		FROM    ( \
					SELECT visitor_id as vid \
					FROM tracking_events \
					WHERE event_type = "ORDER_COMPLETE" \
				) o, \
				visitor_item vi, \
				item i \
		WHERE o.vid = vi.visitor_id AND vi.item_id = i.id \
		GROUP BY vi.item_id \
		ORDER BY SUM(vi.total_order_qty) DESC LIMIT 20',
		function(err, results) {
			if (!err) {
				kpi6 = JSON.stringify(results);
			}
			else {
				console.log('Error while performing Query KPI 6 (Top Bestseller).', err);
			}
		}
	);

	// KPI 7_1: Average Time on Page
	// RETURN: Single value rounded to 1 decimal place
	connectionCustomerDB.query(
		'SELECT ROUND(AVG(JSON_EXTRACT(event_data,"$.active_page_view_time")), 1) AS average_page_view_time \
		FROM tracking_events \
		WHERE event_type = "PAGEVIEW_COMPLETE"',
		function(err, results) {
			if (!err) {
				kpi7_1 = JSON.stringify(results);
			}
			else{
				console.log('Error while performing Query KPI 7_1 (Average Time on Page).');
			}
		}
	);

	// KPI 7_2: Average Time until Buy
	// RETURN: Single value rounded to "Integer"
	// _THRESHOLDs: more than 0 and lower than 4 hours
	connectionCustomerDB.query(
		'SELECT ROUND((AVG(max.ende - min.anfang) / 60), 0) AS durchschnittliche_zeit_bis_kauf \
		FROM 	( \
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
		WHERE min.session_id = max.session_id AND (max.ende - min.anfang) < 14400 AND min.session_id = max.session_id AND (max.ende - min.anfang) > 0',
		function(err, results) {
			if (!err) {
				kpi7_2 = JSON.stringify(results);
			}
			else{
				console.log('Error while performing Query KPI 7_2 (Average Time until Buy).');
			}
		}
	);

	// KPI 7_3: Percentage of Tracking User
	// RETURN: Single percentage-value rounded to 1 decimal place (without %-symbol), e.g. "49.7"
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
				if (!err) {
					kpi7_3 = JSON.stringify(results);
				}
				else{
					console.log('Error while performing Query KPI 7_3 (Percentage of Tracking User).');
				}
			}
	);

	// Wait for all KPI-results because of asynchronous function calls
	while (
		years	=== undefined ||
		kpi1_1	=== undefined ||
		kpi1_2	=== undefined ||
		kpi3	=== undefined ||
		kpi3_1	=== undefined ||
		kpi4	=== undefined ||
		kpi5_1	=== undefined ||
		kpi5_2	=== undefined ||
		kpi5_3	=== undefined ||
		kpi6	=== undefined ||
		kpi7_1	=== undefined ||
		kpi7_2	=== undefined ||
		kpi7_3	=== undefined
		)
	{
		deasync.runLoopOnce(); // more efficient than just empty loop
	}


	var update_query = "UPDATE users SET \
							years 	='"+years+"', \
							kpi1_1 	='"+kpi1_1+"', \
							kpi1_2 	='"+kpi1_2+"', \
							kpi3 	='"+kpi3+"', \
							kpi3_1 	='"+kpi3_1+"', \
							kpi4 	='"+kpi4+"', \
							kpi5_1 	='"+kpi5_1+"', \
							kpi5_2 	='"+kpi5_2+"', \
							kpi5_3 	='"+kpi5_3+"', \
							kpi6 	='"+kpi6+"', \
							kpi7_1 	='"+kpi7_1+"', \
							kpi7_2 	='"+kpi7_2+"', \
							kpi7_3 	='"+kpi7_3+"' \
						WHERE username ='"+customer.username+"'";


	connectionLoginDB.query(update_query, function(err, results){
		if (!err){
			console.log('Updated KPIs for user ' + customer.username);
			connectionCustomerDB.end();
		}
		else {
			console.log('Error while updating KPIs for user ' + customer.username, err);
			connectionCustomerDB.end();
		}
	});

}
