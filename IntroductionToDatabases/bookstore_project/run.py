#!/usr/bin/env python
# -*- coding: utf-8 -*-
from backend import create_app
from flask import redirect, url_for, render_template, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import User
from backend.models.book import Book
from backend.models.sale import SaleRecord
from backend.models.purchase import PurchaseOrder
from backend.models.financial import FinancialRecord
import os

# 获取环境变量或默认配置
config_name = os.environ.get('FLASK_ENV', 'development')
app = create_app(config_name)

# 如果使用session，确保session配置正确
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True

# 首页路由
@app.route('/')
def index():
    return render_template('index.html')

# 登录页面
@app.route('/login')
def login():
    return render_template('login.html')

# 仪表盘
@app.route('/dashboard')
def dashboard():
    # 获取统计数据
    book_count = Book.query.count()
    low_stock_books = Book.query.filter(Book.stock < 10).count()
    recent_sales = SaleRecord.query.order_by(SaleRecord.sale_time.desc()).limit(5).all()
    recent_purchases = PurchaseOrder.query.order_by(PurchaseOrder.create_time.desc()).limit(5).all()
    
    # 销售统计 - 最近7天
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    seven_days_ago = datetime.now() - timedelta(days=7)
    daily_sales = SaleRecord.query.with_entities(
        func.date(SaleRecord.sale_time).label('date'),
        func.sum(SaleRecord.sale_price * SaleRecord.quantity).label('total_sales')
    ).filter(SaleRecord.sale_time >= seven_days_ago).group_by(func.date(SaleRecord.sale_time)).all()
    
    daily_sales_data = {
        'dates': [ds.date.strftime('%m-%d') for ds in daily_sales],
        'sales': [float(ds.total_sales) for ds in daily_sales]
    }
    
    return render_template('dashboard.html',
                          book_count=book_count,
                          low_stock_books=low_stock_books,
                          recent_sales=recent_sales,
                          recent_purchases=recent_purchases,
                          daily_sales_data=daily_sales_data)

# 图书管理路由
@app.route('/books')
def books_list():
    return render_template('books/list.html')

@app.route('/books/add')
def books_add():
    return render_template('books/add.html')

@app.route('/books/edit/<int:book_id>')
def books_edit(book_id):
    return render_template('books/edit.html', book_id=book_id)

# 销售管理路由
@app.route('/sales')
def sales_list():
    return render_template('sales/list.html')

@app.route('/sales/add')
def sales_add():
    return render_template('sales/add.html')

# 采购管理路由
@app.route('/purchases')
def purchases_list():
    return render_template('purchases/list.html')

@app.route('/purchases/add')
def purchases_add():
    return render_template('purchases/add.html')

@app.route('/purchases/<int:order_id>')
def purchases_detail(order_id):
    return render_template('purchases/detail.html', order_id=order_id)

# 财务管理路由
@app.route('/financial/overview')
def financial_overview():
    return render_template('financial/overview.html')

@app.route('/financial/records')
def financial_records():
    return render_template('financial/records.html')

# 错误处理
@app.errorhandler(404)
def page_not_found(e):
    return render_template('error.html', error="页面不存在"), 404

@app.errorhandler(403)
def forbidden(e):
    return render_template('error.html', error="权限不足"), 403

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('error.html', error="服务器内部错误"), 500

if __name__ == '__main__':
    # 启动Flask应用
    app.run(host='0.0.0.0', port=5000, debug=True)