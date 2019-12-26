import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { currentUser, clientConfig } from '@/services/auth';

export function EmailSettingsWarning({ featureName }) {
  return (clientConfig.mailSettingsMissing && currentUser.isAdmin) ? (
    <p className="alert alert-danger">
      {`您的邮件服务器尚未配置； 请您对其进行配置，以使${featureName}起作用。`}
    </p>
  ) : null;
}

EmailSettingsWarning.propTypes = {
  featureName: PropTypes.string.isRequired,
};

export default function init(ngModule) {
  ngModule.component('emailSettingsWarning', react2angular(EmailSettingsWarning));
}

init.init = true;
