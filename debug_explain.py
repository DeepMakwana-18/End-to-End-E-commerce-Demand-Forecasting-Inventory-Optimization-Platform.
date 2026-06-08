import sys
sys.path.insert(0, '/app')
import pickle
from app.ml.scenario_engine import _run_baseline, _run_modified, ScenarioEngine
from app.services.shap_service import ShapService

state = pickle.load(open('./ml/models/model_org_1_v1.0.pkl','rb'))
b_pts, b_feats = _run_baseline(state, 4, capture_features=True)
s_pts, s_feats = _run_modified(state, 4, demand_multiplier=1.1881, lead_time_adjustment=7.0, capture_features=True)

print("=== Baseline ===")
for p in b_pts:
    print(f"  W{p['week']} raw={p['_raw']:.2f} pred={p['predicted_demand']}")
print("=== Simulated ===")
for p in s_pts:
    print(f"  W{p['week']} raw={p['_raw']:.2f} pred={p['demand']}")

print("Baseline feats W1:", b_feats[0])
print("Simulated feats W1:", s_feats[0])

# Run SHAP explain
FEATURE_NAMES = ["week", "month", "year", "lag_1", "lag_4"]
b_preds = [p["_raw"] for p in b_pts]
s_preds = [p["_raw"] for p in s_pts]
result = ShapService.explain_scenario(
    model=state["model"],
    historical_data=state.get("historical_data", []),
    baseline_features=b_feats,
    simulated_features=s_feats,
    baseline_predictions=b_preds,
    simulated_predictions=s_preds,
    feature_names=FEATURE_NAMES,
)

print("explainer_ready:", result["explainer_ready"])
print("base_value_baseline:", result["base_value_baseline"])
print("driver_summary:", result["driver_summary"])
w1 = result["weeks"][0]
shap_sum = sum(w1["delta_shap"].values())
direct_delta = w1["simulated_prediction"] - w1["baseline_prediction"]
print(f"Week1: direct_delta={direct_delta:.4f} shap_delta_sum={shap_sum:.4f} diff={abs(shap_sum - direct_delta):.4f}")
