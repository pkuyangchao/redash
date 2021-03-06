import { includes, each, filter } from 'lodash';
import notification from '@/services/notification';
import template from './permissions-editor.html';

const PermissionsEditorComponent = {
  template,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($http, User) {
    'ngInject';

    this.grantees = [];
    this.newGrantees = {};
    this.aclUrl = this.resolve.aclUrl.url;
    this.owner = this.resolve.owner;

    // List users that are granted permissions
    const loadGrantees = () => {
      $http.get(this.aclUrl).success((result) => {
        this.grantees = [];

        each(result, (grantees, accessType) => {
          grantees.forEach((grantee) => {
            grantee.access_type = accessType;
            this.grantees.push(grantee);
          });
        });
      });
    };

    loadGrantees();

    // Search for user
    this.findUser = (search) => {
      if (search === '') {
        this.foundUsers = [];
        return;
      }

      User.query({ q: search }, (response) => {
        const users = filter(response.results, u => u.id !== this.owner.id);
        const existingIds = this.grantees.map(m => m.id);
        users.forEach((user) => {
          user.alreadyGrantee = includes(existingIds, user.id);
        });
        this.foundUsers = users;
      });
    };

    // Add new user to grantees list
    this.addGrantee = (user) => {
      this.newGrantees = {};
      const body = { access_type: 'modify', user_id: user.id };
      $http.post(this.aclUrl, body).success(() => {
        user.alreadyGrantee = true;
        loadGrantees();
      }).catch((error) => {
        if (error.status === 403) {
          notification.error('您无法将用户添加到该模型。', '要求模型所有者授权。');
        } else {
          notification.error('操作错误');
        }
      });
    };

    // Remove user from grantees list
    this.removeGrantee = (user) => {
      const body = { access_type: 'modify', user_id: user.id };
      $http({
        url: this.aclUrl,
        method: 'DELETE',
        data: body,
        headers: { 'Content-Type': 'application/json' },
      }).success(() => {
        this.grantees = this.grantees.filter(m => m !== user);

        if (this.foundUsers) {
          this.foundUsers.forEach((u) => {
            if (u.id === user.id) {
              u.alreadyGrantee = false;
            }
          });
        }
      });
    };
  },
};

export default function init(ngModule) {
  ngModule.component('permissionsEditor', PermissionsEditorComponent);
}

init.init = true;
