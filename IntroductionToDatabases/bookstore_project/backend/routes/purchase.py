from flask import Blueprint, request, g
from backend import db
from backend.models.purchase import PurchaseOrder, PurchaseDetail
from backend.models.book import Book
from backend.models.financial import FinancialRecord
from backend.utils.response_helper import success_response, error_response, validation_error
from backend.utils.auth_helper import admin_required
from datetime import datetime

purchase_bp = Blueprint('purchase', __name__)

@purchase_bp.route('/orders', methods=['GET'])
@admin_required
def get_purchase_orders():
    """获取采购订单列表
    
    Returns:
        JSON: 采购订单列表
    """
    # 分页参数
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # 过滤参数
    status = request.args.get('status')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # 构建查询
    query = PurchaseOrder.query
    
    # 应用过滤条件
    if status:
        query = query.filter(PurchaseOrder.status == status)
    if start_date:
        query = query.filter(PurchaseOrder.create_time >= start_date)
    if end_date:
        query = query.filter(PurchaseOrder.create_time <= end_date)
    
    # 按创建时间倒序排序
    query = query.order_by(PurchaseOrder.create_time.desc())
    
    # 执行分页查询
    orders = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # 准备响应数据
    result = {
        'items': [order.to_dict() for order in orders.items],
        'meta': {
            'page': orders.page,
            'per_page': orders.per_page,
            'total': orders.total,
            'pages': orders.pages
        }
    }
    
    return success_response(result, "获取采购订单列表成功")

@purchase_bp.route('/orders', methods=['POST'])
@admin_required
def create_purchase_order():
    """创建新的采购订单
    
    Returns:
        JSON: 创建结果
    """
    data = request.get_json()
    
    # 数据验证
    if not data or 'items' not in data or not data['items']:
        return validation_error({'message': '采购明细不能为空'})
    
    try:
        # 创建采购订单
        order = PurchaseOrder(
            creator_id=g.current_user.user_id,
            remark=data.get('remark')
        )
        db.session.add(order)
        db.session.flush()  # 获取order_id
        
        total_amount = 0
        # 处理采购明细
        for item in data['items']:
            # 验证必要字段
            required_fields = ['isbn', 'title', 'quantity', 'purchase_price']
            if not all(field in item for field in required_fields):
                raise ValueError(f"采购明细缺少必要字段: {', '.join(required_fields)}")
            
            # 查找或创建图书
            book = Book.query.filter_by(isbn=item['isbn']).first()
            is_new_book = book is None
            
            # 创建采购明细
            detail = PurchaseDetail(
                order_id=order.order_id,
                book_id=book.book_id if book else None,
                isbn=item['isbn'],
                title=item['title'],
                author=item.get('author'),
                publisher=item.get('publisher'),
                quantity=item['quantity'],
                purchase_price=item['purchase_price'],
                is_new_book=is_new_book
            )
            
            db.session.add(detail)
            total_amount += detail.quantity * detail.purchase_price
        
        # 更新订单总金额
        order.total_amount = total_amount
        
        db.session.commit()
        return success_response(order.to_dict(), "采购订单创建成功")
        
    except ValueError as e:
        db.session.rollback()
        return validation_error({'message': str(e)})
    except Exception as e:
        db.session.rollback()
        return error_response(f"创建采购订单失败: {str(e)}", 500)

@purchase_bp.route('/orders/<int:order_id>', methods=['GET'])
@admin_required
def get_purchase_order(order_id):
    """获取采购订单详情
    
    Args:
        order_id: 采购订单ID
        
    Returns:
        JSON: 采购订单详情
    """
    order = PurchaseOrder.query.get(order_id)
    
    if not order:
        return error_response("采购订单不存在", 404)
    
    return success_response(order.to_dict(include_details=True), "获取采购订单详情成功")

@purchase_bp.route('/orders/<int:order_id>/pay', methods=['POST'])
@admin_required
def pay_purchase_order(order_id):
    """支付采购订单
    
    Args:
        order_id: 订单ID
        
    Returns:
        JSON: 支付结果
    """
    purchase_order = PurchaseOrder.query.get(order_id)
    
    if not purchase_order:
        return error_response("采购订单不存在", 404)
    
    if purchase_order.status != '未付款':
        return error_response(f"订单状态不允许支付，当前状态: {purchase_order.status}", 400)
    
    data = request.get_json() or {}
    payment_method = data.get('payment_method', '现金')
    
    try:
        # 更新订单状态
        purchase_order.status = '已付款'
        purchase_order.payment_time = datetime.now()
        
        # 创建财务记录
        financial_record = FinancialRecord(
            amount=purchase_order.total_amount,
            record_type='支出',
            source_type='进货',
            source_id=purchase_order.order_id,
            payment_method=payment_method,
            operator_id=g.current_user.user_id,
            remark=f"进货支出 #{purchase_order.order_id}"
        )
        db.session.add(financial_record)
        
        # 如果有新书，自动添加到库存
        for detail in purchase_order.details:
            if detail.is_new_book:
                # 检查ISBN是否已存在于图书库中
                existing_book = Book.query.filter_by(isbn=detail.isbn).first()
                if existing_book:
                    # 更新现有库存
                    existing_book.update_stock(detail.quantity)
                else:
                    # 创建新图书记录
                    new_book = Book(
                        isbn=detail.isbn,
                        title=detail.title,
                        author=detail.author,
                        publisher=detail.publisher,
                        retail_price=detail.purchase_price * 1.3,  # 设置零售价为进货价的1.3倍
                        stock=detail.quantity
                    )
                    db.session.add(new_book)
                    
                    # 关联采购明细与图书
                    detail.book_id = new_book.book_id
        
        db.session.commit()
        return success_response(purchase_order.to_dict(include_details=True), "采购订单支付成功")
        
    except Exception as e:
        db.session.rollback()
        return error_response(f"支付采购订单失败: {str(e)}", 500)

@purchase_bp.route('/orders/<int:order_id>/return', methods=['POST'])
@admin_required
def return_purchase_order(order_id):
    """退货处理
    
    Args:
        order_id: 采购订单ID
        
    Returns:
        JSON: 退货结果
    """
    order = PurchaseOrder.query.get(order_id)
    
    if not order:
        return error_response("采购订单不存在", 404)
    
    if order.status != '已付款':
        return error_response("订单状态不允许退货", 400)
    
    try:
        # 更新订单状态
        order.status = '已退货'
        
        # 处理库存
        for detail in order.details:
            if detail.book_id:
                book = Book.query.get(detail.book_id)
                # 确保库存足够退货
                if book.stock < detail.quantity:
                    raise ValueError(f"图书《{book.title}》库存不足，无法完成退货")
                book.stock -= detail.quantity
        
        # 创建退款财务记录
        financial_record = FinancialRecord(
            amount=order.total_amount,
            record_type='收入',
            source_type='退货',
            source_id=order.order_id,
            payment_method='银行卡',
            operator_id=g.current_user.user_id,
            remark=f"采购退货退款 #{order.order_id}"
        )
        db.session.add(financial_record)
        
        db.session.commit()
        return success_response(order.to_dict(), "采购退货处理成功")
        
    except ValueError as e:
        db.session.rollback()
        return validation_error({'message': str(e)})
    except Exception as e:
        db.session.rollback()
        return error_response(f"处理采购退货失败: {str(e)}", 500)