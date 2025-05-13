from flask import Blueprint, request, jsonify, session
from backend.models import db, SaleRecord, Book, User
from backend.routes.user_routes import login_required
from sqlalchemy import text, func
from datetime import datetime

sale_bp = Blueprint('sale_bp', __name__)

# 获取所有销售记录
@sale_bp.route('/', methods=['GET'])
@login_required
def get_all_sales():
    # 支持按日期范围和售货员筛选
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    seller_id = request.args.get('seller_id')
    
    query = SaleRecord.query
    
    if start_date:
        query = query.filter(SaleRecord.sale_time >= start_date)
    if end_date:
        query = query.filter(SaleRecord.sale_time <= end_date)
    if seller_id:
        query = query.filter(SaleRecord.seller_id == seller_id)
    
    # 按销售时间倒序排序
    sales = query.order_by(SaleRecord.sale_time.desc()).all()
    
    return jsonify({
        'sales': [sale.to_dict() for sale in sales]
    })

# 获取单个销售记录详情
@sale_bp.route('/<int:sale_id>', methods=['GET'])
@login_required
def get_sale(sale_id):
    sale = SaleRecord.query.get(sale_id)
    
    if not sale:
        return jsonify({'error': '销售记录不存在'}), 404
    
    return jsonify({'sale': sale.to_dict()})

# 创建新的销售记录
@sale_bp.route('/', methods=['POST'])
@login_required
def create_sale():
    data = request.json
    
    # 验证必填字段
    required_fields = ['book_id', 'quantity', 'sale_price']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必填字段: {field}'}), 400
    
    # 检查图书是否存在
    book = Book.query.get(data['book_id'])
    if not book:
        return jsonify({'error': '图书不存在'}), 404
    
    # 检查库存是否足够
    if book.stock < data['quantity']:
        return jsonify({'error': f'库存不足，当前库存: {book.stock}, 需要: {data["quantity"]}'}), 400
    
    try:
        # 调用存储过程进行销售
        result = db.session.execute(
            text("SELECT * FROM proc_sell_book(:p_book_id, :p_quantity, :p_seller_id, :p_sale_price, :p_remark)"),
            {
                "p_book_id": data['book_id'], 
                "p_quantity": data['quantity'], 
                "p_seller_id": session['user_id'], 
                "p_sale_price": data['sale_price'], 
                "p_remark": data.get('remark', '')
            }
        )
        
        # 获取返回的销售ID
        sale_id = result.fetchone()[0]
        
        db.session.commit()
        
        # 获取新创建的销售记录
        new_sale = SaleRecord.query.get(sale_id)
        
        return jsonify({
            'message': '销售记录创建成功',
            'sale': new_sale.to_dict() if new_sale else None
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建销售记录失败: {str(e)}'}), 500

# 获取销售统计数据
@sale_bp.route('/statistics', methods=['GET'])
@login_required
def get_sales_statistics():
    # 支持按时间范围筛选
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # 基本查询
    query = db.session.query(
        Book.book_id,
        Book.isbn,
        Book.title,
        Book.author,
        func.sum(SaleRecord.quantity).label('total_sold'),
        func.sum(SaleRecord.quantity * SaleRecord.sale_price).label('total_revenue')
    ).join(SaleRecord)
    
    # 添加日期过滤
    if start_date:
        query = query.filter(SaleRecord.sale_time >= start_date)
    if end_date:
        query = query.filter(SaleRecord.sale_time <= end_date)
    
    # 分组并排序
    results = query.group_by(Book.book_id, Book.isbn, Book.title, Book.author).order_by(
        func.sum(SaleRecord.quantity * SaleRecord.sale_price).desc()
    ).all()
    
    # 构建返回数据
    statistics = []
    for r in results:
        statistics.append({
            'book_id': r.book_id,
            'isbn': r.isbn,
            'title': r.title,
            'author': r.author,
            'total_sold': r.total_sold,
            'total_revenue': float(r.total_revenue) if r.total_revenue else 0
        })
    
    return jsonify({'statistics': statistics})

# 获取用户销售业绩
@sale_bp.route('/performance', methods=['GET'])
@login_required
def get_user_performance():
    # 查询所有用户的销售业绩
    results = db.session.query(
        User.user_id,
        User.username,
        User.real_name,
        func.count(SaleRecord.sale_id).label('total_sales'),
        func.sum(SaleRecord.quantity).label('total_items_sold'),
        func.sum(SaleRecord.quantity * SaleRecord.sale_price).label('total_revenue')
    ).outerjoin(SaleRecord, User.user_id == SaleRecord.seller_id).group_by(
        User.user_id, User.username, User.real_name
    ).order_by(
        func.sum(SaleRecord.quantity * SaleRecord.sale_price).desc().nullslast()
    ).all()
    
    # 构建返回数据
    performance = []
    for r in results:
        performance.append({
            'user_id': r.user_id,
            'username': r.username,
            'real_name': r.real_name,
            'total_sales': r.total_sales or 0,
            'total_items_sold': r.total_items_sold or 0,
            'total_revenue': float(r.total_revenue) if r.total_revenue else 0
        })
    
    return jsonify({'performance': performance})