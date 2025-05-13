from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from backend.models import db, init_app  
from backend.routes.user_routes import user_bp  
from backend.routes.book_routes import book_bp  
from backend.routes.purchase_routes import purchase_bp  
from backend.routes.sale_routes import sale_bp  
from backend.routes.finance_routes import finance_bp  
from backend.routes.dashboard_routes import dashboard_bp  

# 加载环境变量
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # 配置数据库
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.secret_key = os.getenv('SECRET_KEY')
    
    # 会话配置 - 针对IP访问的特殊设置
    app.config['SESSION_COOKIE_SECURE'] = False
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = None  # 允许跨站点请求
    app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 会话有效期24小时
    app.config['SESSION_COOKIE_DOMAIN'] = None  # 不指定域，让浏览器使用当前访问的域名
    
    # 配置CORS以支持带凭证的跨域请求
    CORS(app, resources={r"/api/*": {
        "origins": "*",  # 允许所有来源，因为我们在开发环境下
        "supports_credentials": True,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }})
    
    # 初始化数据库
    init_app(app)
    
    # 注册蓝图
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(book_bp, url_prefix='/api/books')
    app.register_blueprint(purchase_bp, url_prefix='/api/purchases')
    app.register_blueprint(sale_bp, url_prefix='/api/sales')
    app.register_blueprint(finance_bp, url_prefix='/api/finance')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    
    # 添加错误处理
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': '找不到请求的资源'}), 404
    
    @app.errorhandler(500)
    def server_error(error):
        return jsonify({'error': '服务器内部错误'}), 500
    
    return app