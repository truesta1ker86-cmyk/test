"""Exercise only the isolated copy over HTTP; remove only this run's fixtures."""
import http.cookiejar
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from uuid import uuid4

BASE = 'http://127.0.0.1:55349/v2/api/'
ORIGIN = 'http://127.0.0.1:55349'
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
session = json.load(client.open(BASE + 'auth/session', timeout=30))
tenant = str(session['tenant_id'])


def call(path, body=None, expected=200, headers=None):
    request = urllib.request.Request(BASE + path,
        data=json.dumps(body, ensure_ascii=False).encode() if body is not None else None,
        headers={'Origin': ORIGIN, 'Content-Type': 'application/json', 'X-Expected-Tenant-Id': tenant, **(headers or {})})
    try:
        response = client.open(request, timeout=90)
    except urllib.error.HTTPError as error:
        response = error
    data = response.read()
    assert response.status == expected, (path, response.status, data[:500])
    return json.loads(data) if data else None


def main():
    started = time.monotonic()
    originals = call('pricing/views')['items']
    original_default = next((view for view in originals if view['default']), None)
    fixtures = []
    name = 'Проверка API ' + uuid4().hex[:10]
    try:
        query = {'article': '00-00046598', 'column_filters': '{"actual_cost":{"min":"0"}}',
                 'page_size': 25, 'sort_by': 'name', 'sort_direction': 'desc'}
        first = call('pricing/views/save', {'name': name, 'query': query, 'default': False})
        fixtures.append(first['id'])
        assert first['query']['column_filters'] == query['column_filters']
        first = call('pricing/views/save', {**first, 'name': name + ' исправлен', 'default': True})
        second = call('pricing/views/save', {'name': name + ' второй', 'query': {}, 'default': True})
        fixtures.append(second['id'])
        assert [v['id'] for v in call('pricing/views')['items'] if v['default']] == [second['id']]
        call('pricing/views/save', {'name': second['name'].upper(), 'query': {}, 'default': True}, expected=409)
        assert [v['id'] for v in call('pricing/views')['items'] if v['default']] == [second['id']]
        call('pricing/views/save', {'id': str(uuid4()), 'name': name, 'query': {}}, expected=404)
        call('pricing/views', expected=409, headers={'X-Expected-Tenant-Id': str(int(tenant) + 1)})
        call('pricing/column-values', {'field': 'calculated_price', 'filters': {}}, expected=428,
             headers={'X-Expected-Tenant-Id': ''})
        call('pricing/views/save', {'name': name, 'query': {}}, expected=403,
             headers={'Origin': 'http://untrusted.invalid'})
        call('pricing/push', {}, expected=423)
        print('views: create/update/default/duplicate/tenant/role-boundary/blocked-push OK', flush=True)

        sample = call('pricing/configs?page_size=1')
        row = sample['items'][0]
        choices = call('pricing/column-values', {'field': 'effective_cost', 'filters': {}})['values']
        value = next(value for value in choices if value != '__empty__')
        filters = {'column_filters': json.dumps({'effective_cost': {'values': [value]}})}
        filtered = call('pricing/configs?' + urllib.parse.urlencode({**filters, 'page_size': 25}))
        assert 0 < filtered['total'] < sample['total']
        assert all(abs(item['effective_cost'] - float(value)) < 1e-8 for item in filtered['items'])
        selection = call('pricing/editor/selection', {'filters': filters})
        assert selection['total'] == filtered['total']
        own_choices = call('pricing/column-values', {'field': 'effective_cost', 'filters': filters})['values']
        assert own_choices == choices
        exact = {'conditions': json.dumps([{'field': 'offer_id', 'operator': 'eq', 'value': row['offer_id']}])}
        scoped = call('pricing/column-values', {'field': 'ship_method', 'filters': exact})['values']
        assert scoped == [row['ship_method'] or '__empty__']
        exact_grid = call('pricing/configs?' + urllib.parse.urlencode(exact))
        assert exact_grid['total'] == 1
        assert all(exact_grid['items'][0].get(field) == row.get(field) for field in
                   ['plan_ship_method', 'ship_method', 'working_min_price', 'effective_margin', 'actual_buyer_margin'])
        print('columns: full-data choices/own-rule exclusion/applied grid/editor selection/calculation preservation OK', flush=True)
        print(json.dumps({'total': sample['total'], 'cost_choices': len(choices),
                          'filtered_total': filtered['total'], 'seconds': round(time.monotonic() - started, 2)}), flush=True)
    finally:
        for view_id in fixtures:
            call('pricing/views/delete', {'id': view_id})
        if original_default:
            call('pricing/views/save', original_default)
        assert {v['id'] for v in call('pricing/views')['items']} == {v['id'] for v in originals}


if __name__ == '__main__':
    main()
