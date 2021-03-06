import { template as templateBuilder } from 'lodash';
import notification from '@/services/notification';
import Modal from 'antd/lib/modal';
import template from './alert.html';
import AlertTemplate from '@/services/alert-template';
import { clientConfig } from '@/services/auth';
import navigateTo from '@/services/navigateTo';

function AlertCtrl($scope, $routeParams, $location, $sce, $sanitize, currentUser, Query, Events, Alert) {
  this.alertId = $routeParams.alertId;
  this.hidePreview = false;
  this.alertTemplate = new AlertTemplate();
  this.showExtendedOptions = clientConfig.extendedAlertOptions;

  if (this.alertId === 'new') {
    Events.record('view', 'page', 'alerts/new');
  }

  this.trustAsHtml = html => $sce.trustAsHtml(html);

  this.onQuerySelected = (item) => {
    this.alert.query = item;
    this.selectedQuery = new Query(item);
    this.selectedQuery.getQueryResultPromise().then((result) => {
      this.queryResult = result;
      this.alert.options.column = this.alert.options.column || result.getColumnNames()[0];
    });
    $scope.$applyAsync();
  };

  if (this.alertId === 'new') {
    this.alert = new Alert({ options: {} });
    this.canEdit = true;
  } else {
    this.alert = Alert.get({ id: this.alertId }, (alert) => {
      this.onQuerySelected(alert.query);
      this.canEdit = currentUser.canEdit(this.alert);
    });
  }

  this.ops = ['greater than', 'less than', 'equals'];
  this.selectedQuery = null;

  const defaultNameBuilder = templateBuilder('<%= query.name %>: <%= options.column %> <%= options.op %> <%= options.value %>');

  this.getDefaultName = () => {
    if (!this.alert.query) {
      return undefined;
    }
    return defaultNameBuilder(this.alert);
  };

  this.searchQueries = (term) => {
    if (!term || term.length < 3) {
      return;
    }

    Query.query({ q: term }, (results) => {
      this.queries = results.results;
    });
  };

  this.saveChanges = () => {
    if (this.alert.name === undefined || this.alert.name === '') {
      this.alert.name = this.getDefaultName();
    }
    if (this.alert.rearm === '' || this.alert.rearm === 0) {
      this.alert.rearm = null;
    }
    if (this.alert.template === undefined || this.alert.template === '') {
      this.alert.template = null;
    }
    this.alert.$save(
      (alert) => {
        notification.success('保存成功。');
        if (this.alertId === 'new') {
          $location.path(`/alerts/${alert.id}`).replace();
        }
      },
      () => {
        notification.error('保存失败。');
      },
    );
  };

  this.preview = () => {
    const notifyError = () => notification.error('无法渲染描述，请确认您的模板。');
    try {
      const result = this.alertTemplate.render(this.alert, this.queryResult.query_result.data);
      this.alert.preview = $sce.trustAsHtml(result.escaped);
      this.alert.previewHTML = $sce.trustAsHtml($sanitize(result.raw));
      if (!result.raw) {
        notifyError();
      }
    } catch (e) {
      notifyError();
      this.alert.preview = e.message;
      this.alert.previewHTML = e.message;
    }
  };

  this.delete = () => {
    const doDelete = () => {
      this.alert.$delete(() => {
        notification.success('监控已成功删除。');
        navigateTo('/alerts', true);
      }, () => {
        notification.error('删除失败。');
      });
    };

    Modal.confirm({
      title: '删除监控',
      content: '您确定要删除此监控吗？',
      okText: '删除',
      okType: 'danger',
      onOk: doDelete,
      maskClosable: true,
      autoFocusButton: null,
    });
  };
}

export default function init(ngModule) {
  ngModule.component('alertPage', {
    template,
    controller: AlertCtrl,
  });

  return {
    '/alerts/:alertId': {
      template: '<alert-page></alert-page>',
      title: '监控',
    },
  };
}

init.init = true;
