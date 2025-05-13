from flask import Blueprint, request, jsonify, session
from backend.models import db, PurchaseOrder, PurchaseDetail, Book, User, FinancialRecord
from backend.routes.user_routes import login_required
from sqlalchemy import text

purchase_bp = Blueprint('purchase_bp', __name__)

# 获取所有进货单
@purchase_bp.route('/', methods=['GET'])
@login_required
def get_all_purchase_orders():
    # 支持按状态筛选
    status = request.args.get('status')
    
    query = PurchaseOrder.query
    
    if status:
        query = query.filter_by(status=status)
    
    # 按创建时间倒序排序
    orders = query.order_by(PurchaseOrder.create_time.desc()).all()
    
    return jsonify({
        'orders': [order.to_dict() for order in orders]
    })

# 获取进货单详情
@purchase_bp.route('/<int:order_id>', methods=['GET'])
@login_required
def get_purchase_order(order_id):
    order = PurchaseOrder.query.get(order_id)
    
    if not order:
        return jsonify({'error': '进货单不存在'}), 404
    
    return jsonify({'order': order.to_dict()})

# 创建新的进货单
@purchase_bp.route('/', methods=['POST'])
@login_required
def create_purchase_order():
    data = request.json
    
    # 创建进货单
    new_order = PurchaseOrder(
        creator_id=session['user_id'],
        remark=data.get('remark', '')
    )
    
    db.session.add(new_order)
    db.session.flush()  # 获取新生成的order_id
    
    # 处理进货明细
    details = data.get('details', [])
    if not details:
        db.session.rollback()
        return jsonify({'error': '进货单必须包含至少一项商品'}), 400
    
    for detail in details:
        # 验证必填字段
        required_fields = ['quantity', 'purchase_price']
        for field in required_fields:
            if field not in detail:
                db.session.rollback()
                return jsonify({'error': f'进货明细中缺少必填字段: {field}'}), 400
        
        # 处理已有图书的进货
        if 'book_id' in detail:
            book = Book.query.get(detail['book_id'])
            if not book:
                db.session.rollback()
                return jsonify({'error': f'图书ID不存在: {detail["book_id"]}'}), 404
            
            new_detail = PurchaseDetail(
                order_id=new_order.order_id,
                book_id=detail['book_id'],
                quantity=detail['quantity'],
                purchase_price=detail['purchase_price'],
                is_new_book=False
            )
        # 处理新书的进货
        else:
            # 对于新书，需要提供基本信息
            required_fields = ['isbn', 'title', 'author', 'publisher']
            for field in required_fields:
                if field not in detail:
                    db.session.rollback()
                    return jsonify({'error': f'新书明细中缺少必填字段: {field}'}), 400
            
            new_detail = PurchaseDetail(
                order_id=new_order.order_id,
                isbn=detail['isbn'],
                title=detail['title'],
                author=detail['author'],
                publisher=detail['publisher'],
                quantity=detail['quantity'],
                purchase_price=detail['purchase_price'],
                is_new_book=True
            )
        
        db.session.add(new_detail)
    
    try:
        db.session.commit()
        return jsonify({
            'message': '进货单创建成功',
            'order': new_order.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建进货单失败: {str(e)}'}), 500

# 支付进货单
@purchase_bp.route('/<int:order_id>/pay', methods=['POST'])
@login_required
def pay_purchase_order(order_id):
    order = PurchaseOrder.query.get(order_id)
    
    if not order:
        return jsonify({'error': '进货单不存在'}), 404
    
    if order.status != '未付款':
        return jsonify({'error': '只有未付款的订单可以付款'}), 400
    
    try:
        # 调用存储过程进行支付
        result = db.session.execute(
            text("SELECT proc_pay_purchase_order(:order_id, :operator_id)"),
            {"order_id": order_id, "operator_id": session['user_id']}
        )
        
        db.session.commit()
        
        # 重新获取更新后的订单
        updated_order = PurchaseOrder.query.get(order_id)
        
        return jsonify({
            'message': '进货单支付成功',
            'order': updated_order.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'支付进货单失败: {str(e)}'}), 500

# 添加新书到库存
@purchase_bp.route('/detail/<int:detail_id>/add-to-stock', methods=['POST'])
@login_required
def add_new_book_to_stock(detail_id):
    data = request.json
    
    # 验证零售价
    if 'retail_price' not in data:
        return jsonify({'error': '缺少必填字段: retail_price'}), 400
    
    try:
        # 调用存储过程添加新书到库存
        result = db.session.execute(
            text("SELECT * FROM proc_add_new_book_to_stock(:detail_id, :retail_price)"),
            {"detail_id": detail_id, "retail_price": data['retail_price']}
        )
        
        # 获取返回的图书ID
        book_id = result.fetchone()[0]
        
        db.session.commit()
        
        # 获取新添加的图书信息
        new_book = Book.query.get(book_id)
        
        return jsonify({
            'message': '新书已成功添加到库存',
            'book': new_book.to_dict() if new_book else None
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'添加新书到库存失败: {str(e)}'}), 500

# 编辑进货单（仅限未付款状态）
@purchase_bp.route('/<int:order_id>', methods=['PUT'])
@login_required
def update_purchase_order(order_id):
    order = PurchaseOrder.query.get(order_id)
    
    if not order:
        return jsonify({'error': '进货单不存在'}), 404
    
    if order.status != '未付款':
        return jsonify({'error': '只能修改未付款的进货单'}), 400
    
    data = request.json
    
    # 更新备注
    if 'remark' in data:
        order.remark = data['remark']
    
    # 如果有明细更新
    if 'details' in data:
        # 先删除旧的明细
        for detail in order.details:
            db.session.delete(detail)
        
        # 添加新的明细
        for detail in data['details']:
            # 验证必填字段
            required_fields = ['quantity', 'purchase_price']
            for field in required_fields:
                if field not in detail:
                    db.session.rollback()
                    return jsonify({'error': f'进货明细中缺少必填字段: {field}'}), 400
            
            # 处理已有图书的进货
            if 'book_id' in detail:
                book = Book.query.get(detail['book_id'])
                if not book:
                    db.session.rollback()
                    return jsonify({'error': f'图书ID不存在: {detail["book_id"]}'}), 404
                
                new_detail = PurchaseDetail(
                    order_id=order.order_id,
                    book_id=detail['book_id'],
                    quantity=detail['quantity'],
                    purchase_price=detail['purchase_price'],
                    is_new_book=False
                )
            # 处理新书的进货
            else:
                # 对于新书，需要提供基本信息
                required_fields = ['isbn', 'title', 'author', 'publisher']
                for field in required_fields:
                    if field not in detail:
                        db.session.rollback()
                        return jsonify({'error': f'新书明细中缺少必填字段: {field}'}), 400
                
                new_detail = PurchaseDetail(
                    order_id=order.order_id,
                    isbn=detail['isbn'],
                    title=detail['title'],
                    author=detail['author'],
                    publisher=detail['publisher'],
                    quantity=detail['quantity'],
                    purchase_price=detail['purchase_price'],
                    is_new_book=True
                )
            
            db.session.add(new_detail)
    
    try:
        db.session.commit()
        return jsonify({
            'message': '进货单更新成功',
            'order': order.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新进货单失败: {str(e)}'}), 500

# 取消进货单（改为已取消状态）
@purchase_bp.route('/<int:order_id>/cancel', methods=['POST'])
@login_required
def cancel_purchase_order(order_id):
    order = PurchaseOrder.query.get(order_id)
    
    if not order:
        return jsonify({'error': '进货单不存在'}), 404
    
    if order.status == '已付款':
        return jsonify({'error': '已付款的进货单不能取消'}), 400
    
    order.status = '已取消'
    
    try:
        db.session.commit()
        return jsonify({
            'message': '进货单已取消',
            'order': order.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'取消进货单失败: {str(e)}'}), 500