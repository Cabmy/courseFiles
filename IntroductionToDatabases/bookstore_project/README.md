# 书店管理系统

-----
## 1. 功能描述

书店管理系统是一个综合性的管理平台，旨在帮助书店高效管理日常运营。系统主要包含以下功能模块：

### 1.1 用户管理
- 用户登录与身份验证
- 权限控制（普通管理员和超级管理员）
- 用户密码修改

### 1.2 图书管理
- 图书列表展示与搜索
- 添加、编辑和删除图书
- 图书库存管理与调整
- 低库存预警
- 导出图书数据

### 1.3 销售管理
- 创建销售记录
- 销售历史查询与筛选
- 畅销书统计
- 销售报表

### 1.4 采购管理
- 创建采购订单
- 采购订单管理（查看、入库、取消）
- 采购历史查询
- 采购状态跟踪（未付款、已付款、已退货、部分入库）

### 1.5 财务管理
- 财务概览（收入、支出、利润统计）
- 财务记录查询
- 财务趋势图表
- 财务报表导出打印

### 1.6 仪表盘
- 销售额实时统计
- 库存预警显示
- 销售趋势图表
- 最近销售和采购记录

-----
## 2. 设计思路

### 2.1 系统架构
本系统采用前后端分离的设计模式，基于Flask框架开发后端API，前端使用Bootstrap框架构建用户界面，通过RESTful API进行数据交互。

### 2.2 数据流设计
- **图书流程**：入库（采购）→ 库存管理 → 销售 → 库存更新
- **财务流程**：销售/采购行为 → 生成财务记录 → 财务汇总 → 财务报表
- **用户授权流程**：登录验证 → JWT令牌生成 → 请求鉴权

### 2.3 安全设计
- 使用JWT（JSON Web Token）进行身份验证
- 密码加密存储（MD5加密）
- API访问控制，根据用户角色限制权限

### 2.4 界面设计
- 响应式布局，支持不同设备访问
- 直观的导航和操作流程
- 数据可视化展示（图表）

-----
## 3. 数据表设计

### 3.1 用户表（user）
```sql
CREATE TABLE user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(32) NOT NULL, -- MD5加密的密码
    real_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(20) NOT NULL,
    gender ENUM('男', '女') NOT NULL,
    age INT CHECK (age > 0),
    role ENUM('超级管理员', '普通管理员') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 图书表（book）
```sql
CREATE TABLE book (
    book_id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(100) NOT NULL,
    publisher VARCHAR(100) NOT NULL,
    retail_price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3.3 采购订单表（purchase_order）
```sql
CREATE TABLE purchase_order (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    creator_id INT NOT NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('未付款', '已付款', '已退货') NOT NULL DEFAULT '未付款',
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    remark VARCHAR(500),
    FOREIGN KEY (creator_id) REFERENCES user(user_id)
);
```

### 3.4 采购明细表（purchase_detail）
```sql
CREATE TABLE purchase_detail (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    book_id INT,
    isbn VARCHAR(20),
    title VARCHAR(200),
    author VARCHAR(100),
    publisher VARCHAR(100),
    quantity INT NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    is_new_book BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (order_id) REFERENCES purchase_order(order_id),
    FOREIGN KEY (book_id) REFERENCES book(book_id)
);
```

### 3.5 销售记录表（sale_record）
```sql
CREATE TABLE sale_record (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    quantity INT NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    sale_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    seller_id INT NOT NULL,
    remark VARCHAR(500),
    FOREIGN KEY (book_id) REFERENCES book(book_id),
    FOREIGN KEY (seller_id) REFERENCES user(user_id)
);
```

### 3.6 财务记录表（financial_record）
```sql
CREATE TABLE financial_record (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('收入', '支出') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    source_type ENUM('进货', '销售') NOT NULL,
    source_id INT NOT NULL,
    record_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operator_id INT NOT NULL,
    description VARCHAR(500),
    FOREIGN KEY (operator_id) REFERENCES user(user_id)
);
```

### 3.7 财务汇总表（financial_summary）
```sql
CREATE TABLE financial_summary (
    summary_id INT AUTO_INCREMENT PRIMARY KEY,
    summary_date DATE NOT NULL UNIQUE,
    total_income DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_expense DECIMAL(12, 2) NOT NULL DEFAULT 0,
    sale_income DECIMAL(12, 2) NOT NULL DEFAULT 0,
    purchase_expense DECIMAL(12, 2) NOT NULL DEFAULT 0,
    other_income DECIMAL(12, 2) NOT NULL DEFAULT 0,
    other_expense DECIMAL(12, 2) NOT NULL DEFAULT 0,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3.8 ER设计图
![alt text](ER设计图.png)

-----
## 4. 运行指南

### 4.1 环境要求
- Python 3.8+
- MySQL 5.7+
- Web浏览器（建议使用Chrome或Firefox最新版本）

### 4.2 安装步骤

1. 克隆项目代码：
```bash
git clone https://github.com/yourusername/bookstore_project.git
cd bookstore_project
```

2. 创建并激活虚拟环境：
```bash
python -m venv venv
source venv/bin/activate  # 在Windows上使用 venv\Scripts\activate
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 配置数据库：
   - 创建MySQL数据库
   - 修改 config.py 中的数据库连接信息

5. 初始化数据库：
```bash
# 创建数据表和视图
mysql -u username -p database_name < db/schema.sql
mysql -u username -p database_name < db/views.sql
# 创建存储过程和函数
mysql -u username -p database_name < db/functions.sql
# 创建索引
mysql -u username -p database_name < db/indexes.sql
```

### 4.3 运行应用

1. 启动Flask应用：
```bash
python run.py
```

2. 访问应用：
   - 打开浏览器访问 `http://localhost:5000`
   - 使用默认超级管理员账号登录：
     - 用户名：`admin`
     - 密码：`admin123`
