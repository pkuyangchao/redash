import { filter, map, includes } from 'lodash';
import React from 'react';
import { react2angular } from 'react2angular';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import Menu from 'antd/lib/menu';
import Icon from 'antd/lib/icon';
import { Paginator } from '@/components/Paginator';

import { wrap as liveItemsList, ControllerType } from '@/components/items-list/ItemsList';
import { ResourceItemsSource } from '@/components/items-list/classes/ItemsSource';
import { StateStorage } from '@/components/items-list/classes/StateStorage';

import LoadingState from '@/components/items-list/components/LoadingState';
import ItemsTable, { Columns } from '@/components/items-list/components/ItemsTable';
import SelectItemsDialog from '@/components/SelectItemsDialog';
import { DataSourcePreviewCard } from '@/components/PreviewCard';

import GroupName from '@/components/groups/GroupName';
import ListItemAddon from '@/components/groups/ListItemAddon';
import Sidebar from '@/components/groups/DetailsPageSidebar';
import Layout from '@/components/layouts/ContentWithSidebar';

import notification from '@/services/notification';
import { currentUser } from '@/services/auth';
import { Group } from '@/services/group';
import { ManageBoard } from '@/services/manage-board';
import navigateTo from '@/services/navigateTo';
import { routesToAngularRoutes } from '@/lib/utils';

