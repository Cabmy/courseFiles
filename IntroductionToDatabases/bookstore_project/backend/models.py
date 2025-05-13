from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import hashlib

# 初始化SQLAlchemy
db = SQLAlchemy()

def init_app(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()

# 用户模型
class User(db.Model):
    __tablename__ = 'user'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(32), nullable=False)
    real_name = db.Column(db.String(100), nullable=False)
    employee_id = db.Column(db.String(20), nullable=False)
    gender = db.Column(db.String(2), nullable=False)
    age = db.Column(db.Integer)
    role = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    @staticmethod
    def hash_password(password):
        return hashlib.md5(password.encode()).hexdigest()

    def check_password(self, password):
        return self.password == hashlib.md5(password.encode()).hexdigest()

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'username': self.username,
            'real_name': self.real_name,
            'employee_id': self.employee_id,
            'gender': self.gender,
            'age': self.age,
            'role': self.role,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

# 图书模型
class Book(db.Model):
    __tablename__ = 'book'
    book_id = db.Column(db.Integer, primary_key=True)
    isbn = db.Column(db.String(20), unique=True, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    publisher = db.Column(db.String(100), nullable=False)
    retail_price = db.Column(db.Numeric(10, 2), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'book_id': self.book_id,
            'isbn': self.isbn,
            'title': self.title,
            'author': self.author,
            'publisher': self.publisher,
            'retail_price': float(self.retail_price),
            'stock': self.stock,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }

# 进货单模型
class PurchaseOrder(db.Model):
    __tablename__ = 'purchase_order'
    order_id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    create_time = db.Column(db.DateTime, default=datetime.now, nullable=False)
    status = db.Column(db.String(10), nullable=False, default='未付款')
    total_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    remark = db.Column(db.String(500))

    # 关系
    creator = db.relationship('User', backref='purchase_orders')
    details = db.relationship('PurchaseDetail', backref='order', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'order_id': self.order_id,
            'creator_id': self.creator_id,
            'creator_name': self.creator.username if self.creator else None,
            'create_time': self.create_time.strftime('%Y-%m-%d %H:%M:%S'),
            'status': self.status,
            'total_amount': float(self.total_amount),
            'remark': self.remark,
            'details': [detail.to_dict() for detail in self.details]
        }

# 进货明细模型
class PurchaseDetail(db.Model):
    __tablename__ = 'purchase_detail'
    detail_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('purchase_order.order_id'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('book.book_id'))
    isbn = db.Column(db.String(20))
    title = db.Column(db.String(200))
    author = db.Column(db.String(100))
    publisher = db.Column(db.String(100))
    quantity = db.Column(db.Integer, nullable=False)
    purchase_price = db.Column(db.Numeric(10, 2), nullable=False)
    is_new_book = db.Column(db.Boolean, nullable=False, default=False)

    # 关系
    book = db.relationship('Book', backref='purchase_details')

    def to_dict(self):
        return {
            'detail_id': self.detail_id,
            'order_id': self.order_id,
            'book_id': self.book_id,
            'isbn': self.isbn or (self.book.isbn if self.book else None),
            'title': self.title or (self.book.title if self.book else None),
            'author': self.author or (self.book.author if self.book else None),
            'publisher': self.publisher or (self.book.publisher if self.book else None),
            'quantity': self.quantity,
            'purchase_price': float(self.purchase_price),
            'is_new_book': self.is_new_book
        }

# 销售记录模型
class SaleRecord(db.Model):
    __tablename__ = 'sale_record'
    sale_id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('book.book_id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    sale_price = db.Column(db.Numeric(10, 2), nullable=False)
    sale_time = db.Column(db.DateTime, default=datetime.now, nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    remark = db.Column(db.String(500))

    # 关系
    book = db.relationship('Book', backref='sale_records')
    seller = db.relationship('User', backref='sales')

    def to_dict(self):
        return {
            'sale_id': self.sale_id,
            'book_id': self.book_id,
            'book_title': self.book.title if self.book else None,
            'quantity': self.quantity,
            'sale_price': float(self.sale_price),
            'total_amount': float(self.sale_price * self.quantity),
            'sale_time': self.sale_time.strftime('%Y-%m-%d %H:%M:%S'),
            'seller_id': self.seller_id,
            'seller_name': self.seller.username if self.seller else None,
            'remark': self.remark
        }

# 财务记录模型
class FinancialRecord(db.Model):
    __tablename__ = 'financial_record'
    record_id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(10), nullable=False)  # 收入/支出
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    source_type = db.Column(db.String(10), nullable=False)  # 进货/销售
    source_id = db.Column(db.Integer, nullable=False)
    record_time = db.Column(db.DateTime, default=datetime.now, nullable=False)
    operator_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    description = db.Column(db.String(500))

    # 关系
    operator = db.relationship('User', backref='financial_records')

    def to_dict(self):
        return {
            'record_id': self.record_id,
            'type': self.type,
            'amount': float(self.amount),
            'source_type': self.source_type,
            'source_id': self.source_id,
            'record_time': self.record_time.strftime('%Y-%m-%d %H:%M:%S'),
            'operator_id': self.operator_id,
            'operator_name': self.operator.username if self.operator else None,
            'description': self.description
        }