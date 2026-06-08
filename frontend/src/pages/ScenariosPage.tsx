/**
 * Scenario Engine Page — Phase 3D
 *
 * Three-column layout:
 *   Left  (320px) — Scenario history list
 *   Mid   (360px) — Scenario builder panel (sliders + run)
 *   Right (flex)  — Result panel (charts + KPIs + recommendations)
 */

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Lightbulb, RefreshCw } from 'lucide-react';
import { ScenarioBuilder } from '@/components/scenarios/ScenarioBuilder';
import { ScenarioResultPanel } from '@/components/scenarios/ScenarioResultPanel';
import { ScenarioHistory } from '@/components/scenarios/ScenarioHistory';
import { ScenarioExplainPanel } from '@/components/scenarios/ScenarioExplainPanel';
import scenarioApi from '@/services/scenarioApi';
import { toast } from '@/hooks/useToast';
import type { Scenario, ScenarioResultDetail, ScenarioParameters, ScenarioType } from '@/types/scenario';

export default function ScenariosPage() {
  const [scenarios, setScenarios]               = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario]     = useState<Scenario | null>(null);
  const [activeResult, setActiveResult]         = useState<ScenarioResultDetail | null>(null);
  const [isLoadingList, setIsLoadingList]       = useState(true);
  const [isRunning, setIsRunning]               = useState(false);
  const [lastRunName, setLastRunName]           = useState<string>('');
  // Track the completed scenario whose explain panel should be shown
  const [completedScenarioId, setCompletedScenarioId] = useState<number | null>(null);
  const [explainHorizonWeeks, setExplainHorizonWeeks] = useState<number>(12);

  // ── Load list ────────────────────────────────────────────────────────
  const loadScenarios = useCallback(async () => {
    try {
      const { data } = await scenarioApi.list({ per_page: 50 });
      setScenarios(data.scenarios);
    } catch (err) {
      toast.error('Load failed', 'Could not fetch scenarios');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  // ── Select a scenario from history ────────────────────────────────────
  const handleSelect = useCallback(async (s: Scenario) => {
    setActiveScenario(s);
    setActiveResult(null);
    setCompletedScenarioId(null);
    if (s.status === 'completed' && s.latest_result) {
      try {
        const { data } = await scenarioApi.getResultByVersion(s.id, s.latest_result.version);
        setActiveResult(data);
        setLastRunName(s.name);
        setCompletedScenarioId(s.id);
        setExplainHorizonWeeks(s.horizon_weeks ?? 12);
      } catch {
        // Result details unavailable — show summary only
      }
    }
  }, []);

  // ── Create + run from builder ─────────────────────────────────────────
  const handleRun = useCallback(async (
    name: string,
    type: ScenarioType,
    params: ScenarioParameters,
    horizonWeeks: number,
  ) => {
    setIsRunning(true);
    setActiveResult(null);
    setCompletedScenarioId(null);
    setLastRunName(name);
    try {
      // 1. Create scenario
      const { data: created } = await scenarioApi.create({
        name,
        scenario_type: type,
        horizon_weeks: horizonWeeks,
        parameters: params,
      });

      // 2. Run simulation
      const { data: result } = await scenarioApi.run(created.id);
      setActiveResult(result);
      setCompletedScenarioId(created.id);
      setExplainHorizonWeeks(horizonWeeks);

      // 3. Refresh history
      await loadScenarios();

      toast.success('Simulation complete', `${name} finished in ${result.computation_seconds?.toFixed(2)}s`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Simulation failed';
      toast.error('Simulation error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsRunning(false);
    }
  }, [loadScenarios]);

  // ── Quick-run an existing scenario ───────────────────────────────────
  const handleQuickRun = useCallback(async (id: number) => {
    const s = scenarios.find((x) => x.id === id);
    if (!s) return;
    setIsRunning(true);
    setActiveResult(null);
    setCompletedScenarioId(null);
    setLastRunName(s.name);
    setActiveScenario(s);
    try {
      const { data: result } = await scenarioApi.run(id);
      setActiveResult(result);
      setCompletedScenarioId(id);
      setExplainHorizonWeeks(s.horizon_weeks ?? 12);
      await loadScenarios();
      toast.success('Simulation complete', `${s.name} finished`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Simulation failed';
      toast.error('Simulation error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsRunning(false);
    }
  }, [scenarios, loadScenarios]);

  // ── Archive (delete) ─────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: number) => {
    try {
      await scenarioApi.delete(id);
      await loadScenarios();
      if (activeScenario?.id === id) {
        setActiveScenario(null);
        setActiveResult(null);
      }
      toast.success('Archived', 'Scenario archived successfully');
    } catch {
      toast.error('Archive failed', 'Could not archive scenario');
    }
  }, [activeScenario, loadScenarios]);

  return (
    <div className="flex flex-col gap-0 h-full min-h-0">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-4 border-b border-surface-800/50 flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/20">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-surface-50">Scenario Engine</h1>
            <p className="text-xs text-surface-500 mt-0.5">
              What-If simulations powered by the active ML model
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Info badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-900/60 border border-surface-800/50">
            <Lightbulb className="w-3.5 h-3.5 text-warning-400" />
            <span className="text-xs text-surface-400">
              Changes are non-destructive — model is never retrained
            </span>
          </div>

          <button
            id="refresh-scenarios"
            onClick={loadScenarios}
            disabled={isLoadingList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                       border border-surface-700/60 text-surface-400
                       hover:bg-surface-800/50 hover:text-surface-200 transition-all duration-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Three-column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left: History ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="w-72 xl:w-80 flex-shrink-0 flex flex-col gap-3 p-4 border-r border-surface-800/50 overflow-y-auto"
        >
          <ScenarioHistory
            scenarios={scenarios}
            activeId={activeScenario?.id ?? null}
            isLoading={isLoadingList}
            onSelect={handleSelect}
            onRun={handleQuickRun}
            onDelete={handleDelete}
          />
        </motion.div>

        {/* ── Mid: Builder ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-80 xl:w-96 flex-shrink-0 flex flex-col p-4 border-r border-surface-800/50 overflow-y-auto"
        >
          <ScenarioBuilder
            onRun={handleRun}
            isRunning={isRunning}
          />
        </motion.div>

        {/* ── Right: Results ── */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex-1 min-w-0 flex flex-col gap-4 p-4 overflow-y-auto"
        >
          <ScenarioResultPanel
            result={activeResult}
            isRunning={isRunning}
            scenarioName={lastRunName || activeScenario?.name}
          />

          {/* SHAP Explain Panel — lazy, only when scenario is completed */}
          {completedScenarioId !== null && activeResult && !isRunning && (
            <ScenarioExplainPanel
              scenarioId={completedScenarioId}
              horizonWeeks={explainHorizonWeeks}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
