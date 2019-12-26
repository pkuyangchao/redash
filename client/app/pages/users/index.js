import { extend } from 'lodash';
import { routesToAngularRoutes } from '@/lib/utils';

export default function init() {
  const listRoutes = routesToAngularRoutes([
    {
      path: '/users',
      title: '用户',
      key: 'active',
    },
    {
      path: '/users/new',
      title: '用户',
      key: 'active',
      isNewUserPage: true,
    },
    {
      path: '/users/pending',
      title: '等待邀请',
      key: 'pending',
    },
    {
      path: '/users/disabled',
      title: '禁用用户',
      key: 'disabled',
    },
  ], {
    template: '<settings-screen><page-users-list on-error="handleError"></page-users-list></settings-screen>',
    reloadOnSearch: false,
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });

  const profileRoutes = routesToAngularRoutes([
    {
      path: '/users/me',
      title: '账号设置',
      key: 'users',
    },
    {
      path: '/users/:userId',
      title: '用户',
      key: 'users',
    },
  ], {
    reloadOnSearch: false,
    template: '<settings-screen><page-user-profile on-error="handleError"></page-user-profile></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });

  return extend(listRoutes, profileRoutes);
}

init.init = true;
