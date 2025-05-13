from datetime import datetime, timedelta
from sqlalchemy import func
from backend import db
from backend.models.financial import FinancialRecord, FinancialSummary

class FinancialService:
    """财务服务类"""
    
    @staticmethod
    def get_financial_records(filters=None, page=1, per_page=20):
        """获取财务记录列表
        
        Args:
            filters: 过滤条件字典
            page: 页码
            per_page: 每页记录数
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            query = FinancialRecord.query
            
            # 应用过滤条件
            if filters:
                if 'start_date' in filters:
                    query = query.filter(FinancialRecord.record_time >= filters['start_date'])
                if 'end_date' in filters:
                    query = query.filter(FinancialRecord.record_time <= filters['end_date'])
                if 'record_type' in filters:
                    query = query.filter(FinancialRecord.record_type == filters['record_type'])
                if 'source_type' in filters:
                    query = query.filter(FinancialRecord.source_type == filters['source_type'])
            
            # 按时间倒序排序
            query = query.order_by(FinancialRecord.record_time.desc())
            
            # 执行分页查询
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            
            result = {
                'items': [record.to_dict() for record in pagination.items],
                'meta': {
                    'page': pagination.page,
                    'per_page': pagination.per_page,
                    'total': pagination.total,
                    'pages': pagination.pages
                }
            }
            
            return True, result
            
        except Exception as e:
            return False, f"获取财务记录失败: {str(e)}"

    @staticmethod
    def create_financial_record(data):
        """创建财务记录
        
        Args:
            data: 财务记录数据字典
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            # 数据验证
            required_fields = ['amount', 'record_type', 'source_type', 'operator_id']
            if not all(field in data for field in required_fields):
                return False, f"缺少必要字段: {', '.join(required_fields)}"
            
            # 创建记录
            record = FinancialRecord(
                amount=data['amount'],
                record_type=data['record_type'],
                source_type=data['source_type'],
                source_id=data.get('source_id'),
                payment_method=data.get('payment_method', '现金'),
                operator_id=data['operator_id'],
                remark=data.get('remark')
            )
            
            db.session.add(record)
            db.session.commit()
            
            return True, record.to_dict()
            
        except Exception as e:
            db.session.rollback()
            return False, f"创建财务记录失败: {str(e)}"

    @staticmethod
    def get_financial_summary(start_date=None, end_date=None):
        """获取财务统计信息
        
        Args:
            start_date: 开始日期
            end_date: 结束日期
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            summary = FinancialRecord.get_financial_summary(start_date, end_date)
            return True, summary
            
        except Exception as e:
            return False, f"获取财务统计失败: {str(e)}"

    @staticmethod
    def get_daily_summary(target_date=None):
        """获取指定日期的财务汇总
        
        Args:
            target_date: 目标日期，默认为当天
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            if target_date is None:
                target_date = datetime.now().date()
                
            # 查找或生成日汇总
            summary = FinancialSummary.query.filter_by(summary_date=target_date).first()
            if not summary:
                summary = FinancialSummary.generate_daily_summary(target_date)
                db.session.commit()
            
            return True, summary.to_dict()
            
        except Exception as e:
            db.session.rollback()
            return False, f"获取日汇总失败: {str(e)}"

    @staticmethod
    def generate_period_summary(start_date, end_date):
        """生成指定时间段的财务汇总
        
        Args:
            start_date: 开始日期
            end_date: 结束日期
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            # 确保日期格式正确
            if isinstance(start_date, str):
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            if isinstance(end_date, str):
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                
            # 获取时间范围内的所有日期
            current_date = start_date
            summaries = []
            
            while current_date <= end_date:
                summary = FinancialSummary.generate_daily_summary(current_date)
                summaries.append(summary.to_dict())
                current_date += timedelta(days=1)
            
            db.session.commit()
            
            return True, summaries
            
        except Exception as e:
            db.session.rollback()
            return False, f"生成时间段汇总失败: {str(e)}"

    @staticmethod
    def get_summary_trends(days=30):
        """获取财务趋势数据
        
        Args:
            days: 统计天数
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days-1)
            
            # 查询时间范围内的汇总数据
            summaries = FinancialSummary.query\
                .filter(FinancialSummary.summary_date.between(start_date, end_date))\
                .order_by(FinancialSummary.summary_date.asc())\
                .all()
            
            # 转换为趋势数据格式
            trends = {
                'dates': [],
                'income': [],
                'expense': [],
                'profit': []
            }
            
            for summary in summaries:
                trends['dates'].append(summary.summary_date.strftime('%Y-%m-%d'))
                trends['income'].append(float(summary.total_income))
                trends['expense'].append(float(summary.total_expense))
                trends['profit'].append(summary.net_profit)
            
            return True, trends
            
        except Exception as e:
            return False, f"获取财务趋势失败: {str(e)}"