from functools import wraps
from flask import request, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from backend.models.user import User
from backend.utils.response_helper import error_response

def admin_required(fn):
    """验证用户是否为管理员的装饰器
    
    Args:
        fn: 被装饰的函数
        
    Returns:
        被装饰后的函数
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # 验证JWT
        verify_jwt_in_request()
        
        # 获取当前用户
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role not in ['超级管理员', '普通管理员']:
            return error_response("权限不足，需要管理员权限", 403)
        
        # 设置全局用户对象
        g.current_user = user
        
        return fn(*args, **kwargs)
    return wrapper

def super_admin_required(fn):
    """验证用户是否为超级管理员的装饰器
    
    Args:
        fn: 被装饰的函数
        
    Returns:
        被装饰后的函数
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # 验证JWT
        verify_jwt_in_request()
        
        # 获取当前用户
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != '超级管理员':
            return error_response("权限不足，需要超级管理员权限", 403)
        
        # 设置全局用户对象
        g.current_user = user
        
        return fn(*args, **kwargs)
    return wrapper

def login_required(fn):
    """验证用户是否已登录的装饰器
    
    Args:
        fn: 被装饰的函数
        
    Returns:
        被装饰后的函数
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # 验证JWT
        verify_jwt_in_request()
        
        # 获取当前用户
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return error_response("用户未登录或会话已过期", 401)
        
        # 设置全局用户对象
        g.current_user = user
        
        return fn(*args, **kwargs)
    return wrapper

def get_current_user():
    """获取当前登录用户
    
    Returns:
        User: 当前登录用户对象，如未登录则返回None
    """
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        return User.query.get(user_id)
    except:
        return None