CREATE INDEX idx_book_title ON book(title);
CREATE INDEX idx_book_author ON book(author);
CREATE INDEX idx_book_publisher ON book(publisher);
CREATE INDEX idx_purchase_order_status ON purchase_order(status);
CREATE INDEX idx_purchase_order_creator ON purchase_order(creator_id);
CREATE INDEX idx_sale_seller ON sale_record(seller_id);
CREATE INDEX idx_sale_time ON sale_record(sale_time);
CREATE INDEX idx_financial_source ON financial_record(source_type, source_id);