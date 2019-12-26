import React from 'react';
import PropTypes from 'prop-types';
import { get, find, toUpper } from 'lodash';
import { react2angular } from 'react2angular';
import Modal from 'antd/lib/modal';
import { DataSource, IMG_ROOT } from '@/services/data-source';
import navigateTo from '@/services/navigateTo';
import { $route } from '@/services/ng';
import notification from '@/services/notification';
import PromiseRejectionError from '@/lib/promise-rejection-error';
import LoadingState from '@/components/items-list/components/LoadingState';
import DynamicForm from '@/components/dynamic-form/DynamicForm';
import helper from '@/components/dynamic-form/dynamicFormHelper';
import { HelpTrigger, TYPES as HELP_TRIGGER_TYPES } from '@/components/HelpTrigger';

class EditDataSource extends React.Component {
  static propTypes = {
    onError: PropTypes.func,
  };

  static defaultProps = {
    onError: () => {},
  };

  state = {
    dataSource: null,
    type: null,
    loading: true,
  };

  componentDidMount() {
    DataSource.get({ id: $route.current.params.dataSourceId }).$promise.then((dataSource) => {
      const { type } = dataSource;
      this.setState({ dataSource });
      DataSource.types(types => this.setState({ type: find(types, { type }), loading: false }));
    }).catch((error) => {
      // ANGULAR_REMOVE_ME This code is related to Angular's HTTP services
      if (error.status && error.data) {
        error = new PromiseRejectionError(error);
      }
      this.props.onError(error);
    });
  }

  saveDataSource = (values, successCallback, errorCallback) => {
    const { dataSource } = this.state;
    helper.updateTargetWithValues(dataSource, values);
    dataSource.$save(
      () => successCallback('保存成功。'),
      (error) => {
        const message = get(error, 'data.message', '保存失败。');
        errorCallback(message);
      },
    );
  };

  deleteDataSource = (callback) => {
    const { dataSource } = this.state;

    const doDelete = () => {
      dataSource.$delete(() => {
        notification.success('数据连接已成功删除。');
        navigateTo('/data_sources', true);
      }, () => {
        callback();
      });
    };

    Modal.confirm({
      title: '删除数据连接',
      content: '您确定要删除此数据连接吗？',
      okText: '删除',
      okType: 'danger',
      onOk: doDelete,
      onCancel: callback,
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  testConnection = (callback) => {
    const { dataSource } = this.state;
    DataSource.test({ id: dataSource.id }, (httpResponse) => {
      if (httpResponse.ok) {
        notification.success('连接成功');
      } else {
        notification.error('连接失败：', httpResponse.message, { duration: 10 });
      }
      callback();
    }, () => {
      notification.error('连接失败：', '连接测试时发生未知错误，请稍后再试...', { duration: 10 });
      callback();
    });
  };

  renderForm() {
    const { dataSource, type } = this.state;
    const fields = helper.getFields(type, dataSource);
    const helpTriggerType = `DS_${toUpper(type.type)}`;
    const formProps = {
      fields,
      type,
      actions: [
        { name: '删除', type: 'danger', callback: this.deleteDataSource },
        { name: '连接测试', pullRight: true, callback: this.testConnection, disableWhenDirty: true },
      ],
      onSubmit: this.saveDataSource,
      feedbackIcons: true,
    };

    return (
      <div className="row" data-test="DataSource">
        <div className="text-right m-r-10">
          {HELP_TRIGGER_TYPES[helpTriggerType] && (
            <HelpTrigger className="f-13" type={helpTriggerType}>
              Setup Instructions <i className="fa fa-question-circle" />
            </HelpTrigger>
          )}
        </div>
        <div className="text-center m-b-10">
          <img className="p-5" src={`${IMG_ROOT}/${type.type}.png`} alt={type.name} width="64" />
          <h3 className="m-0">{type.name}</h3>
        </div>
        <div className="col-md-4 col-md-offset-4 m-b-10">
          <DynamicForm {...formProps} />
        </div>
      </div>
    );
  }

  render() {
    return this.state.loading ? <LoadingState className="" /> : this.renderForm();
  }
}

export default function init(ngModule) {
  ngModule.component('pageEditDataSource', react2angular(EditDataSource));

  return {
    '/data_sources/:dataSourceId': {
      template: '<settings-screen><page-edit-data-source on-error="handleError"></page-edit-data-source></settings-screen>',
      title: '数据连接',
      controller($scope, $exceptionHandler) {
        'ngInject';

        $scope.handleError = $exceptionHandler;
      },
    },
  };
}

init.init = true;
