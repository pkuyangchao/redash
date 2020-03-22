export const SCHEMA_NOT_SUPPORTED = 1;
export const SCHEMA_LOAD_ERROR = 2;

export let ManageTarget = null; // eslint-disable-line import/no-mutable-exports


function ManageTargetService($q, $resource, $http) {
  function fetchSchema(manageTargetId, refresh = false) {
    const params = {};

    if (refresh) {
      params.refresh = true;
    }

    return $http.get(`api/manage_targets/${manageTargetId}/schema`, { params });
  }

  const actions = {
    get: { method: 'GET', cache: false, isArray: false },
    query: { method: 'GET', cache: false, isArray: true },
    save: { method: 'POST' },
  };

  const ManageTargetResource = $resource('api/manage_targets/:id', { id: '@id' }, actions);

  ManageTargetResource.prototype.getSchema = function getSchema(refresh = false) {
    if (this._schema === undefined || refresh) {
      return fetchSchema(this.id, refresh).then((response) => {
        const data = response.data;

        this._schema = data;

        return data;
      });
    }

    return $q.resolve(this._schema);
  };

  return ManageTargetResource;
}

export default function init(ngModule) {
  ngModule.factory('ManageTarget', ManageTargetService);

  ngModule.run(($injector) => {
    ManageTarget = $injector.get('ManageTarget');
  });
}

init.init = true;
