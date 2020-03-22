export let Group = {}; // eslint-disable-line import/no-mutable-exports

function GroupService($resource) {
  const actions = {
    get: { method: 'GET', cache: false, isArray: false },
    query: { method: 'GET', cache: false, isArray: true },

    members: {
      method: 'GET', cache: false, isArray: true, url: 'api/groups/:id/members',
    },
    addMember: {
      method: 'POST', url: 'api/groups/:id/members',
    },
    removeMember: {
      method: 'DELETE', url: 'api/groups/:id/members/:userId',
    },

    dataSources: {
      method: 'GET', cache: false, isArray: true, url: 'api/groups/:id/data_sources',
    },
    addDataSource: {
      method: 'POST', url: 'api/groups/:id/data_sources',
    },
    removeDataSource: {
      method: 'DELETE', url: 'api/groups/:id/data_sources/:dataSourceId',
    },
    updateDataSource: {
      method: 'POST', url: 'api/groups/:id/data_sources/:dataSourceId',
    },

    manageTargets: {
      method: 'GET', cache: false, isArray: true, url: 'api/groups/:id/manage_targets',
    },
    addManageTarget: {
      method: 'POST', url: 'api/groups/:id/manage_targets',
    },
    removeManageTarget: {
      method: 'DELETE', url: 'api/groups/:id/manage_targets/:manageTargetId',
    },
    updateManageTarget: {
      method: 'POST', url: 'api/groups/:id/manage_targets/:manageTargetId',
    },

    manageBoards: {
      method: 'GET', cache: false, isArray: true, url: 'api/groups/:id/manage_boards',
    },
    addManageBoard: {
      method: 'POST', url: 'api/groups/:id/manage_boards',
    },
    removeManageBoard: {
      method: 'DELETE', url: 'api/groups/:id/manage_boards/:manageBoardId',
    },
    updateManageBoard: {
      method: 'POST', url: 'api/groups/:id/manage_boards/:manageBoardId',
    },
  };
  return $resource('api/groups/:id', { id: '@id' }, actions);
}

export default function init(ngModule) {
  ngModule.factory('Group', GroupService);

  ngModule.run(($injector) => {
    Group = $injector.get('Group');
  });
}

init.init = true;
