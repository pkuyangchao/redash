import { get } from 'lodash';
import React from 'react';
import { react2angular } from 'react2angular';

import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import PromiseRejectionError from '@/lib/promise-rejection-error';
import { Paginator } from '@/components/Paginator';
import QuerySnippetDialog from '@/components/query-snippets/QuerySnippetDialog';

import { wrap as liveItemsList, ControllerType } from '@/components/items-list/ItemsList';
import { ResourceItemsSource } from '@/components/items-list/classes/ItemsSource';
import { StateStorage } from '@/components/items-list/classes/StateStorage';

import LoadingState from '@/components/items-list/components/LoadingState';
import ItemsTable, { Columns } from '@/components/items-list/components/ItemsTable';

import { QuerySnippet } from '@/services/query-snippet';
import navigateTo from '@/services/navigateTo';
import settingsMenu from '@/services/settingsMenu';
import { currentUser } from '@/services/auth';
import { policy } from '@/services/policy';
import notification from '@/services/notification';
import { routesToAngularRoutes } from '@/lib/utils';
import './QuerySnippetsList.less';

const canEditQuerySnippet = querySnippet => (currentUser.isAdmin || currentUser.id === get(querySnippet, 'user.id'));

class QuerySnippetsList extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  listColumns = [
    Columns.custom.sortable((text, querySnippet) => (
      <div>
        <a className="table-main-title clickable" onClick={() => this.showSnippetDialog(querySnippet)}>
          {querySnippet.trigger}
        </a>
      </div>
    ), {
      title: '触发器',
      field: 'trigger',
      className: 'text-nowrap',
    }),
    Columns.custom.sortable(text => text, {
      title: '描述',
      field: 'description',
      className: 'text-nowrap',
    }),
    Columns.custom(snippet => (
      <code className="snippet-content">
        {snippet}
      </code>
    ), {
      title: '便签',
      field: 'snippet',
    }),
    Columns.avatar({ field: 'user', className: 'p-l-0 p-r-0' }, name => `Created by ${name}`),
    Columns.date.sortable({
      title: '添加日期',
      field: 'created_at',
      className: 'text-nowrap',
      width: '1%',
    }),
    Columns.custom((text, querySnippet) => canEditQuerySnippet(querySnippet) && (
      <Button type="danger" className="w-100" onClick={e => this.deleteQuerySnippet(e, querySnippet)}>
        删除
      </Button>
    ), {
      width: '1%',
    }),
  ];

  componentDidMount() {
    const { isNewOrEditPage, querySnippetId } = this.props.controller.params;

    if (isNewOrEditPage) {
      if (querySnippetId === 'new') {
        if (policy.isCreateQuerySnippetEnabled()) {
          this.showSnippetDialog();
        } else {
          navigateTo('/query_snippets');
        }
      } else {
        QuerySnippet.get({ id: querySnippetId }).$promise
          .then(this.showSnippetDialog)
          .catch((error = {}) => {
            // ANGULAR_REMOVE_ME This code is related to Angular's HTTP services
            if (error.status && error.data) {
              error = new PromiseRejectionError(error);
            }
            this.props.controller.handleError(error);
          });
      }
    }
  }

  saveQuerySnippet = querySnippet => QuerySnippet.save(querySnippet).$promise;

  deleteQuerySnippet = (event, querySnippet) => {
    Modal.confirm({
      title: '删除指标便签',
      content: '您确定要删除此指标便签吗？',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        querySnippet.$delete(() => {
          notification.success('指标便签已成功删除。');
          this.props.controller.update();
        }, () => {
          notification.error('删除指标便签失败。');
        });
      },
    });
  }

  showSnippetDialog = (querySnippet = null) => {
    const canSave = !querySnippet || canEditQuerySnippet(querySnippet);
    navigateTo('/query_snippets/' + get(querySnippet, 'id', 'new'), true, false);
    QuerySnippetDialog.showModal({
      querySnippet,
      onSubmit: this.saveQuerySnippet,
      readOnly: !canSave,
    }).result
      .then(() => this.props.controller.update())
      .finally(() => {
        navigateTo('/query_snippets', true, false);
      });
  };

  render() {
    const { controller } = this.props;

    return (
      <div>
        <div className="m-b-15">
          <Button
            type="primary"
            onClick={() => this.showSnippetDialog()}
            disabled={!policy.isCreateQuerySnippetEnabled()}
          >
            <i className="fa fa-plus m-r-5" />
            添加指标便签
          </Button>
        </div>

        {!controller.isLoaded && <LoadingState className="" />}
        {controller.isLoaded && controller.isEmpty && (
          <div className="text-center">
          您尚未添加指标便签
            {policy.isCreateQuerySnippetEnabled() && (
              <div className="m-t-5">
                <a className="clickable" onClick={() => this.showSnippetDialog()}>点击此处</a>添加
              </div>
            )}
          </div>
        )}
        {
          controller.isLoaded && !controller.isEmpty && (
            <div className="table-responsive">
              <ItemsTable
                items={controller.pageItems}
                columns={this.listColumns}
                context={this.actions}
                orderByField={controller.orderByField}
                orderByReverse={controller.orderByReverse}
                toggleSorting={controller.toggleSorting}
              />
              <Paginator
                totalCount={controller.totalItemsCount}
                itemsPerPage={controller.itemsPerPage}
                page={controller.page}
                onChange={page => controller.updatePagination({ page })}
              />
            </div>
          )
        }
      </div>
    );
  }
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'create_query',
    title: '指标便签',
    path: 'query_snippets',
    order: 5,
  });

  ngModule.component('pageQuerySnippetsList', react2angular(liveItemsList(
    QuerySnippetsList,
    new ResourceItemsSource({
      isPlainList: true,
      getRequest() {
        return {};
      },
      getResource() {
        return QuerySnippet.query.bind(QuerySnippet);
      },
      getItemProcessor() {
        return (item => new QuerySnippet(item));
      },
    }),
    new StateStorage({ orderByField: 'trigger', itemsPerPage: 10 }),
  )));

  return routesToAngularRoutes([
    {
      path: '/query_snippets',
      title: '指标便签',
      key: 'query_snippets',
    },
    {
      path: '/query_snippets/:querySnippetId',
      title: '指标便签',
      key: 'query_snippets',
      isNewOrEditPage: true,
    },
  ], {
    reloadOnSearch: false,
    template: '<settings-screen><page-query-snippets-list on-error="handleError"></page-query-snippets-list></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });
}

init.init = true;
