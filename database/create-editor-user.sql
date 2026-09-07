-- Run this script as a MySQL administrator only for local development.
CREATE USER IF NOT EXISTS 'editor'@'localhost' IDENTIFIED BY '12345678';
GRANT SELECT, INSERT, UPDATE, DELETE ON ProductsApplication.* TO 'editor'@'localhost';
FLUSH PRIVILEGES;
