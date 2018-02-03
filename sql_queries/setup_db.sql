DROP TABLE users;

create table users (id int NOT NULL AUTO_INCREMENT, username VARCHAR(20), password VARCHAR(255), host VARCHAR(20), username_db VARCHAR(20), password_db VARCHAR(20), db VARCHAR(20), kpi4 json, kpi5_1 json, kpi5_2 json, kpi5_3 json, kpi6 json, kpi7_1 json, kpi7_2 json, kpi7_3 json, PRIMARY KEY (id));


INSERT INTO `login`.`users`
(`username`,
`password`)
VALUES
("admin","sha1$6a4d711f$1$bf875748a06b962e0b3af9374ea1cc3c62b3398a");
#Passwort="admin"

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

INSERT INTO `login`.`users`
(`username`,
`password`,
`host`,
`username_db`,
`password_db`,
`db`)
VALUES
("c2","sha1$fb808505$1$af1036d90b16734095a938e75467afb89a71e36f", "localhost", "root", "root", "customer2");
#Passwort="12345678"



select * from users;