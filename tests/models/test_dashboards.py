#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tests import BaseTestCase
from redash.models import db, Dashboard


class DashboardTest(BaseTestCase):
    def create_tagged_dashboard(self, tags):
        dashboard = self.factory.create_dashboard(tags=tags)
        ds = self.factory.create_data_source(group=self.factory.default_group)
        query = self.factory.create_query(data_source=ds)
        # We need a bunch of visualizations and widgets configured
        # to trigger wrong counts via the left outer joins.
        vis1 = self.factory.create_visualization(query_rel=query)
        vis2 = self.factory.create_visualization(query_rel=query)
        vis3 = self.factory.create_visualization(query_rel=query)
        widget1 = self.factory.create_widget(visualization=vis1, dashboard=dashboard)
        widget2 = self.factory.create_widget(visualization=vis2, dashboard=dashboard)
        widget3 = self.factory.create_widget(visualization=vis3, dashboard=dashboard)
        dashboard.layout = '[[{}, {}, {}]]'.format(widget1.id, widget2.id, widget3.id)
        db.session.commit()
        return dashboard

    def test_all_tags(self):
        self.create_tagged_dashboard(tags=[u'tag1'])
        self.create_tagged_dashboard(tags=[u'tag1', u'tag2'])
        self.create_tagged_dashboard(tags=[u'tag1', u'tag2', u'tag3'])

        self.assertEqual(
            list(Dashboard.all_tags(self.factory.org, self.factory.user)),
            [(u'tag1', 3), (u'tag2', 2), (u'tag3', 1)]
        )
