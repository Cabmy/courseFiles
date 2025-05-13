from flask import Blueprint, request, jsonify, session
from backend.models import db, User
import hashlib
from functools import wraps

user_bp = Blueprint('user_bp', __name__)

# 检查用户是否已登录的装饰器
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': '请先登录'}), 401
        return f(*args, **kwargs)
    return decorated_function

# 检查是否是超级管理员的装饰器
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': '请先登录'}), 401
        
        user = User.query.get(session['user_id'])
        if not user or user.role != '超级管理员':
            return jsonify({'error': '需要超级管理员权限'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

# 用户登录
@user_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': '用户名或密码错误'}), 401
    
    session['user_id'] = user.user_id
    session['role'] = user.role
    
    return jsonify({
        'message': '登录成功',
        'user': user.to_dict()
    })

# 用户登出
@user_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    session.pop('role', None)
    return jsonify({'message': '已成功登出'})

# 获取当前用户信息
@user_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    
    return jsonify({'user': user.to_dict()})

# 获取所有用户列表（仅超级管理员可用）
@user_bp.route('/', methods=['GET'])
@admin_required
def get_all_users():
    users = User.query.all()
    return jsonify({
        'users': [user.to_dict() for user in users]
    })

# 创建新用户（仅超级管理员可用）
@user_bp.route('/', methods=['POST'])
@admin_required
def create_user():
    data = request.json
    
    # 验证必填字段
    required_fields = ['username', 'password', 'real_name', 'employee_id', 'gender', 'role']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必填字段: {field}'}), 400
    
    # 检查用户名是否已存在
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': '用户名已存在'}), 400
    
    # 创建新用户
    new_user = User(
        username=data['username'],
        password=User.hash_password(data['password']),
        real_name=data['real_name'],
        employee_id=data['employee_id'],
        gender=data['gender'],
        age=data.get('age'),  # 年龄可选
        role=data['role']
    )
    
    db.session.add(new_user)
    
    try:
        db.session.commit()
        return jsonify({
            'message': '用户创建成功',
            'user': new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建用户失败: {str(e)}'}), 500

# 更新用户信息（用户可更新自己的信息，超级管理员可更新所有人）
@user_bp.route('/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    # 检查权限
    current_user = User.query.get(session['user_id'])
    if current_user.user_id != user_id and current_user.role != '超级管理员':
        return jsonify({'error': '没有权限修改此用户信息'}), 403
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    
    data = request.json
    
    # 更新用户信息
    if 'real_name' in data:
        user.real_name = data['real_name']
    if 'employee_id' in data:
        user.employee_id = data['employee_id']
    if 'gender' in data:
        user.gender = data['gender']
    if 'age' in data:
        user.age = data['age']
    
    # 只有超级管理员可以更新角色
    if 'role' in data and current_user.role == '超级管理员':
        user.role = data['role']
    
    # 更新密码需要单独处理
    if 'password' in data:
        user.password = User.hash_password(data['password'])
    
    try:
        db.session.commit()
        return jsonify({
            'message': '用户信息更新成功',
            'user': user.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新用户信息失败: {str(e)}'}), 500

# 删除用户（仅超级管理员可用）
@user_bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    
    # 禁止删除自己
    if user.user_id == session['user_id']:
        return jsonify({'error': '不能删除当前登录的用户'}), 400
    
    db.session.delete(user)
    
    try:
        db.session.commit()
        return jsonify({'message': '用户删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'删除用户失败: {str(e)}'}), 500