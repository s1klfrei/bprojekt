var express = require('express');

var app = express();


var mysql      = require('mysql');

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'customer3'
});

connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }

  console.log('connected as id ' + connection.threadId);
});

connection.query('SELECT description FROM item WHERE id < 2;', function (error, results, fields) {
  if (error) throw error;
  console.log('The solution is: ', results);
  console.log('fields: ', fields)
});

connection.end();
