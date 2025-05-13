-- 连接数据库
\c bookstore_management;

-- 用户表
CREATE TABLE "user" (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(32) NOT NULL, -- MD5加密的密码
    real_name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(20) NOT NULL,
    gender VARCHAR(2) NOT NULL CHECK (gender IN ('男', '女')), -- PostgreSQL使用CHECK替代ENUM
    age INT CHECK (age > 0),
    role VARCHAR(10) NOT NULL CHECK (role IN ('超级管理员', '普通管理员')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 图书表
CREATE TABLE book (
    book_id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(100) NOT NULL,
    publisher VARCHAR(100) NOT NULL,
    retail_price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建函数和触发器来模拟MySQL的ON UPDATE CURRENT_TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_book_updated_at
BEFORE UPDATE ON book
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 进货单表
CREATE TABLE purchase_order (
    order_id SERIAL PRIMARY KEY,
    creator_id INT NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(10) NOT NULL DEFAULT '未付款' CHECK (
        status IN ('未付款', '已付款', '已退货')
    ),
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    remark VARCHAR(500),
    FOREIGN KEY (creator_id) REFERENCES "user" (user_id)
);

-- 进货明细表
CREATE TABLE purchase_detail (
    detail_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    book_id INT,
    isbn VARCHAR(20),
    title VARCHAR(200),
    author VARCHAR(100),
    publisher VARCHAR(100),
    quantity INT NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    is_new_book BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (order_id) REFERENCES purchase_order (order_id),
    FOREIGN KEY (book_id) REFERENCES book (book_id)
);

-- 销售记录表
CREATE TABLE sale_record (
    sale_id SERIAL PRIMARY KEY,
    book_id INT NOT NULL,
    quantity INT NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    sale_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    seller_id INT NOT NULL,
    remark VARCHAR(500),
    FOREIGN KEY (book_id) REFERENCES book (book_id),
    FOREIGN KEY (seller_id) REFERENCES "user" (user_id)
);

-- 财务记录表
CREATE TABLE financial_record (
    record_id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('收入', '支出')),
    amount DECIMAL(12, 2) NOT NULL,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('进货', '销售')),
    source_id INT NOT NULL,
    record_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operator_id INT NOT NULL,
    description VARCHAR(500),
    FOREIGN KEY (operator_id) REFERENCES "user" (user_id)
);

-- 创建初始超级管理员用户(密码: admin123)
INSERT INTO
    "user" (
        username,
        password,
        real_name,
        employee_id,
        gender,
        age,
        role
    )
VALUES (
        'admin',
        MD5('admin123'),
        '系统管理员',
        'A0001',
        '男',
        30,
        '超级管理员'
    );

-- 创建索引以提高查询性能
CREATE INDEX idx_book_title ON book (title);

CREATE INDEX idx_book_author ON book (author);

CREATE INDEX idx_book_publisher ON book (publisher);

CREATE INDEX idx_purchase_order_status ON purchase_order (status);

CREATE INDEX idx_purchase_order_creator ON purchase_order (creator_id);

CREATE INDEX idx_sale_seller ON sale_record (seller_id);

CREATE INDEX idx_sale_time ON sale_record (sale_time);

CREATE INDEX idx_financial_source ON financial_record (source_type, source_id);