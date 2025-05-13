-- �������ݿ�
\c bookstore_management;

-- �û���
CREATE TABLE "user" (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(32) NOT NULL, -- MD5���ܵ�����
    real_name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(20) NOT NULL,
    gender VARCHAR(2) NOT NULL CHECK (gender IN ('��', 'Ů')), -- PostgreSQLʹ��CHECK���ENUM
    age INT CHECK (age > 0),
    role VARCHAR(10) NOT NULL CHECK (role IN ('��������Ա', '��ͨ����Ա')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ͼ���
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

-- ���������ʹ�������ģ��MySQL��ON UPDATE CURRENT_TIMESTAMP
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

-- ��������
CREATE TABLE purchase_order (
    order_id SERIAL PRIMARY KEY,
    creator_id INT NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(10) NOT NULL DEFAULT 'δ����' CHECK (
        status IN ('δ����', '�Ѹ���', '���˻�')
    ),
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    remark VARCHAR(500),
    FOREIGN KEY (creator_id) REFERENCES "user" (user_id)
);

-- ������ϸ��
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

-- ���ۼ�¼��
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

-- �����¼��
CREATE TABLE financial_record (
    record_id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('����', '֧��')),
    amount DECIMAL(12, 2) NOT NULL,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('����', '����')),
    source_id INT NOT NULL,
    record_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operator_id INT NOT NULL,
    description VARCHAR(500),
    FOREIGN KEY (operator_id) REFERENCES "user" (user_id)
);

-- ������ʼ��������Ա�û�(����: admin123)
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
        'ϵͳ����Ա',
        'A0001',
        '��',
        30,
        '��������Ա'
    );

-- ������������߲�ѯ����
CREATE INDEX idx_book_title ON book (title);

CREATE INDEX idx_book_author ON book (author);

CREATE INDEX idx_book_publisher ON book (publisher);

CREATE INDEX idx_purchase_order_status ON purchase_order (status);

CREATE INDEX idx_purchase_order_creator ON purchase_order (creator_id);

CREATE INDEX idx_sale_seller ON sale_record (seller_id);

CREATE INDEX idx_sale_time ON sale_record (sale_time);

CREATE INDEX idx_financial_source ON financial_record (source_type, source_id);