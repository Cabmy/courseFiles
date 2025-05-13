-- ���ӵ����ݿ�
\c bookstore_management;

-- ���Ԥ����ͼ���������10����ͼ�飩
CREATE VIEW view_low_stock AS
SELECT
    book_id,
    isbn,
    title,
    author,
    publisher,
    retail_price,
    stock
FROM book
WHERE
    stock < 10
ORDER BY stock ASC;

-- ����ͳ����ͼ����ͼ��ͳ�������������۶
CREATE VIEW view_sales_statistics AS
SELECT
    b.book_id,
    b.isbn,
    b.title,
    b.author,
    SUM(s.quantity) AS total_sold,
    SUM(s.quantity * s.sale_price) AS total_revenue
FROM book b
    JOIN sale_record s ON b.book_id = s.book_id
GROUP BY
    b.book_id,
    b.isbn,
    b.title,
    b.author
ORDER BY total_revenue DESC;

-- ����ͳ����ͼ
CREATE VIEW view_purchase_statistics AS
SELECT
    b.book_id,
    b.isbn,
    b.title,
    SUM(pd.quantity) AS total_purchased,
    SUM(
        pd.quantity * pd.purchase_price
    ) AS total_cost
FROM
    book b
    JOIN purchase_detail pd ON b.book_id = pd.book_id
    JOIN purchase_order po ON pd.order_id = po.order_id
WHERE
    po.status = '�Ѹ���'
GROUP BY
    b.book_id,
    b.isbn,
    b.title
ORDER BY total_cost DESC;

-- �û�����ҵ����ͼ
CREATE VIEW view_user_sales_performance AS
SELECT
    u.user_id,
    u.username,
    u.real_name,
    COUNT(s.sale_id) AS total_sales,
    SUM(s.quantity) AS total_items_sold,
    SUM(s.quantity * s.sale_price) AS total_revenue
FROM "user" u
    LEFT JOIN sale_record s ON u.user_id = s.seller_id
GROUP BY
    u.user_id,
    u.username,
    u.real_name
ORDER BY total_revenue DESC;

-- δ��ɽ�������ͼ
CREATE VIEW view_pending_purchase_orders AS
SELECT
    po.order_id,
    po.create_time,
    po.status,
    po.total_amount,
    u.username AS creator_name,
    COUNT(pd.detail_id) AS item_count
FROM
    purchase_order po
    JOIN "user" u ON po.creator_id = u.user_id
    JOIN purchase_detail pd ON po.order_id = pd.order_id
WHERE
    po.status = 'δ����'
GROUP BY
    po.order_id,
    po.create_time,
    po.status,
    po.total_amount,
    u.username
ORDER BY po.create_time ASC;

-- �����¶ȱ�����ͼ
CREATE VIEW view_monthly_finance AS
SELECT TO_CHAR (record_time, 'YYYY-MM') AS month, type, SUM(amount) AS total_amount
FROM financial_record
GROUP BY
    TO_CHAR (record_time, 'YYYY-MM'),
    type
ORDER BY month DESC, type;