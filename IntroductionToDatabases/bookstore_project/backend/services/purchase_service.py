from datetime import datetime
from backend import db
from backend.models.purchase import PurchaseOrder, PurchaseDetail
from backend.models.financial import FinancialRecord

class PurchaseService:
    """采购服务类"""
    
    @staticmethod
    def get_purchase_orders(filters=None, page=1, per_page=20):
        """获取采购订单列表
        
        Args:
            filters: 过滤条件字典
            page: 页码
            per_page: 每页记录数
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            query = PurchaseOrder.query
            
            # 应用过滤条件
            if filters:
                if 'status' in filters:
                    query = query.filter(PurchaseOrder.status == filters['status'])
                if 'start_date' in filters:
                    query = query.filter(PurchaseOrder.create_time >= filters['start_date'])
                if 'end_date' in filters:
                    query = query.filter(PurchaseOrder.create_time <= filters['end_date'])
                if 'creator_id' in filters:
                    query = query.filter(PurchaseOrder.creator_id == filters['creator_id'])
            
            # 按创建时间倒序排序
            query = query.order_by(PurchaseOrder.create_time.desc())
            
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
            return False, f"获取采购订单失败: {str(e)}"

    @staticmethod
    def create_purchase_order(creator_id, items, remark=None):
        """创建采购订单
        
        Args:
            creator_id: 创建者ID
            items: 采购项目列表
            remark: 备注信息
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            # 创建采购订单
            order = PurchaseOrder(creator_id=creator_id, remark=remark)
            db.session.add(order)
            db.session.flush()  # 获取order_id
            
            # 添加采购明细
            for item in items:
                detail = PurchaseDetail(
                    order_id=order.order_id,
                    quantity=item['quantity'],
                    purchase_price=item['purchase_price'],
                    is_new_book=item.get('is_new_book', False)
                )
                
                if item.get('is_new_book'):
                    # 新书信息
                    detail.isbn = item['isbn']
                    detail.title = item['title']
                    detail.author = item.get('author')
                    detail.publisher = item.get('publisher')
                else:
                    # 现有图书
                    detail.book_id = item['book_id']
                
                db.session.add(detail)
            
            # 计算订单总金额
            order.calculate_total_amount()
            
            db.session.commit()
            return True, order.to_dict(include_details=True)
            
        except Exception as e:
            db.session.rollback()
            return False, f"创建采购订单失败: {str(e)}"

    @staticmethod
    def get_purchase_order(order_id):
        """获取采购订单详情
        
        Args:
            order_id: 订单ID
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            order = PurchaseOrder.query.get(order_id)
            if not order:
                return False, "采购订单不存在"
            
            return True, order.to_dict(include_details=True)
            
        except Exception as e:
            return False, f"获取采购订单详情失败: {str(e)}"

    @staticmethod
    def pay_purchase_order(order_id, operator_id):
        """支付采购订单
        
        Args:
            order_id: 订单ID
            operator_id: 操作员ID
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            order = PurchaseOrder.query.get(order_id)
            if not order:
                return False, "采购订单不存在"
            
            if order.status != '未付款':
                return False, f"订单状态不允许支付，当前状态: {order.status}"
            
            # 开始事务
            order.status = '已付款'
            
            # 创建财务记录
            financial_record = FinancialRecord(
                amount=order.total_amount,
                record_type='支出',
                source_type='进货',
                source_id=order.order_id,
                payment_method='银行卡',
                operator_id=operator_id,
                remark=f"支付采购订单 #{order.order_id}"
            )
            db.session.add(financial_record)
            
            # 更新库存
            for detail in order.details:
                if not detail.is_new_book and detail.book:
                    detail.book.update_stock(detail.quantity)
            
            db.session.commit()
            return True, order.to_dict(include_details=True)
            
        except Exception as e:
            db.session.rollback()
            return False, f"支付采购订单失败: {str(e)}"

    @staticmethod
    def return_purchase_order(order_id, operator_id):
        """退货处理
        
        Args:
            order_id: 订单ID
            operator_id: 操作员ID
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            order = PurchaseOrder.query.get(order_id)
            if not order:
                return False, "采购订单不存在"
            
            if order.status != '已付款':
                return False, f"订单状态不允许退货，当前状态: {order.status}"
            
            # 更新订单状态
            order.status = '已退货'
            
            # 创建退款财务记录
            financial_record = FinancialRecord(
                amount=order.total_amount,
                record_type='收入',
                source_type='进货',
                source_id=order.order_id,
                payment_method='银行卡',
                operator_id=operator_id,
                remark=f"退货退款 #{order.order_id}"
            )
            db.session.add(financial_record)
            
            # 更新库存
            for detail in order.details:
                if not detail.is_new_book and detail.book:
                    if not detail.book.update_stock(-detail.quantity):
                        raise ValueError(f"图书《{detail.book.title}》库存不足，无法完成退货")
            
            db.session.commit()
            return True, order.to_dict(include_details=True)
            
        except ValueError as e:
            db.session.rollback()
            return False, str(e)
        except Exception as e:
            db.session.rollback()
            return False, f"处理采购退货失败: {str(e)}"