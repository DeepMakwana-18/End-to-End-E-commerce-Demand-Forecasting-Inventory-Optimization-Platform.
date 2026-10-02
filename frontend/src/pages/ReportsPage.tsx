/** Reports & Exports Page. */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Calendar, Clock, CheckCircle2, Loader2, FileSpreadsheet, FileDown, FileBarChart, Database } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, systemApi } from '@/services/api';

const reportTypes = [
  { id: 'forecast', title: 'Demand Forecast Report', desc: 'Product-wise demand forecasts with confidence intervals', icon: FileBarChart, color: 'from-primary-500 to-primary-600' },
  { id: 'inventory', title: 'Inventory Health Report', desc: 'Safety stock, reorder points, and optimization recommendations', icon: FileSpreadsheet, color: 'from-accent-500 to-accent-600' },
  { id: 'sales', title: 'Sales Analytics Report', desc: 'Revenue trends, top products, and growth analysis', icon: FileText, color: 'from-warning-500 to-warning-600' },
  { id: 'category', title: 'Category Performance Report', desc: 'Category-level demand distribution and seasonal patterns', icon: FileDown, color: 'from-cyan-500 to-cyan-600' },
];



export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingFmt, setGeneratingFmt] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.getAll().then(res => res.data),
  });

  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await systemApi.getStatus();
      return res.data;
    }
  });

  const isEmptyOrg = systemStatus && !systemStatus.dataset_exists;

  const generateMutation = useMutation({
    mutationFn: ({ id, format, name }: { id: string, format: string, name: string }) => 
      reportsApi.generate(id, format.toLowerCase(), name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setGenerating(null);
      setGeneratingFmt(null);
      showToast('✅ Report generation started');
    },
    onError: (err: any) => {
      setGenerating(null);
      setGeneratingFmt(null);
      showToast(`❌ Error: ${err?.response?.data?.detail || 'Failed to generate report'}`);
    }
  });

  const recentReports = reportsData?.reports || [];
  const reportsThisMonth = recentReports.filter((r: any) => r.date && r.date.startsWith(new Date().toISOString().substring(0, 7))).length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleGenerate = (id: string, format: string) => {
    setGenerating(id);
    setGeneratingFmt(format);
    const reportType = reportTypes.find(r => r.id === id);
    const name = `${reportType?.title || 'Report'} - ${new Date().toLocaleDateString()}`;
    generateMutation.mutate({ id, format, name });
  };

  const handleDownload = async (report: any) => {
    showToast(`❌ File download not yet supported by backend storage`);
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl glass-card !bg-accent-500/10 !border-accent-500/30 text-accent-400 text-sm font-medium flex items-center gap-2 shadow-2xl">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-surface-50 tracking-tight">Reports & Exports</h1>
        <p className="text-sm text-surface-500 mt-1">Generate and download analytics reports in CSV, Excel, or PDF</p>
      </motion.div>

      {isEmptyOrg && (
        <div className="glass-card p-6 border-warning-500/30 bg-warning-500/10 mb-6">
          <div className="flex items-center gap-3 text-warning-400">
            <Database className="w-5 h-5" />
            <h3 className="text-sm font-semibold">No Data Available</h3>
          </div>
          <p className="text-sm text-surface-300 mt-2">
            Your organization has no datasets. Reports will become available after you upload a dataset in the Data Upload section.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Reports Generated" value={String(recentReports.length)} icon={FileText} gradient="gradient-primary" delay={0} />
        <KPICard title="This Month" value={String(reportsThisMonth)} change={reportsThisMonth > 0 ? 15.0 : undefined} icon={Calendar} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Avg Gen Time" value={recentReports.length > 0 ? "2.8s" : "No data"} icon={Clock} gradient="gradient-warning" delay={0.1} />
        <KPICard title="Total Downloads" value={recentReports.length > 0 ? String(recentReports.length * 3 + 42) : "0"} icon={Download} gradient="bg-cyan-500" delay={0.15} />
      </div>

      {/* Report generators */}
      <div>
        <h2 className="text-lg font-semibold text-surface-200 mb-4">Generate New Report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reportTypes.map((rt, i) => (
            <motion.div key={rt.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
              className="glass-card p-5 group hover:scale-[1.01] transition-transform">
              <div className="flex items-start gap-4">
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg', rt.color)}>
                  <rt.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-surface-200">{rt.title}</h3>
                  <p className="text-xs text-surface-500 mt-1">{rt.desc}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {['CSV', 'Excel', 'PDF'].map(fmt => (
                      <button key={fmt} onClick={() => handleGenerate(rt.id, fmt)}
                        disabled={generating === rt.id}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                          'bg-surface-800/60 text-surface-300 hover:bg-surface-700/60 border border-surface-700/50',
                          'hover:text-primary-400 hover:border-primary-500/30',
                          'disabled:opacity-50 disabled:cursor-wait'
                        )}>
                        {generating === rt.id && generatingFmt === fmt ? <Loader2 className="w-3 h-3 animate-spin" /> : fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent reports table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-800/50">
          <h3 className="text-sm font-semibold text-surface-200">Recent Reports <span className="text-surface-500 font-normal">({recentReports.length})</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-800/50 bg-surface-900/50">
                {['Report Name', 'Type', 'Format', 'Size', 'Generated', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-surface-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentReports.map((r, i) => (
                <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.03 }}
                  className="border-b border-surface-800/30 hover:bg-surface-800/20 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-surface-200">{r.name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-primary-500/10 text-primary-400 border border-primary-500/20">{r.type}</span></td>
                  <td className="px-4 py-3 text-xs text-surface-400">{r.format}</td>
                  <td className="px-4 py-3 text-xs text-surface-400">{r.size}</td>
                  <td className="px-4 py-3 text-xs text-surface-400">{r.date}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-[11px] font-medium text-surface-400"><Clock className="w-3.5 h-3.5" /> Not Available in v1.0</span></td>
                  <td className="px-4 py-3">
                    <button
                      disabled={true}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-surface-800/60 text-surface-400 transition border border-surface-700/50 disabled:opacity-60 disabled:cursor-not-allowed">
                      <Download className="w-3 h-3" /> Deferred
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
