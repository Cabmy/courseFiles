from flask import Blueprint, request, g
from backend import db
from backend.models.book import Book
from backend.utils.response_helper import success_response, error_response, validation_error, pagination_response
from backend.utils.auth_helper import login_required, admin_required

book_bp = Blueprint('book', __name__)

@book_bp.route('', methods=['GET'])
@login_required
def get_books():
    """获取图书列表
    
    Returns:
        JSON: 图书列表
    """
    # 分页参数
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # 搜索参数
    search_term = request.args.get('search', '')
    
    # 排序参数
    sort_by = request.args.get('sort_by', 'book_id')
    sort_order = request.args.get('sort_order', 'asc')
    
    # 构建查询
    query = Book.query
    
    # 应用搜索条件
    if search_term:
        query = query.filter(
            (Book.title.ilike(f'%{search_term}%')) |
            (Book.author.ilike(f'%{search_term}%')) |
            (Book.isbn.ilike(f'%{search_term}%')) |
            (Book.publisher.ilike(f'%{search_term}%'))
        )
    
    # 应用排序
    if sort_order.lower() == 'desc':
        query = query.order_by(getattr(Book, sort_by).desc())
    else:
        query = query.order_by(getattr(Book, sort_by).asc())
    
    # 执行分页查询
    books = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # 返回结果
    result = {
        'items': [book.to_dict() for book in books.items],
        'meta': {
            'page': books.page,
            'per_page': books.per_page,
            'total': books.total,
            'pages': books.pages,
            'has_next': books.has_next,
            'has_prev': books.has_prev
        }
    }
    
    return success_response(result, "获取图书列表成功")

@book_bp.route('/<int:book_id>', methods=['GET'])
@login_required
def get_book(book_id):
    """获取单本图书详情
    
    Args:
        book_id: 图书ID
        
    Returns:
        JSON: 图书详情
    """
    book = Book.query.get(book_id)
    
    if not book:
        return error_response("图书不存在", 404)
    
    return success_response(book.to_dict(), "获取图书详情成功")

@book_bp.route('', methods=['POST'])
@admin_required
def create_book():
    """创建新图书
    
    Returns:
        JSON: 创建结果
    """
    data = request.get_json()
    
    # 数据验证
    required_fields = ['isbn', 'title', 'author', 'publisher', 'retail_price']
    missing_fields = [field for field in required_fields if field not in data or not data[field]]
    
    if missing_fields:
        return validation_error({'message': f'缺少必填字段: {", ".join(missing_fields)}'})
    
    # 检查ISBN是否已存在
    if Book.query.filter_by(isbn=data['isbn']).first():
        return error_response("ISBN已存在", 400)
    
    # 创建新图书
    try:
        new_book = Book(
            isbn=data['isbn'],
            title=data['title'],
            author=data['author'],
            publisher=data['publisher'],
            retail_price=data['retail_price'],
            stock=data.get('stock', 0)
        )
        
        db.session.add(new_book)
        db.session.commit()
        
        return success_response(new_book.to_dict(), "图书创建成功")
    
    except Exception as e:
        db.session.rollback()
        return error_response(f"创建图书失败: {str(e)}", 500)

@book_bp.route('/<int:book_id>', methods=['PUT'])
@admin_required
def update_book(book_id):
    """更新图书信息
    
    Args:
        book_id: 图书ID
        
    Returns:
        JSON: 更新结果
    """
    book = Book.query.get(book_id)
    
    if not book:
        return error_response("图书不存在", 404)
    
    data = request.get_json()
    
    # 更新图书信息
    try:
        if 'title' in data:
            book.title = data['title']
        if 'author' in data:
            book.author = data['author']
        if 'publisher' in data:
            book.publisher = data['publisher']
        if 'retail_price' in data:
            book.retail_price = data['retail_price']
        if 'stock' in data:
            try:
                new_stock_value = int(data['stock'])
                # Calculate the change required to reach the new_stock_value.
                # The Book.update_stock method will handle the non-negative check.
                quantity_change = new_stock_value - book.stock
                if not book.update_stock(quantity_change):
                    # This implies new_stock_value itself was < 0.
                    return error_response("库存不能设置为负数", 400)
            except (ValueError, TypeError):
                return error_response("库存值必须是一个有效的整数", 400)
        if 'isbn' in data and data['isbn'] != book.isbn:
            # 检查ISBN是否已存在
            if Book.query.filter_by(isbn=data['isbn']).first():
                return error_response("ISBN已存在", 400)
            book.isbn = data['isbn']
        
        db.session.commit()
        
        return success_response(book.to_dict(), "图书信息更新成功")
    
    except Exception as e:
        db.session.rollback()
        return error_response(f"更新图书信息失败: {str(e)}", 500)

@book_bp.route('/<int:book_id>', methods=['DELETE'])
@admin_required
def delete_book(book_id):
    """删除图书
    
    Args:
        book_id: 图书ID
        
    Returns:
        JSON: 删除结果
    """
    book = Book.query.get(book_id)
    
    if not book:
        return error_response("图书不存在", 404)
    
    # 检查是否有相关的销售记录或进货记录
    if book.sale_records or book.purchase_details:
        return error_response("该图书有相关的销售或进货记录，无法删除", 400)
    
    try:
        db.session.delete(book)
        db.session.commit()
        
        return success_response(message="图书删除成功")
    
    except Exception as e:
        db.session.rollback()
        return error_response(f"删除图书失败: {str(e)}", 500)

