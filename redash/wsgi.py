#!/usr/bin/env python
# -*- coding: utf-8 -*-
from redash import create_app
# 导入import模块
import sys
reload(sys)
sys.setdefaultencoding("utf-8")

app = create_app()
