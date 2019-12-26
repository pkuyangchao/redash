function alertUnsavedChanges($window) {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      isDirty: '=',
    },
    link($scope) {
      const unloadMessage = '如果您未保存离开，将会丢失您的更改';
      const confirmMessage = `${unloadMessage}\n\n您确定要离开此页面吗？`;
      // store original handler (if any)
      const _onbeforeunload = $window.onbeforeunload;

      $window.onbeforeunload = function onbeforeunload() {
        return $scope.isDirty ? unloadMessage : null;
      };

      $scope.$on('$locationChangeStart', (event, next, current) => {
        if (next.split('?')[0] === current.split('?')[0] || next.split('#')[0] === current.split('#')[0]) {
          return;
        }

        if ($scope.isDirty && !$window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      });

      $scope.$on('$destroy', () => {
        $window.onbeforeunload = _onbeforeunload;
      });
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('alertUnsavedChanges', alertUnsavedChanges);
}

init.init = true;
