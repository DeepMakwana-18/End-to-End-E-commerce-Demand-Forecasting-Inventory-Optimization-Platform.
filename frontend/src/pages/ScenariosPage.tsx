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
    setIsLoadingList(true);
    try {
      const { data } = await scenarioApi.list({ per_page: 50 });
      setScenarios(data.scenarios);
    } catch {
      toast.error('Load failed', 'Could not fetch scenarios');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await scenarioApi.list({ per_page: 50 });
        if (isMounted) setScenarios(data.scenarios);
      } catch {
        if (isMounted) toast.error('Load failed', 'Could not fetch scenarios');
      } finally {
        if (isMounted) setIsLoadingList(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Simulation failed';
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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Simulation failed';
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
      {/* 1. Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200/90 dark:border-ds-border bg-white dark:bg-ds-surface shadow-2xs overflow-hidden mb-5"
      >
        {/* Subtle indigo-to-blue decorative glow */}
        <div className="absolute top-0 left-0 w-80 h-full bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-indigo-600 to-blue-600 inline-block" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-ds-text-heading tracking-tight">
                Scenario Engine
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-ds-text-secondary mt-0.5 ml-3.5 font-medium">
              What-If simulations powered by the active ML model
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 self-start sm:self-auto">
          {/* Informational non-destructive badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-ds-blue-surface dark:text-ds-blue-text dark:border-ds-blue/20 text-xs font-semibold shadow-2xs">
            <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-ds-blue flex-shrink-0" />
            <span>Non-destructive simulation — model is never retrained</span>
          </div>

          <button
            id="refresh-scenarios"
            onClick={loadScenarios}
            disabled={isLoadingList}
            className="btn-apple btn-apple-soft text-xs h-9 px-3.5 shadow-2xs border border-slate-200 dark:border-ds-border hover:bg-slate-50 dark:hover:bg-ds-surface-sunken"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* 2. Responsive Layout: 3 distinct cards with clean gap spacing */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-5 overflow-y-auto lg:overflow-hidden pb-4">
        {/* ── Left Column: History ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="w-full lg:w-72 xl:w-80 flex-shrink-0 flex flex-col p-4 rounded-2xl border border-slate-200/90 dark:border-ds-hairline bg-white dark:bg-ds-surface shadow-2xs overflow-y-auto"
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

        {/* ── Mid Column: Builder ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col p-4 rounded-2xl border border-slate-200/90 dark:border-ds-hairline bg-white dark:bg-ds-surface shadow-2xs overflow-y-auto"
        >
          <ScenarioBuilder
            onRun={handleRun}
            isRunning={isRunning}
          />
        </motion.div>

        {/* ── Right Column: Results ── */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex-1 min-w-0 flex flex-col gap-4 p-5 rounded-2xl border border-slate-200/90 dark:border-ds-hairline bg-white dark:bg-ds-surface shadow-2xs overflow-y-auto"
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
