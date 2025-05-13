-- 设置字符集
SET NAMES utf8mb4;

-- 创建数据库
CREATE DATABASE IF NOT EXISTS bookstore_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bookstore_management;

-- 创建用户表
CREATE TABLE user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(32) NOT NULL, -- MD5加密的密码
    real_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(20) NOT NULL,
    gender ENUM('男', '女') NOT NULL,
    age INT CHECK (age > 0),
    role ENUM('超级管理员', '普通管理员') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建书籍表
CREATE TABLE book (
    book_id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(100) NOT NULL,
    publisher VARCHAR(100) NOT NULL,
    retail_price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 进货单表
CREATE TABLE purchase_order (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    creator_id INT NOT NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('未付款', '已付款', '已退货') NOT NULL DEFAULT '未付款',
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    remark VARCHAR(500),
    FOREIGN KEY (creator_id) REFERENCES user(user_id)
);

-- 进货明细表 - 确保在purchase_order表之后创建
CREATE TABLE purchase_detail (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    book_id INT,
    isbn VARCHAR(20),
    title VARCHAR(200),
    author VARCHAR(100),
    publisher VARCHAR(100),
    quantity INT NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    is_new_book BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (order_id) REFERENCES purchase_order(order_id),
    FOREIGN KEY (book_id) REFERENCES book(book_id)
);

-- 销售记录表
CREATE TABLE sale_record (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    quantity INT NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    sale_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    seller_id INT NOT NULL,
    remark VARCHAR(500),
    FOREIGN KEY (book_id) REFERENCES book(book_id),
    FOREIGN KEY (seller_id) REFERENCES user(user_id)
);

-- 财务记录表
CREATE TABLE financial_record (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('收入', '支出') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    source_type ENUM('进货', '销售') NOT NULL,
    source_id INT NOT NULL,
    record_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operator_id INT NOT NULL,
    description VARCHAR(500),
    FOREIGN KEY (operator_id) REFERENCES user(user_id)
);

-- 创建初始超级管理员用户(密码: admin123)
INSERT INTO user (username, password, real_name, employee_id, gender, age, role)
VALUES ('admin', MD5('admin123'), '系统管理员', 'A0001', '男', 30, '超级管理员');