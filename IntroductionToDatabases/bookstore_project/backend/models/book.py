from datetime import datetime
from backend import db

class Book(db.Model):
    """图书模型"""
    __tablename__ = 'book'
    
    book_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    isbn = db.Column(db.String(20), unique=True, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    publisher = db.Column(db.String(100), nullable=False)
    retail_price = db.Column(db.DECIMAL(10, 2), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.TIMESTAMP, default=datetime.now)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.now, onupdate=datetime.now)
    
    # 反向引用
    purchase_details = db.relationship('PurchaseDetail', backref='book', lazy=True)
    sale_records = db.relationship('SaleRecord', backref='book', lazy=True)
    
    def __init__(self, isbn, title, author, publisher, retail_price, stock=0):
        self.isbn = isbn
        self.title = title
        self.author = author
        self.publisher = publisher
        self.retail_price = retail_price
        self.stock = stock
    
    def update_stock(self, quantity_change):
        """更新库存
        
        Args:
            quantity_change: 库存变化量（正数增加，负数减少）
            
        Returns:
            bool: 是否更新成功
        """
        # 如果是减库存操作，检查库存是否足够
        if quantity_change < 0 and self.stock + quantity_change < 0:
            return False
            
        self.stock += quantity_change
        return True
    
    def to_dict(self):
        """转换为字典表示
        
        Returns:
            dict: 图书信息字典
        """
        return {
            'book_id': self.book_id,
            'isbn': self.isbn,
            'title': self.title,
            'author': self.author,
            'publisher': self.publisher,
            'retail_price': float(self.retail_price),
            'stock': self.stock,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
        }
    
    def __repr__(self):
        return f'<Book {self.title}>'