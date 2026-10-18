"""HTTP checks against the isolated copy; no writes or external requests."""
import json
from urllib.parse import urlencode
from sandbox_backend.check_live import call

base = {'view': 'operations', 'start': '2026-09-19', 'end': '2026-10-18', 'page_size': 7}
all_rows = call('workspace-v2/finance/report?' + urlencode(base))['report']
rules = json.dumps({'operations': {'amount': {'max': '-1000'}}})
first = call('workspace-v2/finance/report?' + urlencode({**base, 'column_filters': rules}))['report']
second = call('workspace-v2/finance/report?' + urlencode({**base, 'column_filters': rules, 'page': 2}))['report']
assert 14 < first['total'] < all_rows['total']
assert len(first['items']) == len(second['items']) == 7
assert all(float(row['amount']) <= -1000 for row in first['items'] + second['items'])
assert not {row['id'] for row in first['items']} & {row['id'] for row in second['items']}
assert first['total'] == second['total'] and first['amount'] == second['amount']
assert len(first['_column_options']['amount']) > 7
call('workspace-v2/finance/report?' + urlencode({**base,
    'column_filters': '{"operations":{"secret":{"text":"x"}}}'}), expected=422)
print(json.dumps({'all_total': all_rows['total'], 'filtered_total': first['total'],
                  'page_size': 7, 'amount_choices': len(first['_column_options']['amount']),
                  'cross_page_filtering': True}))
