# Nodejs_and_mysql

Continuation work from http://codehandbook.org/web-app-using-node-js-and-mysql/


This is for learning purpose and license : MIT.

Requisites for the project

1. Express
2. Bootstrap
3. body-parser
4. node-mysql

do npm install for all the above packages

you have to install mysql server differently.
then
do the following 
1. Open cmd prompt and type mysql user:root  pass: root
2. Create database mydb;
3. Use mydb;
4. create table users (username VARCHAR(20), pass VARCHAR(20), host VARCHAR(20), user VARCHAR(20), password VARCHAR(20), db VARCHAR(20));
5. customer in die tabelle einfügen.
INSERT INTO `login`.`users`
(`username`,
`pass`,
`host`,
`user`,
`password`,
`db`)
VALUES
("c3","1234", "localhost", "root", "root", "customer3");


keep it running and now open the nodejs project in another cmd prompt and do 

node app.js



Enjoy!

SIGN IN SIGN UP Implementation working condition.
SIGN UP- adds username and pass to existing database
SIGN IN - verifies given username and pass from existing database


Thanks, 
Bishnu
