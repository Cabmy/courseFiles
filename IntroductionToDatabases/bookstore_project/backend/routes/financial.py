from flask import Blueprint, request, g
from sqlalchemy import func
from datetime import datetime, timedelta
from backend import db
from backend.models.financial import FinancialRecord, FinancialSummary
from backend.utils.response_helper import success_response, error_response, validation_error
from backend.utils.auth_helper import admin_required, login_required

financial_bp = Blueprint('financial', __name__)

@financial_bp.route('/records', methods=['GET'])
@admin_required
def get_financial_records():
    """获取财务记录列表
    
    Returns:
        JSON: 财务记录列表
    """
    # 分页参数
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # 过滤参数
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    record_type = request.args.get('record_type')
    source_type = request.args.get('source_type')
    
    # 构建查询
    query = FinancialRecord.query
    
    # 应用过滤条件
    if start_date:
        query = query.filter(FinancialRecord.record_time >= start_date)
    if end_date:
        query = query.filter(FinancialRecord.record_time <= end_date)
    if record_type:
        query = query.filter(FinancialRecord.record_type == record_type)
    if source_type:
        query = query.filter(FinancialRecord.source_type == source_type)
    
    # 按时间倒序排序
    query = query.order_by(FinancialRecord.record_time.desc())
    
    # 执行分页查询
    records = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # 准备响应数据
    result = {
        'items': [record.to_dict() for record in records.items],
        'meta': {
            'page': records.page,
            'per_page': records.per_page,
            'total': records.total,
            'pages': records.pages
        }
    }
    
    return success_response(result, "获取财务记录成功")

@financial_bp.route('/summary', methods=['GET'])
@admin_required
def get_financial_summary():
    """获取财务统计信息
    
    Returns:
        JSON: 财务统计信息
    """
    # 时间范围参数
    period = request.args.get('period', 'today')  # today, week, month, year, custom
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # 根据period确定时间范围
    today = datetime.now().date()
    if period == 'today':
        start_date = today
        end_date = today
    elif period == 'week':
        start_date = today - timedelta(days=today.weekday())
        end_date = today
    elif period == 'month':
        start_date = today.replace(day=1)
        end_date = today
    elif period == 'year':
        start_date = today.replace(month=1, day=1)
        end_date = today
    elif period == 'custom':
        if not start_date or not end_date:
            return validation_error({'message': '自定义时间范围需要提供开始和结束日期'})
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return validation_error({'message': '日期格式不正确，应为YYYY-MM-DD'})
    
    # 获取财务汇总数据
    summary = FinancialRecord.get_financial_summary(
        datetime.combine(start_date, datetime.min.time()),
        datetime.combine(end_date, datetime.max.time())
    )
    
    # 添加时间范围信息
    summary['period'] = {
        'start_date': start_date.strftime('%Y-%m-%d'),
        'end_date': end_date.strftime('%Y-%m-%d')
    }
    
    return success_response(summary, "获取财务统计成功")

@financial_bp.route('/daily-summary', methods=['GET'])
@admin_required
def get_daily_summary():
    """获取每日财务汇总
    
    Returns:
        JSON: 每日财务汇总列表
    """
    # 时间范围参数
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return validation_error({'message': '日期格式不正确，应为YYYY-MM-DD'})
    
    # 构建查询
    query = FinancialSummary.query
    
    if start_date:
        query = query.filter(FinancialSummary.summary_date >= start_date)
    if end_date:
        query = query.filter(FinancialSummary.summary_date <= end_date)
    
    # 按日期排序
    query = query.order_by(FinancialSummary.summary_date.desc())
    
    # 获取汇总数据
    summaries = query.all()
    
    return success_response([summary.to_dict() for summary in summaries], "获取每日汇总成功")

@financial_bp.route('/records/<int:record_id>', methods=['GET'])
@admin_required
def get_financial_record(record_id):
    """获取单条财务记录详情
    
    Args:
        record_id: 财务记录ID
        
    Returns:
        JSON: 财务记录详情
    """
    record = FinancialRecord.query.get(record_id)
    
    if not record:
        return error_response("财务记录不存在", 404)
    
    return success_response(record.to_dict(), "获取财务记录详情成功")

@financial_bp.route('/records/<int:record_id>', methods=['PUT'])
@admin_required
def update_financial_record(record_id):
    """更新财务记录备注信息
    
    Args:
        record_id: 财务记录ID
        
    Returns:
        JSON: 更新结果
    """
    record = FinancialRecord.query.get(record_id)
    
    if not record:
        return error_response("财务记录不存在", 404)
    
    data = request.get_json()
    
    try:
        if 'remark' in data:
            record.remark = data['remark']
        
        db.session.commit()
        
        return success_response(record.to_dict(), "财务记录更新成功")
    
    except Exception as e:
        db.session.rollback()
        return error_response(f"更新财务记录失败: {str(e)}", 500)

@financial_bp.route('/generate-daily-summary', methods=['POST'])
@admin_required
def generate_daily_summary():
    """生成指定日期的财务汇总
    
    Returns:
        JSON: 生成结果
    """
    data = request.get_json()
    
    try:
        target_date = datetime.strptime(data.get('date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date()
    except ValueError:
        return validation_error({'message': '日期格式不正确，应为YYYY-MM-DD'})
    
    try:
        summary = FinancialSummary.generate_daily_summary(target_date)
        db.session.commit()
        
        return success_response(summary.to_dict(), "生成每日汇总成功")
    
    except Exception as e:
        db.session.rollback()
        return error_response(f"生成每日汇总失败: {str(e)}", 500)

@financial_bp.route('/summary-trends', methods=['GET'])
@login_required
def get_summary_trends():
    """获取财务趋势数据，用于图表显示
    
    Returns:
        JSON: 财务趋势数据
    """
    days = request.args.get('days', 30, type=int)
    
    # 限制最大查询天数
    if days > 365:
        days = 365
    
    # 计算时间范围
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days-1)  # 包含今天
    
    # 查询每日收入和支出
    income_data = db.session.query(
        func.date(FinancialRecord.record_time).label('date'),
        func.sum(FinancialRecord.amount).label('amount')
    ).filter(
        FinancialRecord.record_type == '收入',
        func.date(FinancialRecord.record_time) >= start_date,
        func.date(FinancialRecord.record_time) <= end_date
    ).group_by(func.date(FinancialRecord.record_time)).all()
    
    expense_data = db.session.query(
        func.date(FinancialRecord.record_time).label('date'),
        func.sum(FinancialRecord.amount).label('amount')
    ).filter(
        FinancialRecord.record_type == '支出',
        func.date(FinancialRecord.record_time) >= start_date,
        func.date(FinancialRecord.record_time) <= end_date
    ).group_by(func.date(FinancialRecord.record_time)).all()
    
    # 准备返回数据
    dates = [(start_date + timedelta(days=d)).strftime('%m-%d') for d in range(days)]
    income = [0] * days
    expense = [0] * days
    
    # 填充收入数据
    for record in income_data:
        day_index = (record.date - start_date).days
        if 0 <= day_index < days:
            income[day_index] = float(record.amount)
    
    # 填充支出数据
    for record in expense_data:
        day_index = (record.date - start_date).days
        if 0 <= day_index < days:
            expense[day_index] = float(record.amount)
    
    return success_response({
        'dates': dates,
        'income': income,
        'expense': expense
    }, "获取财务趋势数据成功")