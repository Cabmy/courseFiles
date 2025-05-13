from datetime import datetime
from backend import db

class PurchaseOrder(db.Model):
    """进货单模型"""
    __tablename__ = 'purchase_order'
    
    order_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    create_time = db.Column(db.DateTime, nullable=False, default=datetime.now)
    status = db.Column(db.Enum('未付款', '已付款', '已退货'), nullable=False, default='未付款')
    total_amount = db.Column(db.DECIMAL(12, 2), nullable=False, default=0)
    remark = db.Column(db.String(500), nullable=True)
    
    # 反向引用
    details = db.relationship('PurchaseDetail', backref='order', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, creator_id, remark=None):
        self.creator_id = creator_id
        self.remark = remark
    
    def update_total_amount(self):
        """根据明细更新总金额"""
        total = sum(detail.quantity * detail.purchase_price for detail in self.details)
        self.total_amount = total
    
    def to_dict(self):
        """转换为字典表示"""
        return {
            'order_id': self.order_id,
            'creator_id': self.creator_id,
            'creator_name': self.creator.real_name if self.creator else '',
            'create_time': self.create_time.strftime('%Y-%m-%d %H:%M:%S'),
            'status': self.status,
            'total_amount': float(self.total_amount),
            'remark': self.remark,
            'details_count': len(self.details),
            'details': [detail.to_dict() for detail in self.details]
        }
    
    def __repr__(self):
        return f'<PurchaseOrder {self.order_id}>'


class PurchaseDetail(db.Model):
    """进货明细模型"""
    __tablename__ = 'purchase_detail'
    
    detail_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.Integer, db.ForeignKey('purchase_order.order_id'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('book.book_id'), nullable=True)
    isbn = db.Column(db.String(20), nullable=True)
    title = db.Column(db.String(200), nullable=True)
    author = db.Column(db.String(100), nullable=True)
    publisher = db.Column(db.String(100), nullable=True)
    quantity = db.Column(db.Integer, nullable=False)
    purchase_price = db.Column(db.DECIMAL(10, 2), nullable=False)
    is_new_book = db.Column(db.Boolean, nullable=False, default=False)
    
    def __init__(self, order_id, quantity, purchase_price, book_id=None, 
                 isbn=None, title=None, author=None, publisher=None, is_new_book=False):
        self.order_id = order_id
        self.quantity = quantity
        self.purchase_price = purchase_price
        self.book_id = book_id
        self.isbn = isbn
        self.title = title
        self.author = author
        self.publisher = publisher
        self.is_new_book = is_new_book
    
    def to_dict(self):
        """转换为字典表示"""
        return {
            'detail_id': self.detail_id,
            'order_id': self.order_id,
            'book_id': self.book_id,
            'isbn': self.isbn,
            'title': self.title or (self.book.title if self.book else ''),
            'author': self.author or (self.book.author if self.book else ''),
            'publisher': self.publisher or (self.book.publisher if self.book else ''),
            'quantity': self.quantity,
            'purchase_price': float(self.purchase_price),
            'is_new_book': self.is_new_book,
            'subtotal': float(self.quantity * self.purchase_price)
        }
    
    def __repr__(self):
        return f'<PurchaseDetail {self.detail_id}>'