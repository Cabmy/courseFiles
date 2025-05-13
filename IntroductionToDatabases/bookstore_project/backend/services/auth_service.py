from backend import db
from backend.models.user import User
from flask_jwt_extended import create_access_token

class AuthService:
    """用户认证服务类"""
    
    @staticmethod
    def login(username: str, password: str) -> tuple:
        """用户登录
        
        Args:
            username: 用户名
            password: 密码
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            # 查找用户
            user = User.query.filter_by(username=username).first()
            
            # 验证用户存在性和密码
            if user and user.check_password(password):
                # 创建访问令牌
                access_token = create_access_token(identity=user.user_id)
                return True, {
                    'token': access_token,
                    'user': user.to_dict()
                }
            return False, "用户名或密码错误"
            
        except Exception as e:
            return False, f"登录失败: {str(e)}"

    @staticmethod
    def create_user(user_data: dict) -> tuple:
        """创建新用户
        
        Args:
            user_data: 用户信息字典
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            # 检查用户名是否已存在
            if User.query.filter_by(username=user_data['username']).first():
                return False, "用户名已存在"
            
            # 创建新用户
            new_user = User(
                username=user_data['username'],
                password=user_data['password'],
                real_name=user_data['real_name'],
                employee_id=user_data['employee_id'],
                gender=user_data['gender'],
                age=user_data.get('age'),
                role=user_data['role']
            )
            
            db.session.add(new_user)
            db.session.commit()
            
            return True, new_user.to_dict()
            
        except Exception as e:
            db.session.rollback()
            return False, f"创建用户失败: {str(e)}"

    @staticmethod
    def get_user_by_id(user_id: int) -> tuple:
        """根据ID获取用户信息
        
        Args:
            user_id: 用户ID
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "用户不存在"
            return True, user.to_dict()
            
        except Exception as e:
            return False, f"获取用户信息失败: {str(e)}"

    @staticmethod
    def update_user(user_id: int, update_data: dict) -> tuple:
        """更新用户信息
        
        Args:
            user_id: 用户ID
            update_data: 更新的用户信息字典
            
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "用户不存在"
            
            # 更新用户信息
            if 'real_name' in update_data:
                user.real_name = update_data['real_name']
            if 'employee_id' in update_data:
                user.employee_id = update_data['employee_id']
            if 'gender' in update_data:
                user.gender = update_data['gender']
            if 'age' in update_data:
                user.age = update_data['age']
            if 'role' in update_data and update_data['role'] in ['超级管理员', '普通管理员']:
                user.role = update_data['role']
            if 'password' in update_data:
                user.password = user._encrypt_password(update_data['password'])
            
            db.session.commit()
            return True, user.to_dict()
            
        except Exception as e:
            db.session.rollback()
            return False, f"更新用户信息失败: {str(e)}"

    @staticmethod
    def delete_user(user_id: int) -> tuple:
        """删除用户
        
        Args:
            user_id: 用户ID
            
        Returns:
            tuple: (是否成功, 成功消息或错误消息)
        """
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "用户不存在"
            
            db.session.delete(user)
            db.session.commit()
            return True, "用户删除成功"
            
        except Exception as e:
            db.session.rollback()
            return False, f"删除用户失败: {str(e)}"

    @staticmethod
    def change_password(user_id: int, old_password: str, new_password: str) -> tuple:
        """修改用户密码
        
        Args:
            user_id: 用户ID
            old_password: 原密码
            new_password: 新密码
            
        Returns:
            tuple: (是否成功, 成功消息或错误消息)
        """
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "用户不存在"
            
            # 验证原密码
            if not user.check_password(old_password):
                return False, "原密码错误"
            
            # 设置新密码
            user.password = user._encrypt_password(new_password)
            db.session.commit()
            
            return True, "密码修改成功"
            
        except Exception as e:
            db.session.rollback()
            return False, f"修改密码失败: {str(e)}"

    @staticmethod
    def get_all_users() -> tuple:
        """获取所有用户列表
        
        Returns:
            tuple: (是否成功, 结果数据或错误消息)
        """
        try:
            users = User.query.all()
            return True, [user.to_dict() for user in users]
            
        except Exception as e:
            return False, f"获取用户列表失败: {str(e)}"