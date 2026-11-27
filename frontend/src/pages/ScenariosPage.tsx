/**
 * Scenario Engine Page — Titan AI What-If Simulation Workspace
 */

import { useState, useCallback, useEffect } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { ScenarioBuilder, type BuilderSnapshot } from '@/components/scenarios/ScenarioBuilder';
import { ScenarioResultPanel } from '@/components/scenarios/ScenarioResultPanel';
import { ScenarioHistory } from '@/components/scenarios/ScenarioHistory';
import { ScenarioExplainPanel } from '@/components/scenarios/ScenarioExplainPanel';
import scenarioApi from '@/services/scenarioApi';
import { toast } from '@/hooks/useToast';
import type { Scenario, ScenarioResultDetail, ScenarioParameters, ScenarioType } from '@/types/scenario';
import '@/styles/titan-dashboard.css';

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [activeResult, setActiveResult] = useState<ScenarioResultDetail | null>(null);
  const [failedError, setFailedError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunName, setLastRunName] = useState<string>('');
  const [completedScenarioId, setCompletedScenarioId] = useState<number | null>(null);
  const [explainHorizonWeeks, setExplainHorizonWeeks] = useState<number>(12);
  const [lastSimulatedSnapshot, setLastSimulatedSnapshot] = useState<BuilderSnapshot | null>(null);
  const [hasUnsimulatedChanges, setHasUnsimulatedChanges] = useState(false);

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
    setFailedError(null);
    setCompletedScenarioId(null);
    setLastRunName(s.name);

    if (s.status === 'failed') {
      setFailedError('This scenario run failed during execution. Click Retry in Scenario History to run it again.');
      return;
    }

    if (s.status === 'completed' && s.latest_result) {
      try {
        const { data } = await scenarioApi.getResultByVersion(s.id, s.latest_result.version);
        setActiveResult(data);
        setCompletedScenarioId(s.id);
        setExplainHorizonWeeks(s.horizon_weeks ?? 12);
        const applied = data.detail?.params_applied;
        setLastSimulatedSnapshot({
          params: {
            marketing_spend_pct: applied?.marketing_spend_pct ?? s.parameters?.marketing_spend_pct ?? 0,
            price_change_pct: applied?.price_change_pct ?? s.parameters?.price_change_pct ?? 0,
            lead_time_days: applied?.lead_time_days ?? s.parameters?.lead_time_days ?? 14,
            safety_stock_multiplier: applied?.safety_stock_multiplier ?? s.parameters?.safety_stock_multiplier ?? 1.0,
            avg_unit_value: applied?.avg_unit_value ?? s.parameters?.avg_unit_value ?? 50,
          },
          horizonWeeks: s.horizon_weeks ?? 12,
        });
      } catch {
        setFailedError('Result details could not be loaded for this scenario.');
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
    if (isRunning) return;
    setIsRunning(true);
    setActiveResult(null);
    setFailedError(null);
    setCompletedScenarioId(null);
    setLastRunName(name);
    try {
      const { data: created } = await scenarioApi.create({
        name,
        scenario_type: type,
        horizon_weeks: horizonWeeks,
        parameters: params,
      });

      const { data: result } = await scenarioApi.run(created.id);
      setActiveScenario(created);
      setActiveResult(result);
      setCompletedScenarioId(created.id);
      setExplainHorizonWeeks(horizonWeeks);
      setLastSimulatedSnapshot({ params: { ...params }, horizonWeeks });

      await loadScenarios();
      toast.success('Simulation complete', `${name} finished in ${result.computation_seconds?.toFixed(2)}s`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Simulation failed';
      const errText = typeof msg === 'string' ? msg : JSON.stringify(msg);
      setFailedError(errText);
      toast.error('Simulation error', errText);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, loadScenarios]);

  // ── Quick-run an existing scenario ───────────────────────────────────
  const handleQuickRun = useCallback(async (id: number) => {
    if (isRunning) return;
    const s = scenarios.find((x) => x.id === id);
    if (!s) return;
    setIsRunning(true);
    setActiveResult(null);
    setFailedError(null);
    setCompletedScenarioId(null);
    setLastRunName(s.name);
    setActiveScenario(s);
    try {
      const { data: result } = await scenarioApi.run(id);
      setActiveResult(result);
      setCompletedScenarioId(id);
      setExplainHorizonWeeks(s.horizon_weeks ?? 12);
      const applied = result.detail?.params_applied;
      setLastSimulatedSnapshot({
        params: {
          marketing_spend_pct: applied?.marketing_spend_pct ?? s.parameters?.marketing_spend_pct ?? 0,
          price_change_pct: applied?.price_change_pct ?? s.parameters?.price_change_pct ?? 0,
          lead_time_days: applied?.lead_time_days ?? s.parameters?.lead_time_days ?? 14,
          safety_stock_multiplier: applied?.safety_stock_multiplier ?? s.parameters?.safety_stock_multiplier ?? 1.0,
          avg_unit_value: applied?.avg_unit_value ?? s.parameters?.avg_unit_value ?? 50,
        },
        horizonWeeks: s.horizon_weeks ?? 12,
      });
      await loadScenarios();
      toast.success('Simulation complete', `${s.name} finished`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Simulation failed';
      const errText = typeof msg === 'string' ? msg : JSON.stringify(msg);
      setFailedError(errText);
      toast.error('Simulation error', errText);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, scenarios, loadScenarios]);

  // ── Archive (delete) ─────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: number) => {
    try {
      await scenarioApi.delete(id);
      await loadScenarios();
      if (activeScenario?.id === id) {
        setActiveScenario(null);
        setActiveResult(null);
        setFailedError(null);
        setCompletedScenarioId(null);
        setLastSimulatedSnapshot(null);
      }
      toast.success('Archived', 'Scenario archived successfully');
    } catch {
      toast.error('Archive failed', 'Could not archive scenario');
    }
  }, [activeScenario, loadScenarios]);

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      {/* 1. Compact Titan Editorial Page Header */}
      <header
        style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
        className="titan-dash-reveal pb-6 border-b border-[#e4e4e7] dark:border-[#27272a] flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.13em] text-[#52525b] dark:text-[#a1a1aa]">
            <span className="inline-block w-6 h-[1.5px] bg-[#f59e0b]" aria-hidden="true" />
            <span>WHAT-IF SIMULATION</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-[32px] font-extrabold text-[#0a0a0a] dark:text-[#fafaf9] tracking-[-0.02em] leading-[1.15]">
            Scenario Engine
          </h1>
          <p className="text-sm text-[#52525b] dark:text-[#a1a1aa] mt-1.5 font-medium">
            Non-destructive demand, inventory &amp; risk simulations powered by the active ML model
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-end flex-shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eff6ff] text-[#1e3fc8] border border-[#bfdbfe] dark:bg-[#1e3fc8]/20 dark:text-[#93c5fd] dark:border-[#1e3fc8]/40 text-xs font-semibold">
            <Lightbulb className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>Non-destructive — model is never retrained</span>
          </div>

          <button
            id="refresh-scenarios"
            type="button"
            onClick={loadScenarios}
            disabled={isLoadingList}
            className="h-9 px-3.5 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 bg-white dark:bg-[#111113] text-[#0a0a0a] dark:text-[#fafaf9] border border-[#e4e4e7] dark:border-[#27272a] hover:bg-[#fafaf9] dark:hover:bg-[#18181b] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3fc8]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin text-[#1e3fc8]' : ''}`} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace: Two Columns (Builder first on mobile, side-by-side on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Builder */}
        <div className="lg:col-span-5 flex flex-col">
          <ScenarioBuilder
            onRun={handleRun}
            isRunning={isRunning}
            lastSimulatedSnapshot={lastSimulatedSnapshot}
            onUnsimulatedChange={setHasUnsimulatedChanges}
          />
        </div>

        {/* Right Column: Results & Explainability */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <ScenarioResultPanel
            result={activeResult}
            isRunning={isRunning}
            scenarioName={lastRunName || activeScenario?.name}
            hasUnsimulatedChanges={hasUnsimulatedChanges}
            failedError={failedError}
          />

          {completedScenarioId !== null && activeResult && !isRunning && (
            <ScenarioExplainPanel
              key={completedScenarioId}
              scenarioId={completedScenarioId}
              horizonWeeks={explainHorizonWeeks}
            />
          )}
        </div>
      </div>

      {/* 3. Full-Width Bottom Section: Scenario History */}
      <div className="w-full">
        <ScenarioHistory
          scenarios={scenarios}
          activeId={activeScenario?.id ?? null}
          isLoading={isLoadingList}
          onSelect={handleSelect}
          onRun={handleQuickRun}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
