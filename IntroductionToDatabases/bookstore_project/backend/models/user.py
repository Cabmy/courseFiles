import hashlib
from datetime import datetime
from backend import db

class User(db.Model):
    """用户模型"""
    __tablename__ = 'user'
    
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(32), nullable=False)  # MD5加密的密码
    real_name = db.Column(db.String(255), nullable=False)
    employee_id = db.Column(db.String(20), nullable=False)
    gender = db.Column(db.Enum('男', '女'), nullable=False)
    age = db.Column(db.Integer, nullable=True)
    role = db.Column(db.Enum('超级管理员', '普通管理员'), nullable=False)
    created_at = db.Column(db.TIMESTAMP, default=datetime.now)
    
    # 反向引用
    purchase_orders = db.relationship('PurchaseOrder', backref='creator', lazy=True)
    sale_records = db.relationship('SaleRecord', backref='seller', lazy=True)
    financial_records = db.relationship('FinancialRecord', backref='operator', lazy=True)
    
    def __init__(self, username, password, real_name, employee_id, gender, role, age=None):
        self.username = username
        self.set_password(password)
        self.real_name = real_name
        self.employee_id = employee_id
        self.gender = gender
        self.role = role
        self.age = age
    
    def set_password(self, password):
        """设置密码（MD5加密）"""
        self.password = hashlib.md5(password.encode()).hexdigest()
    
    def check_password(self, password):
        """验证密码
        
        Args:
            password: 明文密码
            
        Returns:
            bool: 密码是否正确
        """
        return self.password == hashlib.md5(password.encode()).hexdigest()
    
    def is_admin(self):
        """判断是否是管理员"""
        return self.role == '超级管理员'
    
    def to_dict(self):
        """转换为字典表示
        
        Returns:
            dict: 用户信息字典（不包含密码）
        """
        return {
            'user_id': self.user_id,
            'username': self.username,
            'real_name': self.real_name,
            'employee_id': self.employee_id,
            'gender': self.gender,
            'age': self.age,
            'role': self.role,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    def __repr__(self):
        return f'<User {self.username}>'