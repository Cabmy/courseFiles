from datetime import datetime
from backend import db

class SaleRecord(db.Model):
    """销售记录模型"""
    __tablename__ = 'sale_record'
    
    sale_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    book_id = db.Column(db.Integer, db.ForeignKey('book.book_id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    sale_price = db.Column(db.DECIMAL(10, 2), nullable=False)
    sale_time = db.Column(db.DateTime, nullable=False, default=datetime.now)
    seller_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    remark = db.Column(db.String(500), nullable=True)
    
    def __init__(self, book_id, quantity, sale_price, seller_id, remark=None):
        self.book_id = book_id
        self.quantity = quantity
        self.sale_price = sale_price
        self.seller_id = seller_id
        self.remark = remark
    
    def get_total_amount(self):
        """获取销售总金额"""
        return self.quantity * self.sale_price
    
    def to_dict(self):
        """转换为字典表示"""
        return {
            'sale_id': self.sale_id,
            'book_id': self.book_id,
            'book_title': self.book.title if self.book else '',
            'book_isbn': self.book.isbn if self.book else '',
            'quantity': self.quantity,
            'sale_price': float(self.sale_price),
            'total_amount': float(self.get_total_amount()),
            'sale_time': self.sale_time.strftime('%Y-%m-%d %H:%M:%S'),
            'seller_id': self.seller_id,
            'seller_name': self.seller.real_name if self.seller else '',
            'remark': self.remark
        }
    
    def __repr__(self):
        return f'<SaleRecord {self.sale_id}>'