module.exports = {

    // Umsatz pro Jahr --> Jahr einlesen!!
    // RETURN: Jahresumsatz als Zahl
    getKpiUmsatzProJahr: function(connection) {

        connection.query('  SELECT SUM(item_total_order_value) AS umsatz \
                            FROM visitor \
                            WHERE YEAR(session_date) = 2017',
            function(err, results) {
                if (!err) {
                    return JSON.stringify(results[0].umsatz);
                }
                else {
                    console.log('Error while performing Query KPI-UmsatzProJahr.', err);
                }
            }
        );

    },

    // Jahre für Umsatz pro Monat --> Jahr einlesen!!
    // RETURN: JSON mit verschiedenen Jahren, in denen Daten zur Verfügung stehen
    getYearsData: function(connection) {

        connection.query('  SELECT YEAR(session_date) AS year \
                            FROM visitor \
                            GROUP BY year',
            function(err, results) {
                if (!err) {
                    return results;
                }
                else {
                    console.log('Error while performing Query YearsData.', err);
                }
        });

    },


    // Umsatz pro Monat --> JAHR EINLESEN!!
    // RETURN: JSON mit Monate und jeweiligem Umsatz (bis zu 12 Werte-Paare)
    getKpiUmsatzProMonat: function(connection) {

        connection.query('SELECT MONTHNAME(session_date)  AS monat,'+
            ' SUM(item_total_order_value) AS umsatz'+
            ' FROM visitor WHERE YEAR(session_date) = (SELECT MAX(YEAR(session_date)) FROM visitor) \
              GROUP BY YEAR(session_date), MONTHNAME(session_date)',
            function(err, results) {
                if (!err) {
                    return results;
                }
                else {
                    console.log('Error while performing Query KPI-UmsatzProMonat.', err);
                }
        });

    }


};
