from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# 实例化SQLAlchemy，使得在模型中导入
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name='default'):
    """创建Flask应用实例
    
    Args:
        config_name: 配置名称，可选值为'development', 'testing', 'production'
        
    Returns:
        Flask应用实例
    """
    from backend.config import config
    
    app = Flask(__name__,
                static_folder='../frontend/static', 
                template_folder='../frontend/templates')
    
    # 加载配置
    app.config.from_object(config[config_name])
    
    # 初始化扩展
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)
    
    # 注册JWT错误处理器
    from backend.utils.response_helper import error_response
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return error_response(message="令牌已过期，请重新登录", status_code=401)
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return error_response(message="无效的令牌，请重新登录", status_code=401)
    
    @jwt.unauthorized_loader
    def unauthorized_callback(error_string):
        return error_response(message="请先登录", status_code=401)
    
    @jwt.user_lookup_error_loader
    def user_lookup_error_callback(jwt_header, jwt_data):
        return error_response(message="用户查找错误，请重新登录", status_code=401)
    
    # 注册蓝图
    from backend.routes import auth_bp, book_bp, purchase_bp, sale_bp, financial_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(book_bp, url_prefix='/api/books')
    app.register_blueprint(purchase_bp, url_prefix='/api/purchases')
    app.register_blueprint(sale_bp, url_prefix='/api/sales')
    app.register_blueprint(financial_bp, url_prefix='/api/financial')
    
    return app