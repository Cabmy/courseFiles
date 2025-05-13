import os
from datetime import timedelta

class Config:
    """基础配置类"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'bookstore-secret-key'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT配置 - 使用显式常量字符串作为JWT密钥，不从环境变量获取
    JWT_SECRET_KEY = 'bookstore-jwt-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)  # 延长到1天
    
    # 确保JWT识别请求头格式
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'mysql+pymysql://root:admin@localhost/bookstore_management'

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///test.db'

class ProductionConfig(Config):
    # 生产环境配置
    pass

# 配置字典
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}