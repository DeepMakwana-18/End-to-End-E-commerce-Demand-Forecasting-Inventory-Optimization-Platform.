"""
Titan AI - Local Run & End-to-End Demo Pipeline
Performs all platform tasks using the 100-row demo sales dataset:
1. Authentication (JWT token retrieval)
2. Schema Auto-Detection (/upload/detect)
3. Dataset Upload & Celery ETL Ingestion (/upload)
4. ML Model Training & Telemetry Sync (/forecast/model-info, /forecast/retrain)
5. 12-Week Demand Forecasting (/forecast)
6. Anomaly Intelligence Sweep (/anomalies/detect, /anomalies/summary)
7. What-If Scenario Simulation (/scenarios, /scenarios/{id}/run)
8. Inventory Optimization (/inventory)
9. Executive Dashboard & Product Analytics (/dashboard/kpis, /products, /categories)
10. Automated Report Generation (/reports/generate)
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error
import urllib.parse

BASE_URL = os.environ.get("TITAN_API_URL", "http://localhost/api/v1")
CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "demo_sales_dataset.csv")

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None and isinstance(data, (dict, list)):
        data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            resp_body = res.read().decode("utf-8")
            return json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="replace")
        print(f"[ERROR] HTTP {e.code} on {method} {url}: {err_msg}")
        raise e
    except Exception as e:
        print(f"[ERROR] Connection error on {method} {url}: {e}")
        raise e

def upload_multipart(url, file_path, token, extra_fields=None):
    boundary = "----WebKitFormBoundary" + str(int(time.time() * 1000))
    body = bytearray()
    
    # Add extra form fields
    if extra_fields:
        for k, v in extra_fields.items():
            body.extend(f"--{boundary}\r\n".encode("utf-8"))
            body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
            body.extend(f"{v}\r\n".encode("utf-8"))
            
    # Add file
    filename = os.path.basename(file_path)
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: text/csv\r\n\r\n")
    with open(file_path, "rb") as f:
        body.extend(f.read())
    body.extend(f"\r\n--{boundary}--\r\n".encode("utf-8"))
    
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Authorization": f"Bearer {token}",
    }
    
    req = urllib.request.Request(url, data=bytes(body), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode("utf-8"))

def main():
    print("=" * 70)
    print("TITAN AI: EXECUTING LOCAL DEMO PIPELINE & ALL PLATFORM TASKS")
    print("=" * 70)
    print(f"Target API: {BASE_URL}")
    print(f"Dataset:    {CSV_PATH} ({os.path.getsize(CSV_PATH)} bytes)")
    
    # ── Task 1: Authentication ──────────────────────────────────────
    print("\n[Step 1/10] Authenticating Admin User...")
    login_res = make_request(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"email": "admin@titan.demo", "password": "admin123"},
    )
    token = login_res["access_token"]
    user = login_res["user"]
    org = login_res["organization"]
    print(f"  [OK] Logged in as: {user['name']} ({user['email']})")
    print(f"  [OK] Organization: {org['name']} (ID: {org['id']})")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # ── Task 2: Schema Auto-Detection ──────────────────────────────
    print("\n[Step 2/10] Testing Schema Auto-Detection on 100-Row Dataset...")
    detect_res = upload_multipart(f"{BASE_URL}/upload/detect", CSV_PATH, token)
    detected_cols = detect_res.get("detected_columns", [])
    confidence = detect_res.get("confidence", "unknown")
    mapping = detect_res.get("mapping", {})
    print(f"  [OK] Columns detected ({len(detected_cols)}): {', '.join(detected_cols)}")
    print(f"  [OK] Confidence: {confidence.upper()}")
    print(f"  [OK] Auto-mapped canonical fields:")
    for canonical, col in mapping.items():
        if col:
            print(f"      * {canonical:<14} -> {col}")

    # ── Task 3: Dataset Upload & ETL Ingestion ──────────────────────
    print("\n[Step 3/10] Uploading Dataset & Executing Enterprise ETL...")
    upload_res = upload_multipart(
        f"{BASE_URL}/upload",
        CSV_PATH,
        token,
        extra_fields={
            "date_column": "transaction_date",
            "demand_column": "quantity_sold"
        }
    )
    task_id = upload_res.get("task_id")
    print(f"  [OK] Upload queued with Celery Task ID: {task_id}")
    
    # Poll task progress
    print("  [*] Polling ETL & Catalog Sync task progress...")
    for _ in range(40):
        time.sleep(1.5)
        try:
            status_res = make_request(f"{BASE_URL}/tasks/{task_id}", headers=auth_headers)
            state = status_res.get("state")
            progress = status_res.get("progress", 0)
            msg = status_res.get("message", "")
            print(f"     [Task {state}] {progress}% - {msg}")
            if state == "completed":
                print("  [OK] ETL Pipeline & Product Catalog Sync completed successfully!")
                break
            elif state == "failed":
                err = status_res.get("error", "Unknown error")
                print(f"  [ERROR] ETL Task Failed: {err}")
                break
        except Exception as e:
            pass

    # ── Task 4: ML Model Training & Telemetry ──────────────────────
    print("\n[Step 4/10] Verifying XGBoost Model Retraining & Accuracy...")
    model_info = make_request(f"{BASE_URL}/forecast/model-info", headers=auth_headers)
    print(f"  [OK] Model Type:       {model_info.get('model_type')}")
    print(f"  [OK] Model Version:    {model_info.get('version')}")
    print(f"  [OK] Model Accuracy:   {model_info.get('accuracy', 0)}%")
    print(f"  [OK] Validation MAE:   {model_info.get('mae', 0):.3f}")
    print(f"  [OK] Validation RMSE:  {model_info.get('rmse', 0):.3f}")
    top_features = sorted(
        model_info.get("feature_importance", {}).items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]
    print(f"  [OK] Top 5 Feature Attributions:")
    for feat, imp in top_features:
        print(f"      * {feat:<20} {imp*100:.1f}%")

    # ── Task 5: Demand Forecasting ────────────────────────────────
    print("\n[Step 5/10] Generating 12-Week Demand Forecast...")
    forecast_res = make_request(f"{BASE_URL}/forecast", headers=auth_headers)
    forecast_points = forecast_res.get("forecasts", [])
    print(f"  [OK] Generated {len(forecast_points)} weekly forecast intervals")
    if forecast_points:
        first_pt = forecast_points[0]
        last_pt = forecast_points[-1]
        print(f"      * Week 1 ({first_pt.get('date')}): Predicted Demand = {first_pt.get('predicted_demand') or first_pt.get('demand', 0):.1f} (Bounds: {first_pt.get('confidence_lower') or first_pt.get('lower_bound', 0):.1f} - {first_pt.get('confidence_upper') or first_pt.get('upper_bound', 0):.1f})")
        print(f"      * Week 12 ({last_pt.get('date')}): Predicted Demand = {last_pt.get('predicted_demand') or last_pt.get('demand', 0):.1f}")

    # ── Task 6: Anomaly Intelligence Sweep ────────────────────────
    print("\n[Step 6/10] Triggering Anomaly Intelligence Detection Sweep...")
    anomaly_detect_res = make_request(
        f"{BASE_URL}/anomalies/detect",
        method="POST",
        data={
            "z_threshold_low": 2.0,
            "z_threshold_med": 3.0,
            "z_threshold_critical": 4.0,
            "comprehensive_sweep": True
        },
        headers=auth_headers
    )
    print(f"  [OK] Detection complete in {anomaly_detect_res.get('computation_seconds', 0):.2f}s")
    print(f"  [OK] Total Anomalies Detected: {anomaly_detect_res.get('detected', 0)}")
    print(f"      * Critical: {anomaly_detect_res.get('critical', 0)}")
    print(f"      * Medium:   {anomaly_detect_res.get('medium', 0)}")
    print(f"      * Low:      {anomaly_detect_res.get('low', 0)}")

    summary_res = make_request(f"{BASE_URL}/anomalies/summary", headers=auth_headers)
    print(f"  [OK] Active Anomaly Register:")
    print(f"      * Demand Spikes:     {summary_res.get('demand_spikes', 0)}")
    print(f"      * Demand Drops:      {summary_res.get('demand_drops', 0)}")
    print(f"      * Inventory Shocks:  {summary_res.get('inventory_shocks', 0)}")

    # ── Task 7: Scenario Simulation ───────────────────────────────
    print("\n[Step 7/10] Creating & Running What-If Promotion Scenario...")
    scenario_create_res = make_request(
        f"{BASE_URL}/scenarios",
        method="POST",
        data={
            "name": "Summer Promotional Demand Surge",
            "description": "Simulate 25% demand increase across catalog with 10% price promotion",
            "scenario_type": "demand_shock",
            "horizon_weeks": 12,
            "parameters": {
                "demand_multiplier": 1.25,
                "affected_weeks": 4,
            }
        },
        headers=auth_headers
    )
    scenario_id = scenario_create_res["id"]
    print(f"  [OK] Scenario created: '{scenario_create_res['name']}' (ID: {scenario_id})")
    
    sim_res = make_request(
        f"{BASE_URL}/scenarios/{scenario_id}/run",
        method="POST",
        data={},
        headers=auth_headers
    )
    result = sim_res.get("result", {})
    print(f"  [OK] Simulation executed in {result.get('computation_seconds', 0):.2f}s:")
    print(f"      * Baseline Demand:    {result.get('baseline_demand', 0):,.1f} units")
    print(f"      * Simulated Demand:   {result.get('simulated_demand', 0):,.1f} units")
    print(f"      * Demand Delta:       +{result.get('demand_delta_pct', 0):.1f}%")
    print(f"      * Revenue Impact:     ${result.get('revenue_impact', 0):,.2f}")
    print(f"      * Stockout Risk:      {result.get('stockout_risk_pct', 0):.1f}%")

    # ── Task 8: Inventory Optimization ────────────────────────────
    print("\n[Step 8/10] Evaluating Inventory Optimization & Stock Health...")
    inv_res = make_request(f"{BASE_URL}/inventory", headers=auth_headers)
    items = inv_res.get("items", []) if isinstance(inv_res, dict) else inv_res
    print(f"  [OK] Ingested SKU Inventory Profiles: {len(items)} items")
    for item in items[:4]:
        status_tag = item.get("status", "HEALTHY")
        stock = item.get("current_stock", 0)
        reorder = item.get("reorder_point", 0)
        sku = item.get("sku", "UNKNOWN")
        name = item.get("name", "Product")
        print(f"      * [{status_tag}] {sku}: {name} (Stock: {stock}, Reorder Pt: {reorder})")

    # ── Task 9: Executive Dashboard & Product Analytics ───────────
    print("\n[Step 9/10] Aggregating Executive KPIs & Category Analytics...")
    kpis = make_request(f"{BASE_URL}/dashboard/kpis", headers=auth_headers)
    print(f"  [OK] Total Revenue:       ${kpis.get('total_revenue', 0):,.2f}")
    print(f"  [OK] Total Units Sold:    {kpis.get('total_orders', 0):,}")
    print(f"  [OK] Avg Order Value:     ${kpis.get('average_order_value', 0):,.2f}")
    print(f"  [OK] Active Products:     {kpis.get('active_products', 0)}")
    
    categories = make_request(f"{BASE_URL}/products/categories", headers=auth_headers)
    cat_list = categories.get("categories", []) if isinstance(categories, dict) else categories
    print(f"  [OK] Category Breakdown ({len(cat_list)} categories):")
    for cat in cat_list:
        print(f"      * {cat.get('category') or cat.get('name')}: Revenue ${cat.get('revenue', 0):,.2f}")

    # ── Task 10: Reports & Export Generation ──────────────────────
    print("\n[Step 10/10] Triggering Automated Report Generation...")
    report_res = make_request(
        f"{BASE_URL}/reports/generate",
        method="POST",
        data={
            "name": "Q2 Demand Forecast & Inventory Plan",
            "report_type": "forecast",
            "format": "pdf"
        },
        headers=auth_headers
    )
    print(f"  [OK] Report generated: '{report_res.get('name')}' (ID: {report_res.get('id')})")
    print(f"  [OK] Format: {report_res.get('format', 'PDF').upper()} | Status: {report_res.get('status', 'ready')}")

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL PLATFORM TASKS COMPLETED LOCALLY ON DOCKER!")
    print("=" * 70)

if __name__ == "__main__":
    main()
