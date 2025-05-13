import os
from backend.app import create_app # 从 backend.app 导入
from flask import send_from_directory

app = create_app()

# 获取 frontend 文件夹的绝对路径
# run.py 在根目录，所以路径相对于当前文件目录
frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')

@app.route('/')
def serve_index():
    return send_from_directory(frontend_dir, 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory(frontend_dir, path)

if __name__ == '__main__':
    # 注意：在生产环境中，debug模式应该关闭
    # 使用 '0.0.0.0' 使服务可以从网络中的其他机器访问
    app.run(host='0.0.0.0', port=5000, debug=True)