class GroupManageBoards extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  groupId = parseInt(this.props.controller.params.groupId, 10);

  group = null;

  sidebarMenu = [
    {
      key: 'users',
      href: `groups/${this.groupId}`,
      title: '角色成员',
    },
    {
      key: 'managetargets',
      href: `groups/${this.groupId}/manage_targets`,
      title: '指标管理',
    },
    {
      key: 'manageboards',
      href: `groups/${this.groupId}/manage_boards`,
      title: '看板管理',
    },
    {
      key: 'datasources',
      href: `groups/${this.groupId}/data_sources`,
      title: '数据连接',
      isAvailable: () => currentUser.isAdmin,
    },
  ];

  listColumns = [
    Columns.custom((text, datasource) => (
      <DataSourcePreviewCard dataSource={datasource} withLink />
    ), {
      title: 'Name',
      field: 'name',
      width: null,
    }),
    Columns.custom((text, datasource) => {
      const menu = (
        <Menu
          selectedKeys={[datasource.view_only ? 'viewonly' : 'full']}
          onClick={item => this.setManageBoardPermissions(datasource, item.key)}
        >
          <Menu.Item key="full">Full Access</Menu.Item>
          <Menu.Item key="viewonly">View Only</Menu.Item>
        </Menu>
      );

      return (
        <Dropdown trigger={['click']} overlay={menu}>
          <Button className="w-100">{datasource.view_only ? 'View Only' : 'Full Access'}<Icon type="down" /></Button>
        </Dropdown>
      );
    }, {
      width: '1%',
      className: 'p-r-0',
      isAvailable: () => currentUser.isAdmin,
    }),
    Columns.custom((text, datasource) => (
      <Button className="w-100" type="danger" onClick={() => this.removeGroupManageBoard(datasource)}>Remove</Button>
    ), {
      width: '1%',
      isAvailable: () => currentUser.isAdmin,
    }),
  ];

  componentDidMount() {
    Group.get({ id: this.groupId }).$promise
      .then((group) => {
        this.group = group;
        this.forceUpdate();
      })
      .catch((error) => {
        this.props.controller.handleError(error);
      });
  }

  removeGroupManageBoard = (datasource) => {
    Group.removeManageBoard({ id: this.groupId, manageBoardId: datasource.id }).$promise
      .then(() => {
        this.props.controller.updatePagination({ page: 1 });
        this.props.controller.update();
      })
      .catch(() => {
        notification.error('无法从角色中删除看板权限。');
      });
  };

  setManageBoardPermissions = (datasource, permission) => {
    const viewOnly = permission !== 'full';

    Group.updateManageBoard({ id: this.groupId, manageBoardId: datasource.id }, { view_only: viewOnly }).$promise
      .then(() => {
        datasource.view_only = viewOnly;
        this.forceUpdate();
      })
      .catch(() => {
        notification.error('更改看板管理权限失败。');
      });
  };

  addManageBoards = () => {
    const allManageBoards = ManageBoard.query().$promise;
    const alreadyAddedManageBoards = map(this.props.controller.allItems, ds => ds.id);
    SelectItemsDialog.showModal({
      dialogTitle: '',
      inputPlaceholder: '请输入搜索的看板权限...',
      selectedItemsTitle: '添加管理看板权限',
      searchItems: (searchTerm) => {
        searchTerm = searchTerm.toLowerCase();
        return allManageBoards.then(items => filter(items, ds => ds.name.toLowerCase().includes(searchTerm)));
      },
      renderItem: (item, { isSelected }) => {
        const alreadyInGroup = includes(alreadyAddedManageBoards, item.id);
        return {
          content: (
            <DataSourcePreviewCard dataSource={item}>
              <ListItemAddon isSelected={isSelected} alreadyInGroup={alreadyInGroup} />
            </DataSourcePreviewCard>
          ),
          isDisabled: alreadyInGroup,
          className: isSelected || alreadyInGroup ? 'selected' : '',
        };
      },
      renderStagedItem: (item, { isSelected }) => ({
        content: (
          <DataSourcePreviewCard dataSource={item}>
            <ListItemAddon isSelected={isSelected} isStaged />
          </DataSourcePreviewCard>
        ),
      }),
      save: (items) => {
        const promises = map(items, ds => Group.addManageBoard({ id: this.groupId, data_source_id: ds.id }).$promise);
        return Promise.all(promises);
      },
    }).result.finally(() => {
      this.props.controller.update();
    });
  };

  render() {
    const { controller } = this.props;
    return (
      <div data-test="Group">
        <GroupName className="d-block m-t-0 m-b-15" group={this.group} onChange={() => this.forceUpdate()} />
        <Layout>
          <Layout.Sidebar>
            <Sidebar
              controller={controller}
              group={this.group}
              items={this.sidebarMenu}
              canAddManageBoards={currentUser.isAdmin}
              onAddManageBoardsClick={this.addManageBoards}
              onGroupDeleted={() => navigateTo('/groups', true)}
            />
          </Layout.Sidebar>
          <Layout.Content>
            {!controller.isLoaded && <LoadingState className="" />}
            {controller.isLoaded && controller.isEmpty && (
              <div className="text-center">
                <p>
                  此角色中还没有可管理的看板。
                </p>
                {currentUser.isAdmin && (
                  <Button type="primary" onClick={this.addManageBoards}>
                    <i className="fa fa-plus m-r-5" />添加管理看板
                  </Button>
                )}
              </div>
            )}
            {
              controller.isLoaded && !controller.isEmpty && (
                <div className="table-responsive">
                  <ItemsTable
                    items={controller.pageItems}
                    columns={this.listColumns}
                    showHeader={false}
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
          </Layout.Content>
        </Layout>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageGroupManageBoards', react2angular(liveItemsList(
    GroupManageBoards,
    new ResourceItemsSource({
      isPlainList: true,
      getRequest(unused, { params: { groupId } }) {
        return { id: groupId };
      },
      getResource() {
        return Group.manageBoards.bind(Group);
      },
      getItemProcessor() {
        return (item => new ManageBoard(item));
      },
    }),
    new StateStorage({ orderByField: 'name' }),
  )));

  return routesToAngularRoutes([
    {
      path: '/groups/:groupId/manage_boards',
      title: '角色的管理看板权限',
      key: 'manageboards',
    },
  ], {
    reloadOnSearch: false,
    template: '<settings-screen><page-group-manage-boards on-error="handleError"></page-group-manage-boards></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });
}

init.init = true;
