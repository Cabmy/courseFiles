from flask import Blueprint, request, jsonify, session
from backend.models import db, FinancialRecord, User
from backend.routes.user_routes import login_required, admin_required
from sqlalchemy import func, extract, text
from datetime import datetime, timedelta

finance_bp = Blueprint('finance_bp', __name__)

# 获取所有财务记录
@finance_bp.route('/', methods=['GET'])
@login_required
def get_all_financial_records():
    # 支持按日期范围、类型筛选
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    record_type = request.args.get('type')  # 收入/支出
    source_type = request.args.get('source_type')  # 进货/销售
    
    query = FinancialRecord.query
    
    if start_date:
        query = query.filter(FinancialRecord.record_time >= start_date)
    if end_date:
        query = query.filter(FinancialRecord.record_time <= end_date)
    if record_type:
        query = query.filter(FinancialRecord.type == record_type)
    if source_type:
        query = query.filter(FinancialRecord.source_type == source_type)
    
    # 按记录时间倒序排序
    records = query.order_by(FinancialRecord.record_time.desc()).all()
    
    return jsonify({
        'records': [record.to_dict() for record in records]
    })

# 获取月度财务统计
@finance_bp.route('/monthly', methods=['GET'])
@login_required
def get_monthly_statistics():
    # 可选参数：年份
    year = request.args.get('year', datetime.now().year)
    
    # 查询月度收支统计
    results = db.session.execute(text("""
        SELECT 
            TO_CHAR(record_time, 'YYYY-MM') AS month,
            type,
            SUM(amount) AS total_amount
        FROM financial_record
        WHERE EXTRACT(YEAR FROM record_time) = :year
        GROUP BY TO_CHAR(record_time, 'YYYY-MM'), type
        ORDER BY month, type
    """), {"year": year}).fetchall()
    
    # 构建返回数据
    monthly_stats = []
    for r in results:
        monthly_stats.append({
            'month': r[0],
            'type': r[1],
            'total_amount': float(r[2])
        })
    
    return jsonify({'monthly_statistics': monthly_stats})

# 获取总体财务概况
@finance_bp.route('/summary', methods=['GET'])
@login_required
def get_finance_summary():
    # 总收入
    total_income = db.session.query(
        func.sum(FinancialRecord.amount)
    ).filter(FinancialRecord.type == '收入').scalar() or 0
    
    # 总支出
    total_expense = db.session.query(
        func.sum(FinancialRecord.amount)
    ).filter(FinancialRecord.type == '支出').scalar() or 0
    
    # 本月收入
    current_month_start = datetime(datetime.now().year, datetime.now().month, 1)
    current_month_income = db.session.query(
        func.sum(FinancialRecord.amount)
    ).filter(
        FinancialRecord.type == '收入',
        FinancialRecord.record_time >= current_month_start
    ).scalar() or 0
    
    # 本月支出
    current_month_expense = db.session.query(
        func.sum(FinancialRecord.amount)
    ).filter(
        FinancialRecord.type == '支出',
        FinancialRecord.record_time >= current_month_start
    ).scalar() or 0
    
    # 上月收入
    last_month_start = current_month_start - timedelta(days=current_month_start.day)
    last_month_end = current_month_start - timedelta(days=1)
    last_month_income = db.session.query(
        func.sum(FinancialRecord.amount)
    ).filter(
        FinancialRecord.type == '收入',
        FinancialRecord.record_time >= last_month_start,
        FinancialRecord.record_time <= last_month_end
    ).scalar() or 0
    
    # 上月支出
    last_month_expense = db.session.query(
        func.sum(FinancialRecord.amount)
    ).filter(
        FinancialRecord.type == '支出',
        FinancialRecord.record_time >= last_month_start,
        FinancialRecord.record_time <= last_month_end
    ).scalar() or 0
    
    # 构建返回数据
    summary = {
        'total_income': float(total_income),
        'total_expense': float(total_expense),
        'total_profit': float(total_income) - float(total_expense),
        'current_month': {
            'year': datetime.now().year,
            'month': datetime.now().month,
            'income': float(current_month_income),
            'expense': float(current_month_expense),
            'profit': float(current_month_income) - float(current_month_expense)
        },
        'last_month': {
            'year': last_month_start.year,
            'month': last_month_start.month,
            'income': float(last_month_income),
            'expense': float(last_month_expense),
            'profit': float(last_month_income) - float(last_month_expense)
        }
    }
    
    return jsonify({'summary': summary})

# 获取销售利润数据
@finance_bp.route('/sales-profit', methods=['GET'])
@login_required
def get_sales_profit():
    # 查询销售和购买的价格差
    results = db.session.execute(text("""
        SELECT 
            b.book_id,
            b.isbn,
            b.title,
            SUM(s.quantity) AS total_sold,
            SUM(s.quantity * s.sale_price) AS total_revenue,
            AVG(pd.purchase_price) AS avg_purchase_price,
            AVG(s.sale_price) AS avg_sale_price,
            AVG(s.sale_price - pd.purchase_price) AS avg_profit_per_book,
            SUM(s.quantity * (s.sale_price - pd.purchase_price)) AS total_profit
        FROM sale_record s
        JOIN book b ON s.book_id = b.book_id
        LEFT JOIN purchase_detail pd ON b.book_id = pd.book_id
        GROUP BY b.book_id, b.isbn, b.title
        ORDER BY total_profit DESC
    """)).fetchall()
    
    # 构建返回数据
    profit_data = []
    for r in results:
        profit_data.append({
            'book_id': r[0],
            'isbn': r[1],
            'title': r[2],
            'total_sold': r[3],
            'total_revenue': float(r[4]) if r[4] else 0,
            'avg_purchase_price': float(r[5]) if r[5] else 0,
            'avg_sale_price': float(r[6]) if r[6] else 0,
            'avg_profit_per_book': float(r[7]) if r[7] else 0,
            'total_profit': float(r[8]) if r[8] else 0
        })
    
    return jsonify({'profit_data': profit_data})