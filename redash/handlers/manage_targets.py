#!/usr/bin/env python
# -*- coding: utf-8 -*-
import logging

from flask import make_response, request
from flask_restful import abort
from funcy import project
from six import text_type
from sqlalchemy.exc import IntegrityError

from redash import models
from redash.handlers.base import BaseResource, get_object_or_404, require_fields
from redash.permissions import (require_access, require_admin,
                                require_permission, view_only)
from redash.query_runner import (get_configuration_schema_for_query_runner_type,
                                 query_runners, NotSupported)
from redash.utils import filter_none
from redash.utils.configuration import ConfigurationContainer, ValidationError


class ManageTargetResource(BaseResource):
    @require_admin
    def get(self, manage_target_id):
        data_source = models.DataSource.get_by_id_and_org(manage_target_id, self.current_org)
        ds = data_source.to_dict(all=True)
        self.record_event({
            'action': 'view',
            'object_id': manage_target_id,
            'object_type': 'datasource',
        })
        return ds

    @require_admin
    def post(self, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        req = request.get_json(True)

        schema = get_configuration_schema_for_query_runner_type(req['type'])
        if schema is None:
            abort(400)
        try:
            data_source.options.set_schema(schema)
            data_source.options.update(filter_none(req['options']))
        except ValidationError:
            abort(400)

        data_source.type = req['type']
        data_source.name = req['name']
        models.db.session.add(data_source)

        try:
            models.db.session.commit()
        except IntegrityError as e:
            if req['name'] in e.message:
                abort(400, message="Data source with the name {} already exists.".format(req['name']))

            abort(400)

        self.record_event({
            'action': 'edit',
            'object_id': data_source.id,
            'object_type': 'datasource',
        })

        return data_source.to_dict(all=True)

    @require_admin
    def delete(self, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        data_source.delete()

        self.record_event({
            'action': 'delete',
            'object_id': data_source_id,
            'object_type': 'datasource',
        })

        return make_response('', 204)


class ManageTargetListResource(BaseResource):
    @require_permission('list_data_sources')
    def get(self):
        if self.current_user.has_permission('admin'):
            manage_targets = models.Query.all(self.current_org)
        else:
            manage_targets = models.Query.all(self.current_org, group_ids=self.current_user.group_ids)

        response = {}
        for ds in manage_targets:
            if ds.id in response:
                continue

            try:
                d = ds.to_dict()
                d['view_only'] = all(project(ds.groups, self.current_user.group_ids).values())
                response[ds.id] = d
            except AttributeError:
                logging.exception("Error with ManageTargets#to_dict (manage target id: %d)", ds.id)

        self.record_event({
            'action': 'list',
            'object_id': 'admin/manage_targets',
            'object_type': 'managetarget',
        })

        return sorted(response.values(), key=lambda d: d['name'].lower())

    @require_admin
    def post(self):
        req = request.get_json(True)
        require_fields(req, ('options', 'name', 'type'))

        schema = get_configuration_schema_for_query_runner_type(req['type'])
        if schema is None:
            abort(400)

        config = ConfigurationContainer(filter_none(req['options']), schema)
        # from IPython import embed
        # embed()
        if not config.is_valid():
            abort(400)

        try:
            managetarget = models.Query.create_with_group(org=self.current_org,
                                                             name=req['name'],
                                                             type=req['type'],
                                                             options=config)

            models.db.session.commit()
        except IntegrityError as e:
            if req['name'] in e.message:
                abort(400, message="Manage target with the name {} already exists.".format(req['name']))

            abort(400)

        self.record_event({
            'action': 'create',
            'object_id': managetarget.id,
            'object_type': 'managetarget'
        })

        return managetarget.to_dict(all=True)


class ManageTargetSchemaResource(BaseResource):
    def get(self, manage_target_id):
        manage_target = get_object_or_404(models.Query.get_by_id_and_org, manage_target_id, self.current_org)
        require_access(manage_target, self.current_user, view_only)
        refresh = request.args.get('refresh') is not None

        response = {}

        try:
            response['schema'] = manage_target.get_schema(refresh)
        except NotSupported:
            response['error'] = {
                'code': 1,
                'message': 'Manage Target type does not support retrieving schema'
            }
        except Exception:
            response['error'] = {
                'code': 2,
                'message': 'Error retrieving schema.'
            }

        return response


class ManageTargetPauseResource(BaseResource):
    @require_admin
    def post(self, data_source_id):
        data_source = get_object_or_404(models.ManageTarget.get_by_id_and_org, data_source_id, self.current_org)
        data = request.get_json(force=True, silent=True)
        if data:
            reason = data.get('reason')
        else:
            reason = request.args.get('reason')

        data_source.pause(reason)

        self.record_event({
            'action': 'pause',
            'object_id': data_source.id,
            'object_type': 'datasource'
        })
        return data_source.to_dict()

    @require_admin
    def delete(self, data_source_id):
        data_source = get_object_or_404(models.DataSource.get_by_id_and_org, data_source_id, self.current_org)
        data_source.resume()

        self.record_event({
            'action': 'resume',
            'object_id': data_source.id,
            'object_type': 'datasource'
        })
        return data_source.to_dict()

