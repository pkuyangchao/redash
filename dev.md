# Redash本地环境搭建（基于Docker， windows环境）
## 框架简介
### 前端
> 基于Webpac构建的angualr1.6单页面应用，可单独由Node启动，也可编译后，作为静态资源文件由python-Web使用。
### 后端
> 站点采用Flask框架开发;Flask是一个Python中轻量级的Web应用框架，需单独启动WEB服务。
使用Redis+Celery作为分布式消息任务系统，需单独启动Celery服务和Redis服务。
使用Postgresql对象数据库存储数据，需启动Postgresql服务。
## 依赖环境
* Python(2.7)
* PostgreSQL(9.3 or newer)
* Redis(2.8.3 or newer)
* Node.js(v6 or newer)
## Python环境
### 1.升级pip
```shell script
python -m pip install --upgrade pip
```
### 2.安装虚拟环境
```shell script
pip install virtualenv
virtualenv --no-site-packages venv
cd venv/Scripts
activate.bat
```
### 3.安装Python包
```shell script
pip install -r requirements.txt -r requirements_dev.txt
```
未在文件的python包
```shell script
pip install IPython
```
## Node.js环境
### 安装node包
```shell script
npm install
npm run build
```
报错`rm -rf ./client/dist/'rm' 不是内部或外部命令，也不是可运行的程序或批处理文件。 `修改package.json文件
```shell script
"clean": "rm -rf ./client/dist/",
```
修改为：
```shell script
"clean": "rd /s /q \"client/dist\"",
```
报错`NODE_ENV不是内部或外部命令,也不是可运行的程序或批处理文件。`
安装cross-env
```shell script
npm install --save-dev cross-env
```
修改package.json文件
```shell script
"build": "npm run clean && NODE_ENV=production node --max-old-space-size=4096 node_modules/.bin/webpack",
```
修改为：
```shell script
"build": "npm run clean && cross-env NODE_ENV=production webpack --progress --hide-modules --config webpack.config.js",
```
## 环境配置
###  修改配置文件./redash/setting/init.py
### line:19 修改postgresql链接串
> SQLALCHEMY_DATABASE_URI = os.environ.get("REDASH_DATABASE_URL", os.environ.get('DATABASE_URL', "postgresql://用户名:密码@IP地址:端口/库名"))

## 环境检查
```shell script
python ./manage.py check_settings
```
## 创建数据表
```shell script
python ./manage.py database create_tables
```

# 环境启动
## 启动前端服务
```shell script
npm run build
npm run start
```
## 启动后端服务
```shell script
python ./manage.py runserver --debugger --reload
```
## 启动任务队列服务
```shell script
celery worker --app=redash.worker --pool=eventlet -Qscheduled_queries,queries,celery -c2
```
报错`ImportError: No module named eventlet`，安装`pip install eventlet`。
