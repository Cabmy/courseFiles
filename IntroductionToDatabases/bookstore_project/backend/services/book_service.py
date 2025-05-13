from backend import db
from backend.models.book import Book
from sqlalchemy import or_

class BookService:
    """图书服务类"""
    
    @staticmethod
    def get_books(filters=None, page=1, per_page=20):
        """获取图书列表
        
        Args:
            filters: 过滤条件字典
            page: 页码
            per_page: 每页记录数
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            query = Book.query
            
            # 应用过滤条件
            if filters:
                # 搜索条件
                if 'search' in filters:
                    search_term = f"%{filters['search']}%"
                    query = query.filter(
                        or_(
                            Book.title.ilike(search_term),
                            Book.author.ilike(search_term),
                            Book.isbn.ilike(search_term),
                            Book.publisher.ilike(search_term)
                        )
                    )
                
                # 库存过滤
                if 'min_stock' in filters:
                    query = query.filter(Book.stock >= filters['min_stock'])
                if 'max_stock' in filters:
                    query = query.filter(Book.stock <= filters['max_stock'])
                
                # 价格过滤
                if 'min_price' in filters:
                    query = query.filter(Book.retail_price >= filters['min_price'])
                if 'max_price' in filters:
                    query = query.filter(Book.retail_price <= filters['max_price'])
            
            # 执行分页查询
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            
            result = {
                'items': [book.to_dict() for book in pagination.items],
                'meta': {
                    'page': pagination.page,
                    'per_page': pagination.per_page,
                    'total': pagination.total,
                    'pages': pagination.pages
                }
            }
            
            return True, result
            
        except Exception as e:
            return False, f"获取图书列表失败: {str(e)}"

    @staticmethod
    def get_book_by_id(book_id):
        """根据ID获取图书信息
        
        Args:
            book_id: 图书ID
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            book = Book.query.get(book_id)
            if not book:
                return False, "图书不存在"
            
            return True, book.to_dict()
            
        except Exception as e:
            return False, f"获取图书信息失败: {str(e)}"

    @staticmethod
    def create_book(book_data):
        """创建新图书
        
        Args:
            book_data: 图书信息字典
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            # 验证必要字段
            required_fields = ['isbn', 'title', 'author', 'publisher', 'retail_price']
            if not all(field in book_data for field in required_fields):
                return False, f"缺少必要字段: {', '.join(required_fields)}"
            
            # 检查ISBN是否已存在
            if Book.query.filter_by(isbn=book_data['isbn']).first():
                return False, "ISBN已存在"
            
            # 创建新图书
            new_book = Book(
                isbn=book_data['isbn'],
                title=book_data['title'],
                author=book_data['author'],
                publisher=book_data['publisher'],
                retail_price=book_data['retail_price'],
                stock=book_data.get('stock', 0)
            )
            
            db.session.add(new_book)
            db.session.commit()
            
            return True, new_book.to_dict()
            
        except Exception as e:
            db.session.rollback()
            return False, f"创建图书失败: {str(e)}"

    @staticmethod
    def update_book(book_id, update_data):
        """更新图书信息
        
        Args:
            book_id: 图书ID
            update_data: 更新的图书信息字典
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            book = Book.query.get(book_id)
            if not book:
                return False, "图书不存在"
            
            # 更新图书信息
            if 'isbn' in update_data and update_data['isbn'] != book.isbn:
                # 检查新ISBN是否已存在
                if Book.query.filter_by(isbn=update_data['isbn']).first():
                    return False, "ISBN已存在"
                book.isbn = update_data['isbn']
            
            if 'title' in update_data:
                book.title = update_data['title']
            if 'author' in update_data:
                book.author = update_data['author']
            if 'publisher' in update_data:
                book.publisher = update_data['publisher']
            if 'retail_price' in update_data:
                book.retail_price = update_data['retail_price']
            if 'stock' in update_data:
                try:
                    new_stock_value = int(update_data['stock'])
                    # Calculate the change needed to reach the new_stock_value.
                    # The Book.update_stock method handles the non-negative check.
                    quantity_change = new_stock_value - book.stock
                    if not book.update_stock(quantity_change):
                        # This condition means new_stock_value itself was negative.
                        return False, "库存不能设置为负数"
                except (ValueError, TypeError):
                    return False, "库存值必须是一个有效的整数"
            
            db.session.commit()
            return True, book.to_dict()
            
        except Exception as e:
            db.session.rollback()
            return False, f"更新图书信息失败: {str(e)}"

    @staticmethod
    def delete_book(book_id):
        """删除图书
        
        Args:
            book_id: 图书ID
            
        Returns:
            tuple: (是否成功, 成功消息或错误消息)
        """
        try:
            book = Book.query.get(book_id)
            if not book:
                return False, "图书不存在"
            
            # 检查是否有相关的销售或采购记录
            if book.sale_records or book.purchase_details:
                return False, "该图书有相关的销售或采购记录，无法删除"
            
            db.session.delete(book)
            db.session.commit()
            
            return True, "图书删除成功"
            
        except Exception as e:
            db.session.rollback()
            return False, f"删除图书失败: {str(e)}"

    @staticmethod
    def update_stock(book_id, quantity_change):
        """更新图书库存
        
        Args:
            book_id: 图书ID
            quantity_change: 库存变化量（正数增加，负数减少）
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            book = Book.query.get(book_id)
            if not book:
                return False, "图书不存在"
            
            # 尝试更新库存
            if not book.update_stock(quantity_change):
                return False, "库存不足"
            
            db.session.commit()
            return True, book.to_dict()
            
        except Exception as e:
            db.session.rollback()
            return False, f"更新库存失败: {str(e)}"

    @staticmethod
    def get_low_stock_books(threshold=10):
        """获取库存不足的图书
        
        Args:
            threshold: 库存阈值
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            books = Book.query.filter(Book.stock < threshold).order_by(Book.stock.asc()).all()
            return True, [book.to_dict() for book in books]
            
        except Exception as e:
            return False, f"获取库存不足图书失败: {str(e)}"

    @staticmethod
    def search_books(keyword):
        """搜索图书
        
        Args:
            keyword: 搜索关键词
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            search_term = f"%{keyword}%"
            books = Book.query.filter(
                or_(
                    Book.title.ilike(search_term),
                    Book.author.ilike(search_term),
                    Book.isbn.ilike(search_term),
                    Book.publisher.ilike(search_term)
                )
            ).all()
            
            return True, [book.to_dict() for book in books]
            
        except Exception as e:
            return False, f"搜索图书失败: {str(e)}"