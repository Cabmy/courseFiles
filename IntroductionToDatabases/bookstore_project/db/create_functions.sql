-- ���ӵ����ݿ�
\c bookstore_management;

-- 1. ����ͼ��洢����
CREATE OR REPLACE FUNCTION proc_sell_book(
    p_book_id INT,
    p_quantity INT,
    p_seller_id INT,
    p_sale_price DECIMAL(10, 2),
    p_remark VARCHAR(500),
    OUT p_sale_id INT
) 
AS $$
DECLARE
    current_stock INT;
    v_error_msg VARCHAR(100);
BEGIN
    -- ������Ƿ��㹻
    SELECT stock INTO current_stock FROM book WHERE book_id = p_book_id;
    
    IF current_stock < p_quantity THEN
        v_error_msg := CONCAT('��治�㣬��ǰ���: ', current_stock, ', ��Ҫ: ', p_quantity);
        RAISE EXCEPTION '%', v_error_msg;
    ELSE
        -- �������ۼ�¼
        INSERT INTO sale_record (book_id, quantity, sale_price, seller_id, remark)
        VALUES (p_book_id, p_quantity, p_sale_price, p_seller_id, p_remark)
        RETURNING sale_id INTO p_sale_id;
        
        -- ���¿��
        UPDATE book SET stock = stock - p_quantity WHERE book_id = p_book_id;
        
        -- ��Ӳ����¼
        INSERT INTO financial_record (type, amount, source_type, source_id, operator_id, description)
        VALUES ('����', p_quantity * p_sale_price, '����', p_sale_id, p_seller_id, 
                CONCAT('����ͼ��ID: ', p_book_id, ', ����: ', p_quantity));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. ��������洢����
CREATE OR REPLACE FUNCTION proc_pay_purchase_order(
    p_order_id INT,
    p_operator_id INT
) RETURNS VOID AS $$
DECLARE
    v_status VARCHAR(20);
    v_total_amount DECIMAL(12, 2) := 0;
BEGIN
    -- ��鶩��״̬
    SELECT status INTO v_status FROM purchase_order WHERE order_id = p_order_id;
    
    IF v_status != 'δ����' THEN
        RAISE EXCEPTION 'ֻ��δ����Ķ������Ը���';
    ELSE
        -- �����ܽ��
        SELECT SUM(quantity * purchase_price) INTO v_total_amount 
        FROM purchase_detail 
        WHERE order_id = p_order_id;
        
        -- ���¶���״̬
        UPDATE purchase_order 
        SET status = '�Ѹ���', total_amount = v_total_amount 
        WHERE order_id = p_order_id;
        
        -- ��Ӳ����¼
        INSERT INTO financial_record (type, amount, source_type, source_id, operator_id, description)
        VALUES ('֧��', v_total_amount, '����', p_order_id, p_operator_id, 
                CONCAT('֧��������: ', p_order_id));
        
        -- ��������ͼ��Ŀ�棨�������ᴦ��
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. ������鵽���洢����
CREATE OR REPLACE FUNCTION proc_add_new_book_to_stock(
    p_detail_id INT,
    p_retail_price DECIMAL(10, 2),
    OUT p_book_id INT
) AS $$
DECLARE
    v_isbn VARCHAR(20);
    v_title VARCHAR(200);
    v_author VARCHAR(100);
    v_publisher VARCHAR(100);
    v_quantity INT;
    v_is_new_book BOOLEAN;
    v_order_id INT;
    v_order_status VARCHAR(20);
BEGIN
    -- ��ȡ������ϸ��Ϣ
    SELECT 
        pd.isbn, pd.title, pd.author, pd.publisher, pd.quantity, pd.is_new_book, 
        pd.order_id
    INTO 
        v_isbn, v_title, v_author, v_publisher, v_quantity, v_is_new_book,
        v_order_id
    FROM purchase_detail pd
    WHERE pd.detail_id = p_detail_id;
    
    -- ��鶩��״̬
    SELECT status INTO v_order_status FROM purchase_order WHERE order_id = v_order_id;
    
    IF v_order_status != '�Ѹ���' THEN
        RAISE EXCEPTION 'ֻ���Ѹ���Ķ����е�ͼ�������ӵ����';
    ELSIF v_is_new_book = FALSE THEN
        RAISE EXCEPTION '�ⲻ��һ�����飬Ӧ�ø������п��';
    ELSE
        -- ������鵽ͼ���
        INSERT INTO book (isbn, title, author, publisher, retail_price, stock)
        VALUES (v_isbn, v_title, v_author, v_publisher, p_retail_price, v_quantity)
        RETURNING book_id INTO p_book_id;
        
        -- ���½�����ϸ����������ͼ��ID����
        UPDATE purchase_detail 
        SET book_id = p_book_id, is_new_book = FALSE
        WHERE detail_id = p_detail_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. �Զ��������۲����¼�Ĵ�����
CREATE OR REPLACE FUNCTION trg_after_sale_insert_func()
RETURNS TRIGGER AS $$
BEGIN
    -- ����Ƿ��Ѿ��ж�Ӧ�Ĳ����¼�������ظ�����
    IF NOT EXISTS (SELECT 1 FROM financial_record 
                   WHERE source_type = '����' AND source_id = NEW.sale_id) THEN
        -- ��������¼
        INSERT INTO financial_record (type, amount, source_type, source_id, operator_id, description)
        VALUES ('����', NEW.quantity * NEW.sale_price, '����', NEW.sale_id, NEW.seller_id, 
                CONCAT('����ͼ��ID: ', NEW.book_id, ', ����: ', NEW.quantity));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_sale_insert
AFTER INSERT ON sale_record
FOR EACH ROW
EXECUTE FUNCTION trg_after_sale_insert_func();

-- 5. ͼ������´�����
CREATE OR REPLACE FUNCTION trg_after_purchase_update_func()
RETURNS TRIGGER AS $$
BEGIN
    -- ������״̬��δ�����Ϊ�Ѹ���ʱ�����������ͼ������¿��
    IF NEW.status = '�Ѹ���' AND OLD.status = 'δ����' THEN
        -- ��������ͼ��Ŀ��
        UPDATE book b
        SET stock = stock + pd.quantity
        FROM purchase_detail pd
        WHERE b.book_id = pd.book_id
          AND pd.order_id = NEW.order_id 
          AND pd.is_new_book = FALSE 
          AND pd.book_id IS NOT NULL;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_purchase_update
AFTER UPDATE ON purchase_order
FOR EACH ROW
EXECUTE FUNCTION trg_after_purchase_update_func();