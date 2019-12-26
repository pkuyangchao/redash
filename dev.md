# 1 Redash本地环境搭建（基于Docker， windows环境）
## 1.1 框架简介
### 1.1.1 前端
> 基于Webpac构建的angualr1.6单页面应用，可单独由Node启动，也可编译后，作为静态资源文件由python-Web使用。
### 1.1.1后端
> 站点采用Flask框架开发;Flask是一个Python中轻量级的Web应用框架，需单独启动WEB服务。
使用Redis+Celery作为分布式消息任务系统，需单独启动Celery服务和Redis服务。
使用Postgresql对象数据库存储数据，需启动Postgresql服务。
## 1.2 依赖环境
* Python(2.7)
* PostgreSQL(9.3 or newer)
* Redis(2.8.3 or newer)
* Node.js(v6 or newer)
## 1.3 Python环境
### 1.3.1.升级pip
```shell script
python -m pip install --upgrade pip
```
### 1.3.2.安装虚拟环境
```shell script
pip install virtualenv
virtualenv --no-site-packages venv
cd venv/Scripts
activate.bat
```
### 1.3.3.安装Python包
```shell script
pip install -r requirements.txt -r requirements_dev.txt
```
未在文件的python包
```shell script
pip install IPython
```
## 1.4 Node.js环境
### 1.4.1 安装node包
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
# 2 环境配置
###  修改配置文件./redash/setting/init.py
### line:19 修改postgresql链接串
> SQLALCHEMY_DATABASE_URI = os.environ.get("REDASH_DATABASE_URL", os.environ.get('DATABASE_URL', "postgresql://用户名:密码@IP地址:端口/库名"))

## 2.1 环境检查
```shell script
python ./manage.py check_settings
```
## 2.2 创建数据表
```shell script
python ./manage.py database create_tables
```

## 2.3 环境启动
### 2.3.1 启动前端服务
```shell script
npm run build
npm run start
```
### 2.3.2 启动后端服务
```shell script
python ./manage.py runserver --debugger --reload
```
### 2.3.3 启动任务队列服务
```shell script
celery worker --app=redash.worker --pool=eventlet -Qscheduled_queries,queries,celery -c2 --loglevel=info
```
报错`ImportError: No module named eventlet`，安装`pip install eventlet`。

# 3 目录介绍
```shell script
redash
├─bin
├─client
│  ├─app
│  │  ├─assets
│  │  ├─components
│  │  ├─config
│  │  ├─directives
│  │  ├─extensions
│  │  ├─filters
│  │  ├─lib
│  │  ├─pages
│  │  ├─redash-font
│  │  ├─services
│  │  └─visualizations
│  ├─cypress
│  │  ├─integration
│  │  ├─plugins
│  │  └─support
│  └─dist
├─migrations
├─node_modules
├─redash
│  ├─authentication
│  ├─cli
│  ├─destinations
│  ├─handlers
│  ├─metrics
│  ├─models
│  ├─query_runner
│  ├─serializers
│  ├─settings
│  ├─tasks
│  ├─templates
│  └─utils
├─setup
└─tests
   ├─extensions
   ├─handlers
   ├─models
   ├─query_runner
   ├─serializers
   ├─tasks
   └─utils
```
