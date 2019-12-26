import React from 'react';
import Button from 'antd/lib/button';
import { react2angular } from 'react2angular';
import { isEmpty, get } from 'lodash';
import settingsMenu from '@/services/settingsMenu';
import { Destination, IMG_ROOT } from '@/services/destination';
import { policy } from '@/services/policy';
import navigateTo from '@/services/navigateTo';
import { $route } from '@/services/ng';
import { routesToAngularRoutes } from '@/lib/utils';
import CardsList from '@/components/cards-list/CardsList';
import LoadingState from '@/components/items-list/components/LoadingState';
import CreateSourceDialog from '@/components/CreateSourceDialog';
import helper from '@/components/dynamic-form/dynamicFormHelper';

class DestinationsList extends React.Component {
  state = {
    destinationTypes: [],
    destinations: [],
    loading: true,
  };

  componentDidMount() {
    Promise.all([
      Destination.query().$promise,
      Destination.types().$promise,
    ]).then(values => this.setState({
      destinations: values[0],
      destinationTypes: values[1],
      loading: false,
    }, () => { // all resources are loaded in state
      if ($route.current.locals.isNewDestinationPage) {
        if (policy.canCreateDestination()) {
          this.showCreateSourceDialog();
        } else {
          navigateTo('/destinations');
        }
      }
    }));
  }

  createDestination = (selectedType, values) => {
    const target = { options: {}, type: selectedType.type };
    helper.updateTargetWithValues(target, values);

    return Destination.save(target).$promise.then((destination) => {
      this.setState({ loading: true });
      Destination.query(destinations => this.setState({ destinations, loading: false }));
      return destination;
    }).catch((error) => {
      if (!(error instanceof Error)) {
        error = new Error(get(error, 'data.message', '保存失败。'));
      }
      return Promise.reject(error);
    });
  };

  showCreateSourceDialog = () => {
    CreateSourceDialog.showModal({
      types: this.state.destinationTypes,
      sourceType: '监控',
      imageFolder: IMG_ROOT,
      onCreate: this.createDestination,
    }).result.then((result = {}) => {
      if (result.success) {
        navigateTo(`destinations/${result.data.id}`);
      }
    });
  };

  renderDestinations() {
    const { destinations } = this.state;
    const items = destinations.map(destination => ({
      title: destination.name,
      imgSrc: `${IMG_ROOT}/${destination.type}.png`,
      href: `destinations/${destination.id}`,
    }));

    return isEmpty(destinations) ? (
      <div className="text-center">
        您尚未添加监控
        {policy.isCreateDestinationEnabled() && (
          <div className="m-t-5">
            <a className="clickable" onClick={this.showCreateSourceDialog}>点击此处</a> 添加
          </div>
        )}
      </div>
    ) : (<CardsList items={items} />);
  }

  render() {
    const newDestinationProps = {
      type: 'primary',
      onClick: policy.isCreateDestinationEnabled() ? this.showCreateSourceDialog : null,
      disabled: !policy.isCreateDestinationEnabled(),
    };

    return (
      <div>
        <div className="m-b-15">
          <Button {...newDestinationProps}>
            <i className="fa fa-plus m-r-5" />
            添加监控
          </Button>
        </div>
        {this.state.loading ? <LoadingState className="" /> : this.renderDestinations()}
      </div>
    );
  }
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'admin',
    title: '智能监控',
    path: 'destinations',
    order: 4,
  });

  ngModule.component('pageDestinationsList', react2angular(DestinationsList));

  return routesToAngularRoutes([
    {
      path: '/destinations',
      title: '智能监控',
      key: 'destinations',
    },
    {
      path: '/destinations/new',
      title: '智能监控',
      key: 'destinations',
      isNewDestinationPage: true,
    },
  ], {
    template: '<settings-screen><page-destinations-list></page-destinations-list></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });
}

init.init = true;
