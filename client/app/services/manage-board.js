export const SCHEMA_NOT_SUPPORTED = 1;
export const SCHEMA_LOAD_ERROR = 2;

export let ManageBoard = null; // eslint-disable-line import/no-mutable-exports


function ManageBoardService($q, $resource, $http) {
  function fetchSchema(manageBoardId, refresh = false) {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }

    return $http.get(`api/manage_boards/${manageBoardId}/schema`, { params });
  }

  const actions = {
    get: { method: 'GET', cache: false, isArray: false },
    query: { method: 'GET', cache: false, isArray: true },
    save: { method: 'POST' },
  };

  const ManageBoardResource = $resource('api/manage_boards/:id', { id: '@id' }, actions);

  ManageBoardResource.prototype.getSchema = function getSchema(refresh = false) {
    if (this._schema === undefined || refresh) {
      return fetchSchema(this.id, refresh).then((response) => {
        const data = response.data;

        this._schema = data;

        return data;
      });
    }

    return $q.resolve(this._schema);
  };

  return ManageBoardResource;
}

export default function init(ngModule) {
  ngModule.factory('ManageBoard', ManageBoardService);

  ngModule.run(($injector) => {
    ManageBoard = $injector.get('ManageBoard');
  });
}

init.init = true;
