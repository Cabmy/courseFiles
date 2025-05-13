-- 1. 销售图书存储过程
DELIMITER //
CREATE PROCEDURE proc_sell_book(
    IN p_book_id INT,
    IN p_quantity INT,
    IN p_seller_id INT,
    IN p_sale_price DECIMAL(10, 2),
    IN p_remark VARCHAR(500),
    OUT p_sale_id INT
)
BEGIN
    DECLARE current_stock INT;
    DECLARE v_error_msg VARCHAR(100);
    
    -- 检查库存是否足够
    SELECT stock INTO current_stock FROM book WHERE book_id = p_book_id;
    
    IF current_stock < p_quantity THEN
        SET v_error_msg = CONCAT('库存不足，当前库存: ', current_stock, ', 需要: ', p_quantity);
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_msg;
    ELSE
        -- 开始事务
        START TRANSACTION;
        
        -- 插入销售记录
        INSERT INTO sale_record (book_id, quantity, sale_price, seller_id, remark)
        VALUES (p_book_id, p_quantity, p_sale_price, p_seller_id, p_remark);
        
        -- 获取新插入的销售ID
        SET p_sale_id = LAST_INSERT_ID();
        
        -- 更新库存
        UPDATE book SET stock = stock - p_quantity WHERE book_id = p_book_id;
        
        -- 添加财务记录
        INSERT INTO financial_record (type, amount, source_type, source_id, operator_id, description)
        VALUES ('收入', p_quantity * p_sale_price, '销售', p_sale_id, p_seller_id, 
                CONCAT('销售图书ID: ', p_book_id, ', 数量: ', p_quantity));
        
        -- 提交事务
        COMMIT;
    END IF;
END //
DELIMITER ;

-- 2. 进货付款存储过程
DELIMITER //
CREATE PROCEDURE proc_pay_purchase_order(
    IN p_order_id INT,
    IN p_operator_id INT
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_total_amount DECIMAL(12, 2) DEFAULT 0;
    
    -- 检查订单状态
    SELECT status INTO v_status FROM purchase_order WHERE order_id = p_order_id;
    
    IF v_status != '未付款' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '只有未付款的订单可以付款';
    ELSE
        -- 计算总金额
        SELECT SUM(quantity * purchase_price) INTO v_total_amount 
        FROM purchase_detail 
        WHERE order_id = p_order_id;
        
        -- 开始事务
        START TRANSACTION;
        
        -- 更新订单状态
        UPDATE purchase_order 
        SET status = '已付款', total_amount = v_total_amount 
        WHERE order_id = p_order_id;
        
        -- 添加财务记录
        INSERT INTO financial_record (type, amount, source_type, source_id, operator_id, description)
        VALUES ('支出', v_total_amount, '进货', p_order_id, p_operator_id, 
                CONCAT('支付进货单: ', p_order_id));
        
        -- 提交事务
        COMMIT;
    END IF;
END //
DELIMITER ;

-- 3. 添加新书到库存存储过程
DELIMITER //
CREATE PROCEDURE proc_add_new_book_to_stock(
    IN p_detail_id INT,
    IN p_retail_price DECIMAL(10, 2),
    OUT p_book_id INT
)
BEGIN
    DECLARE v_isbn VARCHAR(20);
    DECLARE v_title VARCHAR(200);
    DECLARE v_author VARCHAR(100);
    DECLARE v_publisher VARCHAR(100);
    DECLARE v_quantity INT;
    DECLARE v_is_new_book BOOLEAN;
    DECLARE v_order_id INT;
    DECLARE v_order_status VARCHAR(20);
    
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
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '只有已付款的订单中的图书才能添加到库存';
    ELSEIF v_is_new_book = FALSE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '这不是一本新书，应该更新现有库存';
    ELSE
        -- 开始事务
        START TRANSACTION;
        
        -- 添加新书到图书表
        INSERT INTO book (isbn, title, author, publisher, retail_price, stock)
        VALUES (v_isbn, v_title, v_author, v_publisher, p_retail_price, v_quantity);
        
        -- 获取新书ID
        SET p_book_id = LAST_INSERT_ID();
        
        -- 更新进货明细，将新书与图书ID关联
        UPDATE purchase_detail 
        SET book_id = p_book_id, is_new_book = FALSE
        WHERE detail_id = p_detail_id;
        
        -- 提交事务
        COMMIT;
    END IF;
END //
DELIMITER ;

-- 4. 自动生成销售财务记录的触发器
DELIMITER //
CREATE TRIGGER trg_after_sale_insert
AFTER INSERT ON sale_record
FOR EACH ROW
BEGIN
    -- 检查是否已经有对应的财务记录，避免重复插入
    IF NOT EXISTS (SELECT 1 FROM financial_record 
                   WHERE source_type = '销售' AND source_id = NEW.sale_id) THEN
        -- 插入财务记录
        INSERT INTO financial_record (type, amount, source_type, source_id, operator_id, description)
        VALUES ('收入', NEW.quantity * NEW.sale_price, '销售', NEW.sale_id, NEW.seller_id, 
                CONCAT('销售图书ID: ', NEW.book_id, ', 数量: ', NEW.quantity));
    END IF;
END //
DELIMITER ;

-- 5. 图书库存更新触发器
DELIMITER //
CREATE TRIGGER trg_after_purchase_update
AFTER UPDATE ON purchase_order
FOR EACH ROW
BEGIN
    -- 当订单状态从未付款变为已付款时，如果是已有图书则更新库存
    IF NEW.status = '已付款' AND OLD.status = '未付款' THEN
        -- 更新已有图书的库存
        UPDATE book b
        JOIN purchase_detail pd ON b.book_id = pd.book_id
        SET b.stock = b.stock + pd.quantity
        WHERE pd.order_id = NEW.order_id AND pd.is_new_book = FALSE AND pd.book_id IS NOT NULL;
    END IF;
END //
DELIMITER ;