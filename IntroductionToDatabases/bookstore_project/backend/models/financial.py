from datetime import datetime
from backend import db

class FinancialRecord(db.Model):
    """财务记录模型"""
    __tablename__ = 'financial_record'
    
    record_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    type = db.Column(db.Enum('收入', '支出'), nullable=False)
    amount = db.Column(db.DECIMAL(12, 2), nullable=False)
    source_type = db.Column(db.Enum('进货', '销售'), nullable=False)
    source_id = db.Column(db.Integer, nullable=False)
    record_time = db.Column(db.DateTime, nullable=False, default=datetime.now)
    operator_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    
    def __init__(self, type, amount, source_type, source_id, operator_id, description=None):
        self.type = type
        self.amount = amount
        self.source_type = source_type
        self.source_id = source_id
        self.operator_id = operator_id
        self.description = description
    
    def to_dict(self):
        """转换为字典表示"""
        return {
            'record_id': self.record_id,
            'type': self.type,
            'amount': float(self.amount),
            'source_type': self.source_type,
            'source_id': self.source_id,
            'record_time': self.record_time.strftime('%Y-%m-%d %H:%M:%S'),
            'operator_id': self.operator_id,
            'operator_name': self.operator.real_name if self.operator else '',
            'description': self.description
        }
    
    def __repr__(self):
        return f'<FinancialRecord {self.record_id}>'


class FinancialSummary(db.Model):
    """财务汇总模型（按日期统计）"""
    __tablename__ = 'financial_summary'
    
    summary_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    summary_date = db.Column(db.Date, nullable=False, unique=True)
    total_income = db.Column(db.DECIMAL(12, 2), nullable=False, default=0)
    total_expense = db.Column(db.DECIMAL(12, 2), nullable=False, default=0)
    sale_income = db.Column(db.DECIMAL(12, 2), nullable=False, default=0)
    purchase_expense = db.Column(db.DECIMAL(12, 2), nullable=False, default=0)
    other_income = db.Column(db.DECIMAL(12, 2), nullable=False, default=0)
    other_expense = db.Column(db.DECIMAL(12, 2), nullable=False, default=0)
    create_time = db.Column(db.DateTime, nullable=False, default=datetime.now)
    update_time = db.Column(db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
    
    def __init__(self, summary_date, total_income=0, total_expense=0, 
                 sale_income=0, purchase_expense=0, other_income=0, other_expense=0):
        self.summary_date = summary_date
        self.total_income = total_income
        self.total_expense = total_expense
        self.sale_income = sale_income
        self.purchase_expense = purchase_expense
        self.other_income = other_income
        self.other_expense = other_expense
    
    @property
    def net_profit(self):
        """获取净利润
        
        Returns:
            float: 净利润
        """
        return float(self.total_income) - float(self.total_expense)
    
    def to_dict(self):
        """转换为字典表示
        
        Returns:
            dict: 财务汇总信息字典
        """
        return {
            'summary_id': self.summary_id,
            'summary_date': self.summary_date.strftime('%Y-%m-%d'),
            'total_income': float(self.total_income),
            'total_expense': float(self.total_expense),
            'net_profit': self.net_profit,
            'sale_income': float(self.sale_income),
            'purchase_expense': float(self.purchase_expense),
            'other_income': float(self.other_income),
            'other_expense': float(self.other_expense),
            'create_time': self.create_time.strftime('%Y-%m-%d %H:%M:%S'),
            'update_time': self.update_time.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    @staticmethod
    def generate_daily_summary(target_date):
        """生成指定日期的财务汇总
        
        Args:
            target_date: 目标日期
            
        Returns:
            FinancialSummary: 生成的财务汇总
        """
        from datetime import datetime, time
        
        # 构造当天开始和结束时间
        start_datetime = datetime.combine(target_date, time.min)
        end_datetime = datetime.combine(target_date, time.max)
        
        # 获取当天财务数据
        summary_data = FinancialRecord.get_financial_summary(start_datetime, end_datetime)
        
        # 查找是否已存在当天汇总
        existing_summary = FinancialSummary.query.filter_by(summary_date=target_date).first()
        
        if existing_summary:
            # 更新现有汇总
            existing_summary.total_income = summary_data['total_income']
            existing_summary.total_expense = summary_data['total_expense']
            existing_summary.sale_income = summary_data['sale_income']
            existing_summary.purchase_expense = summary_data['purchase_expense']
            existing_summary.other_income = summary_data['other_income']
            existing_summary.other_expense = summary_data['other_expense']
            return existing_summary
        else:
            # 创建新汇总
            new_summary = FinancialSummary(
                summary_date=target_date,
                total_income=summary_data['total_income'],
                total_expense=summary_data['total_expense'],
                sale_income=summary_data['sale_income'],
                purchase_expense=summary_data['purchase_expense'],
                other_income=summary_data['other_income'],
                other_expense=summary_data['other_expense']
            )
            db.session.add(new_summary)
            return new_summary
    
    def __repr__(self):
        return f'<FinancialSummary {self.summary_date}>'