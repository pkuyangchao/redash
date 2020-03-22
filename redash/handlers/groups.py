#!/usr/bin/env python
# -*- coding: utf-8 -*-
import time
from flask import request
from flask_restful import abort
from redash import models
from redash.permissions import require_admin, require_permission
from redash.handlers.base import BaseResource, get_object_or_404


class GroupListResource(BaseResource):
    @require_admin
    def post(self):
        name = request.json['name']
        group = models.Group(name=name, org=self.current_org)
        models.db.session.add(group)
        models.db.session.commit()

        self.record_event({
            'action': 'create',
            'object_id': group.id,
            'object_type': 'group'
        })

        return group.to_dict()

    def get(self):
        if self.current_user.has_permission('admin'):
            groups = models.Group.all(self.current_org)
        else:
            groups = models.Group.query.filter(
                models.Group.id.in_(self.current_user.group_ids))

        self.record_event({
            'action': 'list',
            'object_id': 'groups',
            'object_type': 'group',
        })

        return [g.to_dict() for g in groups]


class GroupResource(BaseResource):
    @require_admin
    def post(self, group_id):
        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        if group.type == models.Group.BUILTIN_GROUP:
            abort(400, message="Can't modify built-in groups.")

        group.name = request.json['name']
        models.db.session.commit()

        self.record_event({
            'action': 'edit',
            'object_id': group.id,
            'object_type': 'group'
        })

        return group.to_dict()

    def get(self, group_id):
        if not (self.current_user.has_permission('admin') or int(group_id) in self.current_user.group_ids):
            abort(403)

        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        self.record_event({
            'action': 'view',
            'object_id': group_id,
            'object_type': 'group',
        })

        return group.to_dict()

    @require_admin
    def delete(self, group_id):
        group = models.Group.get_by_id_and_org(group_id, self.current_org)
        if group.type == models.Group.BUILTIN_GROUP:
            abort(400, message="Can't delete built-in groups.")

        members = models.Group.members(group_id)
        for member in members:
            member.group_ids.remove(int(group_id))
            models.db.session.add(member)

        models.db.session.delete(group)
        models.db.session.commit()


class GroupMemberListResource(BaseResource):
    @require_admin
    def post(self, group_id):
        user_id = request.json['user_id']
        user = models.User.get_by_id_and_org(user_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)
        user.group_ids.append(group.id)
        models.db.session.commit()

        self.record_event({
            'action': 'add_member',
            'object_id': group.id,
            'object_type': 'group',
            'member_id': user.id
        })
        return user.to_dict()

    @require_permission('list_users')
    def get(self, group_id):
        if not (self.current_user.has_permission('admin') or int(group_id) in self.current_user.group_ids):
            abort(403)

        members = models.Group.members(group_id)
        return [m.to_dict() for m in members]


class GroupMemberResource(BaseResource):
    @require_admin
    def delete(self, group_id, user_id):
        user = models.User.get_by_id_and_org(user_id, self.current_org)
        user.group_ids.remove(int(group_id))
        models.db.session.commit()

        self.record_event({
            'action': 'remove_member',
            'object_id': group_id,
            'object_type': 'group',
            'member_id': user.id
        })


def serialize_data_source_with_group(data_source, data_source_group):
    d = data_source.to_dict()
    d['view_only'] = data_source_group.view_only
    return d


class GroupDataSourceListResource(BaseResource):
    @require_admin
    def post(self, group_id):
        data_source_id = request.json['data_source_id']
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        data_source_group = data_source.add_group(group)
        models.db.session.commit()

        self.record_event({
            'action': 'add_data_source',
            'object_id': group_id,
            'object_type': 'group',
            'member_id': data_source.id
        })

        return serialize_data_source_with_group(data_source, data_source_group)

    @require_admin
    def get(self, group_id):
        group = get_object_or_404(models.Group.get_by_id_and_org, group_id,
                                  self.current_org)

        # TOOD: move to models
        data_sources = (models.DataSource.query
                        .join(models.DataSourceGroup)
                        .filter(models.DataSourceGroup.group == group))

        self.record_event({
            'action': 'list',
            'object_id': group_id,
            'object_type': 'group',
        })

        return [ds.to_dict(with_permissions_for=group) for ds in data_sources]


