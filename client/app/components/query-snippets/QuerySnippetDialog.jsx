import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import DynamicForm from '@/components/dynamic-form/DynamicForm';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';

class QuerySnippetDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    querySnippet: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    readOnly: PropTypes.bool,
    onSubmit: PropTypes.func.isRequired,
  };

  static defaultProps = {
    querySnippet: null,
    readOnly: false,
  }

  constructor(props) {
    super(props);
    this.state = { saving: false };
  }

  handleSubmit = (values, successCallback, errorCallback) => {
    const { querySnippet, dialog, onSubmit } = this.props;
    const querySnippetId = get(querySnippet, 'id');

    this.setState({ saving: true });
    onSubmit(querySnippetId ? { id: querySnippetId, ...values } : values).then(() => {
      dialog.close();
      successCallback('保存成功。');
    }).catch(() => {
      this.setState({ saving: false });
      errorCallback('保存失败。');
    });
  };

  render() {
    const { saving } = this.state;
    const { querySnippet, dialog, readOnly } = this.props;
    const isEditing = !!get(querySnippet, 'id');

    const formFields = [
      { name: 'trigger', title: '触发器', type: 'text', required: true, autoFocus: !isEditing },
      { name: 'description', title: '描述', type: 'text' },
      { name: 'snippet',
        title: '便签',
        type: 'ace',
        required: true },
    ].map(field => ({ ...field, readOnly, initialValue: get(querySnippet, field.name, '') }));

    return (
      <Modal
        {...dialog.props}
        title={(isEditing ? querySnippet.trigger : '添加指标便签')}
        footer={[(
          <Button key="cancel" onClick={dialog.dismiss}>{readOnly ? '关闭' : '取消'}</Button>
        ), (
          !readOnly && (
            <Button
              key="submit"
              htmlType="submit"
              loading={saving}
              disabled={readOnly}
              type="primary"
              form="querySnippetForm"
            >
              {isEditing ? '保存' : '确定'}
            </Button>
          )
        )]}
      >
        <DynamicForm
          id="querySnippetForm"
          fields={formFields}
          onSubmit={this.handleSubmit}
          hideSubmitButton
          feedbackIcons
        />
      </Modal>
    );
  }
}

export default wrapDialog(QuerySnippetDialog);
