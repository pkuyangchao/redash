import React from 'react';
import PropTypes from 'prop-types';
import Tabs from 'antd/lib/tabs';
import { PageHeader } from '@/components/PageHeader';

import './layout.less';

export default function Layout({ activeTab, children }) {
  return (
    <div className="container admin-page-layout">
      <PageHeader title="智能运维" />

      <div className="bg-white tiled">
        <Tabs className="admin-page-layout-tabs" defaultActiveKey={activeTab} animated={false}>
          <Tabs.TabPane key="system_status" tab={<a href="admin/status">系统状态</a>}>
            {(activeTab === 'system_status') ? children : null}
          </Tabs.TabPane>
          <Tabs.TabPane key="tasks" tab={<a href="admin/queries/tasks">Celery状态</a>}>
            {(activeTab === 'tasks') ? children : null}
          </Tabs.TabPane>
          <Tabs.TabPane key="outdated_queries" tab={<a href="admin/queries/outdated">超时指标</a>}>
            {(activeTab === 'outdated_queries') ? children : null}
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
}

Layout.propTypes = {
  activeTab: PropTypes.string,
  children: PropTypes.node,
};

Layout.defaultProps = {
  activeTab: 'system_status',
  children: null,
};
