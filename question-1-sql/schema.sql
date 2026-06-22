-- MySQL 8 schema for the RBAC permission model.
CREATE DATABASE IF NOT EXISTS qa_case;
USE qa_case;

DROP TABLE IF EXISTS role_action_rela;
DROP TABLE IF EXISTS user_role_rela;
DROP TABLE IF EXISTS action_define;
DROP TABLE IF EXISTS role_define;
DROP TABLE IF EXISTS user_define;

CREATE TABLE user_define (
    id   INT PRIMARY KEY,
    name VARCHAR(64) NOT NULL
);

CREATE TABLE role_define (
    id    INT PRIMARY KEY,
    label VARCHAR(64) NOT NULL
);

CREATE TABLE action_define (
    id          INT PRIMARY KEY,
    description VARCHAR(64) NOT NULL
);

CREATE TABLE user_role_rela (
    id      INT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    CONSTRAINT fk_urr_user FOREIGN KEY (user_id) REFERENCES user_define(id),
    CONSTRAINT fk_urr_role FOREIGN KEY (role_id) REFERENCES role_define(id)
);

CREATE TABLE role_action_rela (
    id        INT PRIMARY KEY,
    role_id   INT NOT NULL,
    action_id INT NOT NULL,
    CONSTRAINT fk_rar_role   FOREIGN KEY (role_id)   REFERENCES role_define(id),
    CONSTRAINT fk_rar_action FOREIGN KEY (action_id) REFERENCES action_define(id)
);
