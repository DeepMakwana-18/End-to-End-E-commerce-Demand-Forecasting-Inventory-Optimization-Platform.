import pickle, pandas as pd
import shap as shap_lib
from datetime import datetime

state = pickle.load(open('./ml/models/model_org_1_v2.0.pkl','rb'))
model = state['model']

# Simulate anomaly date 2023-12-24
X = pd.DataFrame({'week':[51],'month':[12],'year':[2023],'lag_1':[33322.0],'lag_4':[31867.0]})
raw_pred = model.predict(X)[0]
print(f'raw model prediction: {raw_pred:.4f}')
print(f'anomaly actual_value: 34183.0  (actual observed)')
print(f'anomaly expected_value: 31866.0  (rolling mean)')

# Build background
demands = [float(r['demand']) for r in state['historical_data']]
rows = []
for i, r in enumerate(state['historical_data']):
    dt = datetime.fromisoformat(r['date'])
    rows.append({
        'week': dt.isocalendar()[1], 'month': dt.month, 'year': dt.year,
        'lag_1': demands[i-1] if i >= 1 else demands[0],
        'lag_4': demands[i-4] if i >= 4 else demands[0],
    })
bg = pd.DataFrame(rows)[['week','month','year','lag_1','lag_4']]
explainer = shap_lib.TreeExplainer(model, bg)

sv = explainer.shap_values(X)
base_val = float(explainer.expected_value[0] if hasattr(explainer.expected_value, '__len__') else explainer.expected_value)
shap_sum = float(sum(sv[0]))

print(f'\nSHAP Math:')
print(f'  base_value:  {base_val:.4f}')
print(f'  shap_sum:    {shap_sum:.4f}')
print(f'  base+shap:   {base_val + shap_sum:.4f}  <-- should equal raw_pred')
print(f'  raw_pred:    {raw_pred:.4f}')
print(f'  diff:        {abs(base_val + shap_sum - raw_pred):.6f}')
print(f'  SHAP math:   {"PASS (diff < 1.0)" if abs(base_val + shap_sum - raw_pred) < 1.0 else "FAIL"}')
print(f'\n  Note: predicted_at_anomaly in API = actual_value (34183), not raw_pred ({raw_pred:.0f})')
print(f'  SHAP explains model raw output, not the anomaly actual_value.')