@book_bp.route('/inventory/update', methods=['POST'])
@admin_required
def update_inventory():
    """手动更新图书库存
    
    Returns:
        JSON: 更新结果
    """
    data = request.get_json()
    
    # 数据验证
    if not data or 'book_id' not in data or 'change' not in data:
        return validation_error({'message': '缺少必填字段: book_id, change'})
    
    book_id = data['book_id']
    change = data['change']
    
    book = Book.query.get(book_id)
    
    if not book:
        return error_response("图书不存在", 404)
    
    try:
        # 尝试更新库存
        success = book.update_stock(change)
        
        if not success:
            return error_response("库存不能为负数", 400)
        
        db.session.commit()
        
        return success_response({
            'book_id': book.book_id,
            'title': book.title,
            'new_stock': book.stock
        }, "库存更新成功")
    
    except Exception as e:
        db.session.rollback()
        return error_response(f"更新库存失败: {str(e)}", 500)

@book_bp.route('/low-stock', methods=['GET'])
@login_required
def get_low_stock_books():
    """获取库存不足的图书
    
    Returns:
        JSON: 库存不足的图书列表
    """
    # 获取库存阈值参数，默认为10
    threshold = request.args.get('threshold', 10, type=int)
    
    try:
        # 查询库存低于阈值的图书
        books = Book.query.filter(Book.stock < threshold).order_by(Book.stock.asc()).all()
        
        return success_response([book.to_dict() for book in books], "获取库存不足图书成功")
        
    except Exception as e:
        return error_response(f"获取库存不足图书失败: {str(e)}", 500)

@book_bp.route('/batch', methods=['POST'])
@admin_required
def batch_create_books():
    """批量创建图书
    
    Returns:
        JSON: 创建结果
    """
    data = request.get_json()
    
    if not data or not isinstance(data, list):
        return validation_error({'message': '请提供图书数组'})
    
    if len(data) > 100:
        return validation_error({'message': '单次最多可导入100本图书'})
    
    # 记录结果
    results = {
        'success': 0,
        'failed': 0,
        'errors': []
    }
    
    # 批量添加的图书
    created_books = []
    
    for idx, book_data in enumerate(data):
        # 数据验证
        required_fields = ['isbn', 'title', 'author', 'publisher', 'retail_price']
        missing_fields = [field for field in required_fields if field not in book_data or not book_data[field]]
        
        if missing_fields:
            results['failed'] += 1
            results['errors'].append({
                'index': idx,
                'data': book_data,
                'error': f'缺少必填字段: {", ".join(missing_fields)}'
            })
            continue
        
        # 检查ISBN是否已存在
        if Book.query.filter_by(isbn=book_data['isbn']).first():
            results['failed'] += 1
            results['errors'].append({
                'index': idx,
                'data': book_data,
                'error': f'ISBN {book_data["isbn"]} 已存在'
            })
            continue
        
        try:
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
            db.session.flush()  # 获取ID但不提交
            
            created_books.append(new_book.to_dict())
            results['success'] += 1
            
        except Exception as e:
            results['failed'] += 1
            results['errors'].append({
                'index': idx,
                'data': book_data,
                'error': str(e)
            })
    
    # 如果有成功添加的图书，提交事务
    if results['success'] > 0:
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return error_response(f"批量添加图书失败: {str(e)}", 500)
    
    results['books'] = created_books
    return success_response(results, f"批量添加图书完成: 成功 {results['success']} 条，失败 {results['failed']} 条")

@book_bp.route('/categories', methods=['GET'])
@login_required
def get_book_categories():
    """获取图书分类列表
    
    Returns:
        JSON: 分类列表
    """
    try:
        # 从数据库中获取所有不同的分类
        # 使用publisher作为临时分类依据
        publishers = db.session.query(Book.publisher).distinct().all()
        categories = [publisher[0] for publisher in publishers if publisher[0]]
        
        # 如果需要限制返回的分类数量，可以进行排序和筛选
        # 例如，按照每个出版社的图书数量排序
        publisher_counts = db.session.query(
            Book.publisher, db.func.count(Book.book_id)
        ).group_by(Book.publisher).all()
        
        # 按照图书数量排序，取前15个最常见的出版社
        sorted_publishers = sorted(publisher_counts, key=lambda x: x[1], reverse=True)
        top_publishers = [p[0] for p in sorted_publishers[:15] if p[0]]
        
        # 如果分类数量过少，可以添加一些通用分类
        if len(top_publishers) < 5:
            top_publishers.extend(["文学", "科技", "历史", "艺术", "教育"])
            # 去重
            top_publishers = list(dict.fromkeys(top_publishers))
        
        return success_response(top_publishers, "获取图书分类成功")
        
    except ValueError:
        return error_response("库存必须是整数", 400)
    except Exception as e:
        return error_response(f"获取图书分类失败: {str(e)}", 500)