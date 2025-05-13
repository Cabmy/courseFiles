from flask import Blueprint, request, g
from backend import db
from backend.models.sale import SaleRecord
from backend.models.book import Book
from backend.models.financial import FinancialRecord
from backend.utils.response_helper import success_response, error_response, validation_error
from backend.utils.auth_helper import admin_required, login_required
from datetime import datetime
from sqlalchemy import func

sale_bp = Blueprint('sale', __name__)

@sale_bp.route('/records', methods=['GET'])
@admin_required
def get_sale_records():
    """获取销售记录列表
    
    Returns:
        JSON: 销售记录列表
    """
    # 分页参数
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # 过滤参数
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    seller_id = request.args.get('seller_id', type=int)
    book_id = request.args.get('book_id', type=int)
    
    # 构建查询
    query = SaleRecord.query
    
    # 应用过滤条件 
    if start_date:
        query = query.filter(SaleRecord.sale_time >= start_date)
    if end_date:
        query = query.filter(SaleRecord.sale_time <= end_date)
    if seller_id:
        query = query.filter(SaleRecord.seller_id == seller_id)
    if book_id:
        query = query.filter(SaleRecord.book_id == book_id)
    
    # 按时间倒序排序
    query = query.order_by(SaleRecord.sale_time.desc())
    
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
    
    return success_response(result, "获取销售记录列表成功")

@sale_bp.route('/records', methods=['POST'])
@login_required
def create_sale_record():
    """创建新的销售记录
    
    Returns:
        JSON: 创建结果
    """
    data = request.get_json()
    
    # 数据验证
    required_fields = ['book_id', 'quantity', 'sale_price']
    if not all(field in data for field in required_fields):
        return validation_error({'message': f'缺少必要字段: {", ".join(required_fields)}'})
    
    try:
        # 查找图书
        book = Book.query.get(data['book_id'])
        if not book:
            return error_response("图书不存在", 404)
        
        # 检查库存
        if book.stock < data['quantity']:
            return error_response(f"库存不足，当前库存: {book.stock}", 400)
        
        # 创建销售记录
        sale_record = SaleRecord(
            book_id=data['book_id'],
            quantity=data['quantity'],
            sale_price=data['sale_price'],
            seller_id=g.current_user.user_id,
            remark=data.get('remark')
        )
        
        # 更新库存
        book.stock -= data['quantity']
        
        # 创建财务记录
        financial_record = FinancialRecord(
            amount=data['quantity'] * data['sale_price'],
            record_type='收入',
            source_type='销售',
            source_id=sale_record.sale_id,  # 这里需要先flush才能获取sale_id
            payment_method=data.get('payment_method', '现金'),
            operator_id=g.current_user.user_id,
            remark=f"销售 {book.title} x{data['quantity']}"
        )
        
        db.session.add(sale_record)
        db.session.flush()  # 获取sale_id
        db.session.add(financial_record)
        db.session.commit()
        
        return success_response(sale_record.to_dict(), "销售记录创建成功")
        
    except Exception as e:
        db.session.rollback()
        return error_response(f"创建销售记录失败: {str(e)}", 500)

@sale_bp.route('/records/<int:record_id>', methods=['GET'])
@login_required
def get_sale_record(record_id):
    """获取销售记录详情
    
    Args:
        record_id: 销售记录ID
        
    Returns:
        JSON: 销售记录详情
    """
    record = SaleRecord.query.get(record_id)
    
    if not record:
        return error_response("销售记录不存在", 404)
    
    return success_response(record.to_dict(), "获取销售记录详情成功")

@sale_bp.route('/stats', methods=['GET'])
@login_required
def get_sales_stats():
    """获取销售统计数据
    
    Returns:
        JSON: 销售统计数据
    """
    # 时间范围参数
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        if end_date:
            # 设置为当天结束时间
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
            end_date = end_date.replace(hour=23, minute=59, second=59)
    except ValueError:
        return validation_error({'message': '日期格式不正确，应为YYYY-MM-DD'})
    
    # 构建查询基础
    base_query = SaleRecord.query
    
    # 应用时间过滤
    if start_date:
        base_query = base_query.filter(SaleRecord.sale_time >= start_date)
    if end_date:
        base_query = base_query.filter(SaleRecord.sale_time <= end_date)
    
    # 查询销售总额
    total_sales = db.session.query(func.sum(SaleRecord.sale_price * SaleRecord.quantity)).select_from(SaleRecord)
    if start_date:
        total_sales = total_sales.filter(SaleRecord.sale_time >= start_date)
    if end_date:
        total_sales = total_sales.filter(SaleRecord.sale_time <= end_date)
    total_sales = total_sales.scalar() or 0
    
    # 查询销售数量
    total_quantity = db.session.query(func.sum(SaleRecord.quantity)).select_from(SaleRecord)
    if start_date:
        total_quantity = total_quantity.filter(SaleRecord.sale_time >= start_date)
    if end_date:
        total_quantity = total_quantity.filter(SaleRecord.sale_time <= end_date)
    total_quantity = total_quantity.scalar() or 0
    
    # 查询销售记录数
    total_records = base_query.count() or 0
    
    # 查询图书销售统计
    book_stats_query = db.session.query(
        Book.book_id,
        Book.title.label('book_title'),
        func.sum(SaleRecord.quantity).label('total_quantity'),
        func.sum(SaleRecord.quantity * SaleRecord.sale_price).label('total_amount')
    ).join(
        SaleRecord, SaleRecord.book_id == Book.book_id
    )
    
    # 应用时间过滤
    if start_date:
        book_stats_query = book_stats_query.filter(SaleRecord.sale_time >= start_date)
    if end_date:
        book_stats_query = book_stats_query.filter(SaleRecord.sale_time <= end_date)
    
    book_stats = book_stats_query.group_by(Book.book_id, Book.title).order_by(func.sum(SaleRecord.quantity).desc()).limit(10).all()
    
    # 准备响应数据
    result = {
        'total_sales': float(total_sales),
        'total_quantity': total_quantity,
        'total_records': total_records,
        'book_stats': [{
            'book_id': stat.book_id,
            'book_title': stat.book_title,
            'total_quantity': stat.total_quantity,
            'total_amount': float(stat.total_amount)
        } for stat in book_stats]
    }
    
    return success_response(result, "获取销售统计成功")

@sale_bp.route('/records/<int:record_id>', methods=['PUT'])
@admin_required
def update_sale_record(record_id):
    """更新销售记录备注
    
    Args:
        record_id: 销售记录ID
        
    Returns:
        JSON: 更新结果
    """
    record = SaleRecord.query.get(record_id)
    
    if not record:
        return error_response("销售记录不存在", 404)
    
    data = request.get_json()
    
    try:
        if 'remark' in data:
            record.remark = data['remark']
            db.session.commit()
            return success_response(record.to_dict(), "销售记录更新成功")
        else:
            return validation_error({'message': '没有提供要更新的字段'})
    
    except Exception as e:
        db.session.rollback()
        return error_response(f"更新销售记录失败: {str(e)}", 500)