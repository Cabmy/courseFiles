from flask import Blueprint, request, jsonify, session
from backend.models import db, Book
from backend.routes.user_routes import login_required
from sqlalchemy import or_

book_bp = Blueprint('book_bp', __name__)

# 获取所有图书
@book_bp.route('/', methods=['GET'])
@login_required
def get_all_books():
    # 支持搜索功能
    search_query = request.args.get('search', '')
    
    if search_query:
        # 如果有搜索关键词，就按照书名、作者、出版社、ISBN进行模糊搜索
        books = Book.query.filter(
            or_(
                Book.title.ilike(f'%{search_query}%'),
                Book.author.ilike(f'%{search_query}%'),
                Book.publisher.ilike(f'%{search_query}%'),
                Book.isbn.ilike(f'%{search_query}%')
            )
        ).all()
    else:
        # 否则返回所有图书
        books = Book.query.all()
    
    return jsonify({
        'books': [book.to_dict() for book in books]
    })

# 获取单本图书详情
@book_bp.route('/<int:book_id>', methods=['GET'])
@login_required
def get_book(book_id):
    book = Book.query.get(book_id)
    
    if not book:
        return jsonify({'error': '图书不存在'}), 404
    
    return jsonify({'book': book.to_dict()})

# 添加新图书
@book_bp.route('/', methods=['POST'])
@login_required
def create_book():
    data = request.json
    
    # 验证必填字段
    required_fields = ['isbn', 'title', 'author', 'publisher', 'retail_price']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必填字段: {field}'}), 400
    
    # 检查ISBN是否已存在
    if Book.query.filter_by(isbn=data['isbn']).first():
        return jsonify({'error': 'ISBN已存在'}), 400
    
    # 创建新图书
    new_book = Book(
        isbn=data['isbn'],
        title=data['title'],
        author=data['author'],
        publisher=data['publisher'],
        retail_price=data['retail_price'],
        stock=data.get('stock', 0)  # 库存默认为0
    )
    
    db.session.add(new_book)
    
    try:
        db.session.commit()
        return jsonify({
            'message': '图书添加成功',
            'book': new_book.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'添加图书失败: {str(e)}'}), 500

# 更新图书信息
@book_bp.route('/<int:book_id>', methods=['PUT'])
@login_required
def update_book(book_id):
    book = Book.query.get(book_id)
    
    if not book:
        return jsonify({'error': '图书不存在'}), 404
    
    data = request.json
    
    # 更新图书信息
    if 'isbn' in data and data['isbn'] != book.isbn:
        # 检查新ISBN是否已被使用
        existing_book = Book.query.filter_by(isbn=data['isbn']).first()
        if existing_book and existing_book.book_id != book_id:
            return jsonify({'error': 'ISBN已被其他图书使用'}), 400
        book.isbn = data['isbn']
        
    if 'title' in data:
        book.title = data['title']
    if 'author' in data:
        book.author = data['author']
    if 'publisher' in data:
        book.publisher = data['publisher']
    if 'retail_price' in data:
        book.retail_price = data['retail_price']
    if 'stock' in data:
        book.stock = data['stock']
    
    try:
        db.session.commit()
        return jsonify({
            'message': '图书信息更新成功',
            'book': book.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新图书信息失败: {str(e)}'}), 500

# 删除图书
@book_bp.route('/<int:book_id>', methods=['DELETE'])
@login_required
def delete_book(book_id):
    book = Book.query.get(book_id)
    
    if not book:
        return jsonify({'error': '图书不存在'}), 404
    
    # 检查图书是否有关联的销售记录或进货记录
    if book.sale_records or book.purchase_details:
        return jsonify({'error': '此图书有关联的销售或进货记录，无法删除'}), 400
    
    db.session.delete(book)
    
    try:
        db.session.commit()
        return jsonify({'message': '图书删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'删除图书失败: {str(e)}'}), 500

# 获取库存少于10本的图书（库存预警）
@book_bp.route('/low-stock', methods=['GET'])
@login_required
def get_low_stock_books():
    low_stock_books = Book.query.filter(Book.stock < 10).order_by(Book.stock).all()
    
    return jsonify({
        'books': [book.to_dict() for book in low_stock_books]
    })