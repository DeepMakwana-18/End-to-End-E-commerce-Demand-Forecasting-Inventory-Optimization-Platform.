/** Reports & Exports Page. */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Calendar, Clock, CheckCircle2, Loader2, FileSpreadsheet, FileDown, FileBarChart } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useDataStore } from '@/stores/dataStore';

const reportTypes = [
  { id: 'forecast', title: 'Demand Forecast Report', desc: 'Product-wise demand forecasts with confidence intervals', icon: FileBarChart, color: 'from-primary-500 to-primary-600' },
  { id: 'inventory', title: 'Inventory Health Report', desc: 'Safety stock, reorder points, and optimization recommendations', icon: FileSpreadsheet, color: 'from-accent-500 to-accent-600' },
  { id: 'sales', title: 'Sales Analytics Report', desc: 'Revenue trends, top products, and growth analysis', icon: FileText, color: 'from-warning-500 to-warning-600' },
  { id: 'category', title: 'Category Performance Report', desc: 'Category-level demand distribution and seasonal patterns', icon: FileDown, color: 'from-cyan-500 to-cyan-600' },
];

const initialRecentReports = [
  { id: 1, name: 'Q4 Demand Forecast', type: 'forecast', format: 'CSV', size: '2.4 MB', date: '2026-05-12', status: 'completed' },
  { id: 2, name: 'Weekly Inventory Alert', type: 'inventory', format: 'Excel', size: '1.8 MB', date: '2026-05-11', status: 'completed' },
  { id: 3, name: 'Monthly Sales Summary', type: 'sales', format: 'PDF', size: '4.1 MB', date: '2026-05-10', status: 'completed' },
  { id: 4, name: 'Category Growth Analysis', type: 'category', format: 'CSV', size: '1.2 MB', date: '2026-05-09', status: 'completed' },
  { id: 5, name: 'Reorder Recommendations', type: 'inventory', format: 'Excel', size: '890 KB', date: '2026-05-08', status: 'completed' },
];

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingFmt, setGeneratingFmt] = useState<string | null>(null);
  
  const [recentReports, setRecentReports] = useState<typeof initialRecentReports>(() => {
    try {
      const saved = localStorage.getItem('titan_recent_reports');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse recent reports', e);
    }
    return initialRecentReports;
  });

  useEffect(() => {
    localStorage.setItem('titan_recent_reports', JSON.stringify(recentReports));
  }, [recentReports]);

  const [toast, setToast] = useState<string | null>(null);

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const reportsThisMonth = recentReports.filter(r => r.date.startsWith(currentMonthStr)).length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleGenerate = (id: string, format: string) => {
    setGenerating(id);
    setGeneratingFmt(format);
    setTimeout(() => {
      const reportType = reportTypes.find(r => r.id === id);
      const newReport = {
        id: Date.now(),
        name: `${reportType?.title || 'Report'} - ${new Date().toLocaleDateString()}`,
        type: id,
        format: format,
        size: `${((id.length * 0.3) % 4 + 0.5).toFixed(1)} MB`,
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
      };
      setRecentReports([newReport, ...recentReports]);
      setGenerating(null);
      setGeneratingFmt(null);
      showToast(`✅ ${reportType?.title} generated as ${format}`);
    }, 2000);
  };

  const handleDownload = async (report: typeof recentReports[0]) => {
    try {
      showToast(`⏳ Generating ${report.format} file...`);
      
      let rawData: any[] = [];
      let columns: string[] = [];

      const storeState = useDataStore.getState();

      if (report.type === 'forecast') {
        rawData = storeState.demandTrend;
        columns = ['Month', 'Actual Demand', 'Predicted Demand'];
        rawData = rawData.map((d: any) => [d.label, d.actual, d.predicted]);
      } else if (report.type === 'inventory') {
        rawData = storeState.inventoryItems;
        columns = ['SKU', 'Name', 'Category', 'Current Stock', 'Safety Stock', 'Reorder Point', 'Status'];
        rawData = rawData.map((d: any) => [d.sku, d.name, d.category, d.current_stock, d.safety_stock, d.reorder_point, d.status]);
      } else if (report.type === 'sales') {
        rawData = storeState.revenueTrend;
        columns = ['Month', 'Revenue'];
        rawData = rawData.map((d: any) => [d.label, d.value]);
      } else if (report.type === 'category') {
        rawData = storeState.categoryForecasts;
        columns = ['Category', 'Current Demand', 'Predicted Demand', 'Growth %'];
        rawData = rawData.map((d: any) => [d.category, d.current, d.predicted, d.change]);
      }

      if (report.format === 'PDF') {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text('Project Titan Analytics', 14, 20);
        
        doc.setFontSize(16);
        doc.text(report.name, 14, 30);
        
        doc.setFontSize(10);
        doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 38);
        
        autoTable(doc, {
          startY: 45,
          head: [columns],
          body: rawData,
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] }
        });
        
        doc.save(`${report.name.replace(/\s+/g, '_')}.pdf`);
        showToast(`✅ Downloaded: ${report.name}`);
        return;
      }

      const wsData = [columns, ...rawData];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
      
      if (report.format === 'Excel') {
        XLSX.writeFile(wb, `${report.name.replace(/\s+/g, '_')}.xlsx`);
      } else {
        XLSX.writeFile(wb, `${report.name.replace(/\s+/g, '_')}.csv`);
      }
      showToast(`✅ Downloaded: ${report.name}`);
    } catch (error: any) {
      console.error('Download error:', error);
      let errMsg = error?.message || 'Unknown error';
      if (error?.response?.data?.detail) {
        errMsg = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail);
      }
      showToast(`❌ Error: ${errMsg}`);
    }
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Reports Generated" value={String(recentReports.length)} icon={FileText} gradient="gradient-primary" delay={0} />
        <KPICard title="This Month" value={String(reportsThisMonth)} change={reportsThisMonth > 0 ? 15.0 : 0} icon={Calendar} gradient="gradient-accent" delay={0.05} />
        <KPICard title="Avg Gen Time" value="2.8s" icon={Clock} gradient="gradient-warning" delay={0.1} />
        <KPICard title="Total Downloads" value={String(recentReports.length * 3 + 42)} icon={Download} gradient="bg-cyan-500" delay={0.15} />
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
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-xs text-accent-400"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDownload(r)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-surface-800/60 text-surface-300 hover:bg-surface-700/60 hover:text-primary-400 transition border border-surface-700/50">
                      <Download className="w-3 h-3" /> Download
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
