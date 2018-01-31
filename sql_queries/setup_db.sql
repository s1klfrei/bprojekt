DROP TABLE users;

create table users (id int NOT NULL AUTO_INCREMENT, username VARCHAR(20), password VARCHAR(255), host VARCHAR(20), username_db VARCHAR(20), password_db VARCHAR(20), db VARCHAR(20), PRIMARY KEY (id));

INSERT INTO `login`.`users`
(`username`,
`password`,
`host`,
`username_db`,
`password_db`,
`db`)
VALUES
("c3","sha1$fb808505$1$af1036d90b16734095a938e75467afb89a71e36f", "localhost", "root", "root", "customer3");
#Passwort="12345678"

select * from users;
