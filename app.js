//ursprünglicher code von https://github.com/bishnucit/Nodejs_and_mysql

var express = require('express');
var app = express();
var mysql = require('mysql');
var path = require('path');


var deasync = require('deasync');

var sessions = require('express-session');


var session;

var connection = mysql.createConnection({

  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'login'
});
var bodyParser = require('body-parser');

//für ejs nutzung
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'ejs');

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

	

// Binding express app to port 3000
app.listen(3000,function(){
    console.log('Node server running @ http://localhost:3000')
});


app.use('/node_modules',  express.static(__dirname + '/node_modules'));

app.use('/style',  express.static(__dirname + '/style'));

//session encryption
app.use(sessions({
	secret: 'öaklsdjf##ß98?=',		//not guessable only available to server
	resave: false, 					//diese beiden damit keine warnings mehr kommen, eventuell ihren sinn googlen.
	saveUninitialized: true
}));

app.get('/',function(req,res){
    res.sendFile('home.html',{'root': __dirname + '/templates'});
});

app.get('/login',function(req,res){
    res.sendFile('signin.html',{'root': __dirname + '/templates'});
});
app.get('/loginRetry',function(req,res){
    res.sendFile('signinretry.html',{'root': __dirname + '/templates'});
});

app.get('/loggedin',function(req,res){
	session = req.session;//session auf aktuelle session des anfragenden setzen
	if(session.uniqueID){ //test ob wirklich eingeloggt.
	
		//verbindung mit kundendb herstellen
		
		var selectString = 'SELECT * FROM users WHERE username="'+session.uniqueID+'" ';
		var cusCon;
		connection.query(selectString, function(err, results) {
					
			cusCon = mysql.createConnection({

			  host     : results[0].host,
			  user     : results[0].user,
			  password : results[0].password,
			  database : results[0].db
			});
			cusCon.connect();
			
			var res1;
			var res2;
			
			//testquery			
			cusCon.query('SELECT description AS name, id AS age FROM item where id<10', function(err, results) {
			  if (!err){
				res1=results;
			  }
			  else{
				console.log('Error while performing Query.', err);
			  }
			});
			
			cusCon.query('SELECT gb AS date, wert AS close FROM visitor', function(err, results) {
			  if (!err){
				res2=results;
			  }
			  else{
				console.log('Error while performing Query.', err);
			  }
			});
			
			
			//"date": "24-Apr-07",
			//"close": 93.24
			
			while(res1===undefined||res2===undefined){
				deasync.runLoopOnce();
			}
			res.render('loggedin', {result1: res1, result2: res2});

		});
		
	}
	else{
		res.sendFile('notloggedin.html',{'root': __dirname + '/templates'});
	}
});




app.post('/verifyuser', function(req,res){

	var selectString = 'SELECT COUNT(username) FROM users WHERE username="'+req.body.username+'" AND pass="'+req.body.pass+'" ';
	 
	connection.query(selectString, function(err, results) {
		
        //console.log(results);
        var string=JSON.stringify(results);
        //console.log(string);
		
		session = req.session;//session auf aktuelle session des anfragenden setzen
        //this is a walkaround of checking if the username pass combination is 1 or not it will fail if wrong pass is given
        if (string === '[{"COUNT(username)":1}]') { 
			session.uniqueID = req.body.username;//session id auf irgendwas setzen, damit man später abfragen kann ob sie gesetzt ist.
			res.redirect('/loggedin');
			
	        }
        if (string === '[{"COUNT(username)":0}]')  {
        	res.redirect('/loginRetry');
        	
        }
});



});

app.post('/logout', function(req, res){
	req.session.destroy()
	res.sendFile('resignin.html',{'root': __dirname + '/templates'});
});
