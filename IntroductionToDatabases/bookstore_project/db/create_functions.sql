-- 连接到数据库
\c bookstore_management;

-- 1. 销售图书存储过程
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
    -- 检查库存是否足够
    SELECT stock INTO current_stock FROM book WHERE book_id = p_book_id;
    
    IF current_stock < p_quantity THEN
        v_error_msg := CONCAT('库存不足，当前库存: ', current_stock, ', 需要: ', p_quantity);
        RAISE EXCEPTION '%', v_error_msg;
    ELSE
        -- 插入销售记录
        INSERT INTO sale_record (book_id, quantity, sale_price, seller_id, remark)
        VALUES (p_book_id, p_quantity, p_sale_price, p_seller_id, p_remark)
        RETURNING sale_id INTO p_sale_id;
        
        -- 更新库存
        UPDATE book SET stock = stock - p_quantity WHERE book_id = p_book_id;
        
        -- 添加财务记录
        INSERT INTO financial_record (type, amount, source_type, source_id, operator_id, description)
        VALUES ('收入', p_quantity * p_sale_price, '销售', p_sale_id, p_seller_id, 
                CONCAT('销售图书ID: ', p_book_id, ', 数量: ', p_quantity));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. 进货付款存储过程
CREATE OR REPLACE FUNCTION proc_pay_purchase_order(
    p_order_id INT,
    p_operator_id INT
) RETURNS VOID AS $$
DECLARE
    v_status VARCHAR(20);
    v_total_amount DECIMAL(12, 2) := 0;
BEGIN
    -- 检查订单状态
    SELECT status INTO v_status FROM purchase_order WHERE order_id = p_order_id;
    
    IF v_status != '未付款' THEN
        RAISE EXCEPTION '只有未付款的订单可以付款';
    ELSE
        -- 计算总金额
        SELECT SUM(quantity * purchase_price) INTO v_total_amount 
        FROM purchase_detail 
        WHERE order_id = p_order_id;
        
        -- 更新订单状态
        UPDATE purchase_order 
        SET status = '已付款', total_amount = v_total_amount 
        WHERE order_id = p_order_id;
        
        -- 添加财务记录
        INSERT INTO financial_record (type, amount, source_type, source_id, operator_id, description)
        VALUES ('支出', v_total_amount, '进货', p_order_id, p_operator_id, 
                CONCAT('支付进货单: ', p_order_id));
        
        -- 更新已有图书的库存（触发器会处理）
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. 添加新书到库存存储过程
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
    -- 获取进货明细信息
    SELECT 
        pd.isbn, pd.title, pd.author, pd.publisher, pd.quantity, pd.is_new_book, 
        pd.order_id
    INTO 
        v_isbn, v_title, v_author, v_publisher, v_quantity, v_is_new_book,
        v_order_id
    FROM purchase_detail pd
    WHERE pd.detail_id = p_detail_id;
    
    -- 检查订单状态
    SELECT status INTO v_order_status FROM purchase_order WHERE order_id = v_order_id;
    
    IF v_order_status != '已付款' THEN
        RAISE EXCEPTION '只有已付款的订单中的图书才能添加到库存';
    ELSIF v_is_new_book = FALSE THEN
        RAISE EXCEPTION '这不是一本新书，应该更新现有库存';
    ELSE
        -- 添加新书到图书表
        INSERT INTO book (isbn, title, author, publisher, retail_price, stock)
        VALUES (v_isbn, v_title, v_author, v_publisher, p_retail_price, v_quantity)
        RETURNING book_id INTO p_book_id;
        
        -- 更新进货明细，将新书与图书ID关联
        UPDATE purchase_detail 
        SET book_id = p_book_id, is_new_book = FALSE
        WHERE detail_id = p_detail_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. 自动生成销售财务记录的触发器
CREATE OR REPLACE FUNCTION trg_after_sale_insert_func()
RETURNS TRIGGER AS $$
BEGIN
    -- 检查是否已经有对应的财务记录，避免重复插入
    IF NOT EXISTS (SELECT 1 FROM financial_record 
                   WHERE source_type = '销售' AND source_id = NEW.sale_id) THEN
        -- 插入财务记录
        INSERT INTO financial_record (type, amount, source_type, source_id, operator_id, description)
        VALUES ('收入', NEW.quantity * NEW.sale_price, '销售', NEW.sale_id, NEW.seller_id, 
                CONCAT('销售图书ID: ', NEW.book_id, ', 数量: ', NEW.quantity));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_sale_insert
AFTER INSERT ON sale_record
FOR EACH ROW
EXECUTE FUNCTION trg_after_sale_insert_func();

-- 5. 图书库存更新触发器
CREATE OR REPLACE FUNCTION trg_after_purchase_update_func()
RETURNS TRIGGER AS $$
BEGIN
    -- 当订单状态从未付款变为已付款时，如果是已有图书则更新库存
    IF NEW.status = '已付款' AND OLD.status = '未付款' THEN
        -- 更新已有图书的库存
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