class GroupDataSourceResource(BaseResource):
    @require_admin
    def post(self, group_id, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)
        view_only = request.json['view_only']

        data_source_group = data_source.update_group_permission(group, view_only)
        models.db.session.commit()

        self.record_event({
            'action': 'change_data_source_permission',
            'object_id': group_id,
            'object_type': 'group',
            'member_id': data_source.id,
            'view_only': view_only
        })

        return serialize_data_source_with_group(data_source, data_source_group)

    @require_admin
    def delete(self, group_id, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        data_source.remove_group(group)
        models.db.session.commit()

        self.record_event({
            'action': 'remove_data_source',
            'object_id': group_id,
            'object_type': 'group',
            'member_id': data_source.id
        })


class GroupManageTargetResource(BaseResource):
    @require_admin
    def post(self, group_id, manage_target_id):
        manage_target = models.Query.get_by_id_and_org(manage_target_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)
        view_only = request.json['view_only']

        manage_target_group = manage_target.update_group_permission(group, view_only)
        models.db.session.commit()

        self.record_event({
            'action': 'change_manage_target_permission',
            'object_id': group_id,
            'object_type': 'group',
            'member_id': manage_target.id,
            'view_only': view_only
        })

        return serialize_data_source_with_group(manage_target, manage_target_group)

    @require_admin
    def delete(self, group_id, manage_target_id):
        manage_target = models.Query.get_by_id_and_org(manage_target_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        manage_target.remove_group(group)
        models.db.session.commit()

        self.record_event({
            'action': 'remove_manage_target',
            'object_id': group_id,
            'object_type': 'group',
            'member_id': manage_target.id
        })


class GroupManageTargetListResource(BaseResource):
    @require_admin
    def post(self, group_id):
        try:
            print (request.json['data_source_id'])
        except:
            print ('manage_target')
            print (request.json['manage_target_id'])

        manage_target_id = request.json['data_source_id']
        manage_target = models.Query.get_by_id_and_org(manage_target_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        manage_target_group = manage_target.add_group(group)
        models.db.session.commit()

        self.record_event({
            'action': 'add_manage_target',
            'object_id': group_id,
            'object_type': 'group',
            'member_id': manage_target.id
        })

        return serialize_data_source_with_group(manage_target, manage_target_group)

    @require_admin
    def get(self, group_id):
        group = get_object_or_404(models.Group.get_by_id_and_org, group_id,
                                  self.current_org)

        # TOOD: move to models
        manage_targets = (models.Query.query
                        .join(models.ManageTargetGroup)
                        .filter(models.ManageTargetGroup.group == group))

        self.record_event({
            'action': 'list',
            'object_id': group_id,
            'object_type': 'group',
        })

        return [ds.to_dict(with_permissions_for=group) for ds in manage_targets]

class GroupManageBoardResource(BaseResource):
    @require_admin
    def post(self, group_id, manage_board_id):
        manage_board = models.Dashboard.get_by_id_and_org(manage_board_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)
        view_only = request.json['view_only']

        manage_board_group = manage_board.update_group_permission(group, view_only)
        models.db.session.commit()

        self.record_event({
            'action': 'change_manage_board_permission',
            'object_id': group_id,
            'object_type': 'group',
            'member_id': manage_board.id,
            'view_only': view_only
        })

        return serialize_data_source_with_group(manage_board, manage_board_group)

    @require_admin
    def delete(self, group_id, manage_board_id):
        manage_board = models.Dashboard.get_by_id_and_org(manage_board_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        manage_board.remove_group(group)
        models.db.session.commit()

        self.record_event({
            'action': 'remove_manage_board',
            'object_id': group_id,
            'object_type': 'group',
            'member_id': manage_board.id
        })


class GroupManageBoardListResource(BaseResource):
    @require_admin
    def post(self, group_id):
        try:
            print (request.json['data_source_id'])
        except:
            print ('manage_board')
            print (request.json['manage_board_id'])

        manage_board_id = request.json['data_source_id']
        manage_board = models.Dashboard.get_by_id_and_org(manage_board_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)
        manage_board_group = manage_board.add_group(group)
        models.db.session.commit()
        self.record_event({
            'action': 'add_manage_board',
            'object_id': group_id,
            'object_type': 'group',
            'member_id': manage_board.id
        })
        return serialize_data_source_with_group(manage_board, manage_board_group)

    @require_admin
    def get(self, group_id):
        group = get_object_or_404(models.Group.get_by_id_and_org, group_id,
                                  self.current_org)

        # TOOD: move to models
        manage_boards = (models.Dashboard.query
                        .join(models.ManageBoardGroup)
                        .filter(models.ManageBoardGroup.group == group))
        # print (manage_boards)
        self.record_event({
            'action': 'list',
            'object_id': group_id,
            'object_type': 'group',
        })
        # print([ds.to_dict(with_permissions_for=group) for ds in manage_boards])

        return [ds.to_dict(with_permissions_for=group) for ds in manage_boards]
