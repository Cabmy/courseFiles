from datetime import datetime
from backend import db
from backend.models.sale import SaleOrder, SaleDetail
from backend.models.financial import FinancialRecord
from backend.models.book import Book

class SaleService:
    """销售服务类"""
    
    @staticmethod
    def get_sale_orders(filters=None, page=1, per_page=20):
        """获取销售订单列表
        
        Args:
            filters: 过滤条件字典
            page: 页码
            per_page: 每页记录数
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            query = SaleOrder.query
            
            # 应用过滤条件
            if filters:
                if 'status' in filters:
                    query = query.filter(SaleOrder.status == filters['status'])
                if 'start_date' in filters:
                    query = query.filter(SaleOrder.create_time >= filters['start_date'])
                if 'end_date' in filters:
                    query = query.filter(SaleOrder.create_time <= filters['end_date'])
                if 'seller_id' in filters:
                    query = query.filter(SaleOrder.seller_id == filters['seller_id'])
            
            # 按创建时间倒序排序
            query = query.order_by(SaleOrder.create_time.desc())
            
            # 执行分页查询
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            
            result = {
                'items': [order.to_dict(include_details=True) for order in pagination.items],
                'meta': {
                    'page': pagination.page,
                    'per_page': pagination.per_page,
                    'total': pagination.total,
                    'pages': pagination.pages
                }
            }
            
            return True, result
            
        except Exception as e:
            return False, f"获取销售订单失败: {str(e)}"

    @staticmethod
    def create_sale_order(seller_id, items, customer_info=None, remark=None):
        """创建销售订单
        
        Args:
            seller_id: 销售员ID
            items: 销售项目列表，每项包含 book_id, quantity, sale_price
            customer_info: 客户信息字典
            remark: 备注信息
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            # 检查库存
            for item in items:
                book = Book.query.get(item['book_id'])
                if not book:
                    return False, f"图书ID {item['book_id']} 不存在"
                if book.stock < item['quantity']:
                    return False, f"图书《{book.title}》库存不足"
            
            # 创建销售订单
            order = SaleOrder(
                seller_id=seller_id,
                customer_name=customer_info.get('name') if customer_info else None,
                customer_phone=customer_info.get('phone') if customer_info else None,
                remark=remark
            )
            db.session.add(order)
            db.session.flush()  # 获取order_id
            
            # 添加销售明细
            for item in items:
                detail = SaleDetail(
                    order_id=order.order_id,
                    book_id=item['book_id'],
                    quantity=item['quantity'],
                    sale_price=item['sale_price']
                )
                db.session.add(detail)
            
            # 计算订单总金额
            order.calculate_total_amount()
            
            db.session.commit()
            return True, order.to_dict(include_details=True)
            
        except Exception as e:
            db.session.rollback()
            return False, f"创建销售订单失败: {str(e)}"

    @staticmethod
    def get_sale_order(order_id):
        """获取销售订单详情
        
        Args:
            order_id: 订单ID
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            order = SaleOrder.query.get(order_id)
            if not order:
                return False, "销售订单不存在"
            
            return True, order.to_dict(include_details=True)
            
        except Exception as e:
            return False, f"获取销售订单详情失败: {str(e)}"

    @staticmethod
    def complete_sale_order(order_id, payment_method, operator_id):
        """完成销售订单
        
        Args:
            order_id: 订单ID
            payment_method: 支付方式
            operator_id: 操作员ID
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            order = SaleOrder.query.get(order_id)
            if not order:
                return False, "销售订单不存在"
            
            if order.status != '待付款':
                return False, f"订单状态不允许支付，当前状态: {order.status}"
            
            # 检查库存并扣减
            for detail in order.details:
                if not detail.book.update_stock(-detail.quantity):
                    return False, f"图书《{detail.book.title}》库存不足"
            
            # 更新订单状态
            order.status = '已完成'
            order.complete_time = datetime.now()
            
            # 创建财务记录
            financial_record = FinancialRecord(
                amount=order.total_amount,
                record_type='收入',
                source_type='销售',
                source_id=order.order_id,
                payment_method=payment_method,
                operator_id=operator_id,
                remark=f"销售收入 #{order.order_id}"
            )
            db.session.add(financial_record)
            
            db.session.commit()
            return True, order.to_dict(include_details=True)
            
        except Exception as e:
            db.session.rollback()
            return False, f"完成销售订单失败: {str(e)}"

    @staticmethod
    def cancel_sale_order(order_id, operator_id, reason=None):
        """取消销售订单
        
        Args:
            order_id: 订单ID
            operator_id: 操作员ID
            reason: 取消原因
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            order = SaleOrder.query.get(order_id)
            if not order:
                return False, "销售订单不存在"
            
            if order.status not in ['待付款', '已完成']:
                return False, f"订单状态不允许取消，当前状态: {order.status}"
            
            # 如果订单已完成，需要退还库存
            if order.status == '已完成':
                for detail in order.details:
                    detail.book.update_stock(detail.quantity)
                
                # 创建退款财务记录
                financial_record = FinancialRecord(
                    amount=-order.total_amount,  # 负数表示退款
                    record_type='支出',
                    source_type='销售',
                    source_id=order.order_id,
                    payment_method=order.payment_method,
                    operator_id=operator_id,
                    remark=f"销售退款 #{order.order_id}"
                )
                db.session.add(financial_record)
            
            # 更新订单状态
            order.status = '已取消'
            order.cancel_reason = reason
            order.cancel_time = datetime.now()
            
            db.session.commit()
            return True, order.to_dict(include_details=True)
            
        except Exception as e:
            db.session.rollback()
            return False, f"取消销售订单失败: {str(e)}"