DROP TABLE users;

create table users (id int NOT NULL AUTO_INCREMENT, username VARCHAR(20), password VARCHAR(20), host VARCHAR(20), username_db VARCHAR(20), password_db VARCHAR(20), db VARCHAR(20), PRIMARY KEY (id));

INSERT INTO `login`.`users`
(`username`,
`password`,
`host`,
`username_db`,
`password_db`,
`db`)
VALUES
("c3","1234", "localhost", "root", "root", "customer3");

select * from users;
