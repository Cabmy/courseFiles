from flask import Blueprint, request, jsonify
from backend import db, jwt
from backend.models.user import User
from backend.utils.response_helper import success_response, error_response, validation_error
from backend.utils.auth_helper import admin_required, super_admin_required
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录API
    
    Returns:
        JSON: 登录结果，包含JWT令牌
    """
    data = request.get_json()
    
    # 数据验证
    if not data or not data.get('username') or not data.get('password'):
        return validation_error({'message': '用户名和密码不能为空'})
    
    # 查找用户
    user = User.query.filter_by(username=data['username']).first()
    
    # 验证密码
    if user and user.check_password(data['password']):
        # 创建访问令牌
        access_token = create_access_token(identity=user.user_id)
        
        return success_response({
            'token': access_token,
            'user': user.to_dict()
        }, "登录成功")
    
    return error_response("用户名或密码错误", 401)

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """获取当前用户个人信息
    
    Returns:
        JSON: 用户个人信息
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return error_response("用户不存在", 404)
    
    return success_response(user.to_dict(), "获取个人信息成功")

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """修改密码
    
    Returns:
        JSON: 修改结果
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return error_response("用户不存在", 404)
    
    data = request.get_json()
    
    # 数据验证
    if not data or not data.get('old_password') or not data.get('new_password'):
        return validation_error({'message': '原密码和新密码不能为空'})
    
    # 验证原密码
    if not user.check_password(data['old_password']):
        return error_response("原密码错误", 400)
    
    # 设置新密码
    user.password = user._encrypt_password(data['new_password'])
    db.session.commit()
    
    return success_response(message="密码修改成功")

@auth_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """获取用户列表（仅管理员）
    
    Returns:
        JSON: 用户列表
    """
    users = User.query.all()
    users_data = [user.to_dict() for user in users]
    
    return success_response(users_data, "获取用户列表成功")

@auth_bp.route('/users', methods=['POST'])
@super_admin_required
def create_user():
    """创建新用户（仅超级管理员）
    
    Returns:
        JSON: 创建结果
    """
    data = request.get_json()
    
    # 数据验证
    required_fields = ['username', 'password', 'real_name', 'employee_id', 'gender', 'role']
    missing_fields = [field for field in required_fields if field not in data or not data[field]]
    
    if missing_fields:
        return validation_error({'message': f'缺少必填字段: {", ".join(missing_fields)}'})
    
    # 检查用户名是否已存在
    if User.query.filter_by(username=data['username']).first():
        return error_response("用户名已存在", 400)
    
    # 创建新用户
    try:
        new_user = User(
            username=data['username'],
            password=data['password'],  # 模型中会自动加密
            real_name=data['real_name'],
            employee_id=data['employee_id'],
            gender=data['gender'],
            age=data.get('age'),
            role=data['role']
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return success_response(new_user.to_dict(), "用户创建成功")
    
    except Exception as e:
        db.session.rollback()
        return error_response(f"创建用户失败: {str(e)}", 500)

@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@super_admin_required
def update_user(user_id):
    """更新用户信息（仅超级管理员）
    
    Args:
        user_id: 用户ID
        
    Returns:
        JSON: 更新结果
    """
    user = User.query.get(user_id)
    
    if not user:
        return error_response("用户不存在", 404)
    
    data = request.get_json()
    
    # 更新用户信息
    try:
        if 'real_name' in data:
            user.real_name = data['real_name']
        if 'employee_id' in data:
            user.employee_id = data['employee_id']
        if 'gender' in data:
            user.gender = data['gender']
        if 'age' in data:
            user.age = data['age']
        if 'role' in data and data['role'] in ['超级管理员', '普通管理员']:
            user.role = data['role']
        if 'password' in data:
            user.password = user._encrypt_password(data['password'])
        
        db.session.commit()
        
        return success_response(user.to_dict(), "用户信息更新成功")
    
    except Exception as e:
        db.session.rollback()
        return error_response(f"更新用户信息失败: {str(e)}", 500)

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@super_admin_required
def delete_user(user_id):
    """删除用户（仅超级管理员）
    
    Args:
        user_id: 用户ID
        
    Returns:
        JSON: 删除结果
    """
    user = User.query.get(user_id)
    
    if not user:
        return error_response("用户不存在", 404)
    
    # 不允许删除自己
    current_user_id = get_jwt_identity()
    if user_id == current_user_id:
        return error_response("不能删除当前登录的用户", 400)
    
    try:
        db.session.delete(user)
        db.session.commit()
        
        return success_response(message="用户删除成功")
    
    except Exception as e:
        db.session.rollback()
        return error_response(f"删除用户失败: {str(e)}", 500)

@auth_bp.route('/check-token', methods=['GET'])
@jwt_required()
def check_token():
    """检查JWT令牌是否有效"""
    try:
        # 添加调试信息，打印请求头
        print("检查令牌请求头:", request.headers)
        
        current_user_id = get_jwt_identity()
        print(f"解析的用户ID: {current_user_id}")
        
        user = User.query.get(current_user_id)
        
        if not user:
            print(f"未找到用户ID: {current_user_id}")
            return jsonify({
                "status": "error",
                "message": "用户不存在"
            }), 401
            
        return jsonify({
            "status": "success",
            "message": "令牌有效",
            "data": {
                'user_id': user.user_id,
                'username': user.username,
                'role': user.role
            }
        })
    except Exception as e:
        # 添加详细的异常日志输出
        import traceback
        print(f"令牌验证错误详情: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": f"令牌验证错误: {str(e)}"
        }), 401