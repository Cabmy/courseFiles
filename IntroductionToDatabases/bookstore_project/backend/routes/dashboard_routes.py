from flask import Blueprint, jsonify, session
from backend.models import db, Book, SaleRecord, FinancialRecord, User
from backend.routes.user_routes import login_required
from sqlalchemy import func, desc, text
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard_bp', __name__)

# 获取仪表盘概览数据
@dashboard_bp.route('/overview', methods=['GET'])
@login_required
def get_overview():
    # 库存汇总
    total_books = db.session.query(func.count(Book.book_id)).scalar() or 0
    total_stock = db.session.query(func.sum(Book.stock)).scalar() or 0
    low_stock_books = db.session.query(func.count(Book.book_id)).filter(Book.stock < 10).scalar() or 0
    
    # 销售汇总（本月）
    current_month_start = datetime(datetime.now().year, datetime.now().month, 1)
    monthly_sales_count = db.session.query(
        func.count(SaleRecord.sale_id)
    ).filter(SaleRecord.sale_time >= current_month_start).scalar() or 0
    
    monthly_sales_amount = db.session.query(
        func.sum(SaleRecord.quantity * SaleRecord.sale_price)
    ).filter(SaleRecord.sale_time >= current_month_start).scalar() or 0
    
    # 财务汇总
    total_income = db.session.query(
        func.sum(FinancialRecord.amount)
    ).filter(FinancialRecord.type == '收入').scalar() or 0
    
    total_expense = db.session.query(
        func.sum(FinancialRecord.amount)
    ).filter(FinancialRecord.type == '支出').scalar() or 0
    
    # 热销书籍
    top_selling_books = db.session.query(
        Book.book_id,
        Book.isbn,
        Book.title,
        func.sum(SaleRecord.quantity).label('total_sold')
    ).join(SaleRecord).group_by(
        Book.book_id,
        Book.isbn,
        Book.title
    ).order_by(desc('total_sold')).limit(5).all()
    
    # 构建返回数据
    overview = {
        'inventory_summary': {
            'total_books': total_books,
            'total_stock': total_stock,
            'low_stock_books': low_stock_books
        },
        'sales_summary': {
            'monthly_sales_count': monthly_sales_count,
            'monthly_sales_amount': float(monthly_sales_amount) if monthly_sales_amount else 0
        },
        'finance_summary': {
            'total_income': float(total_income),
            'total_expense': float(total_expense),
            'total_profit': float(total_income) - float(total_expense)
        },
        'top_selling_books': [
            {
                'book_id': book.book_id,
                'isbn': book.isbn,
                'title': book.title,
                'total_sold': book.total_sold
            }
            for book in top_selling_books
        ]
    }
    
    return jsonify({'overview': overview})

# 获取销售排行数据
@dashboard_bp.route('/sales-ranking', methods=['GET'])
@login_required
def get_sales_ranking():
    # 查询销售排行（按书籍和销售员）
    
    # 热销书籍排行
    book_ranking = db.session.query(
        Book.book_id, 
        Book.isbn, 
        Book.title, 
        func.sum(SaleRecord.quantity).label('total_quantity'),
        func.sum(SaleRecord.quantity * SaleRecord.sale_price).label('total_revenue')
    ).join(SaleRecord).group_by(
        Book.book_id, 
        Book.isbn, 
        Book.title
    ).order_by(desc('total_quantity')).limit(10).all()
    
    # 销售员业绩排行
    staff_ranking = db.session.query(
        User.user_id,
        User.username,
        func.count(SaleRecord.sale_id).label('sales_count'),
        func.sum(SaleRecord.quantity).label('books_sold'),
        func.sum(SaleRecord.quantity * SaleRecord.sale_price).label('total_revenue')
    ).join(SaleRecord, User.user_id == SaleRecord.seller_id
    ).group_by(
        User.user_id,
        User.username
    ).order_by(desc('total_revenue')).limit(10).all()
    
    # 构建返回数据
    ranking_data = {
        'book_ranking': [
            {
                'book_id': book.book_id,
                'isbn': book.isbn,
                'title': book.title,
                'total_quantity': book.total_quantity,
                'total_revenue': float(book.total_revenue) if book.total_revenue else 0
            }
            for book in book_ranking
        ],
        'staff_ranking': [
            {
                'user_id': user.user_id,
                'username': user.username,
                'sales_count': user.sales_count,
                'books_sold': user.books_sold,
                'total_revenue': float(user.total_revenue) if user.total_revenue else 0
            }
            for user in staff_ranking
        ]
    }
    
    return jsonify({'ranking_data': ranking_data})