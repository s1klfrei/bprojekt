#Anzahl ORDER COMPLETE und Anzahl Visitor pro Monat
# muss noch nach jahr verglichen werden.
	 
	SELECT o.monat , o.anzahl_orders, v.anzahl_visitor
	FROM
		(SELECT COUNT(*) AS anzahl_orders, MONTH(from_unixtime(creation_timestamp)) as monat
		FROM tracking_events
		WHERE event_type = "ORDER_COMPLETE"
		GROUP BY YEAR(from_unixtime(creation_timestamp)), 
			MONTH(from_unixtime(creation_timestamp))) o,
		(SELECT COUNT(*) AS anzahl_visitor, MONTH(session_date) as monat
		FROM visitor
		GROUP BY YEAR(session_date), MONTH(session_date)) v
	WHERE o.monat = v.monat
	ORDER BY o.monat ASC;


	#KPI: Umsatz über Stunden
	SELECT HOUR(session_date) as stunde, SUM(item_total_order_value) AS umsatz 
	FROM visitor
	GROUP BY HOUR(session_date);
	 
	 
	 
	#käufe über stunden
	SELECT HOUR(from_unixtime(creation_timestamp)) as stunde, COUNT(*)AS anzahl_orders
	FROM tracking_events
	WHERE event_type = 'ORDER_COMPLETE' 
	GROUP BY Stunde;
    
		
	#durchschnittliche zeit pro kategorie
	select count(session_id) as aufrufe, avg(JSON_EXTRACT(event_data,'$.active_page_view_time')) as duchschnittliche_zeit_cat, category_id
	from tracking_events
	where event_type="PAGEVIEW_COMPLETE"
	group by category_id;
	 
	 
	# durchschnittliche zeit pro seite
	select count(session_id) as aufrufe, avg(JSON_EXTRACT(event_data,'$.active_page_view_time')) as duchschnittliche_zeit_item, item_id
	from tracking_events
	where event_type="PAGEVIEW_COMPLETE"
	group by item_id;
    
    
    SELECT event_type, JSON_EXTRACT(event_data, '$.linked_item_ids')AS linked_item_ids, item_id, category_id
FROM tracking_events
WHERE event_type = 'PAGEVIEW_COMPLETE';