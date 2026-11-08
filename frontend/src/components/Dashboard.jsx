import { useState, useEffect } from 'react';
import { BarChart, Clock, Award, FileText, RefreshCw, Download } from 'lucide-react';

export default function Dashboard({ user, updateTrigger }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total_translations: 0,
    most_used_language: 'None',
    recognition_accuracy: 100.0,
    recent_translations: [],
    activity_analytics: {},
    language_distribution: {}
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analytics', {
        headers: {
          'x-user-id': user?.user_id || ''
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        throw new Error('Failed to retrieve dashboard analytics');
      }
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user, updateTrigger]);

  // Generate and export translation log report as a print/PDF printable table
  const handleExportPDF = () => {
    if (metrics.recent_translations.length === 0) return;

    // Create a new window containing a clean printable table layout
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableRows = metrics.recent_translations.map((t, idx) => `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; font-size: 12px;">${idx + 1}</td>
        <td style="padding: 10px; border: 1px solid #ddd; font-size: 12px;">${new Date(t.timestamp).toLocaleString()}</td>
        <td style="padding: 10px; border: 1px solid #ddd; font-size: 12px; font-weight: bold; color: #4f46e5;">${t.detected_text}</td>
        <td style="padding: 10px; border: 1px solid #ddd; font-size: 12px; font-weight: bold;">${t.translated_text}</td>
        <td style="padding: 10px; border: 1px solid #ddd; font-size: 12px; color: #555;">${t.language}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>SignConnect AI - Translation History Report</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #333; margin: 40px; }
            header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 30px; }
            h1 { font-size: 24px; margin: 0; color: #4f46e5; }
            .meta { font-size: 12px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f3f4f6; padding: 12px 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <header>
            <div>
              <h1>SignConnect AI Translation Log</h1>
              <div class="meta">Generated for: ${user.name} (${user.email}) | Date: ${new Date().toLocaleString()}</div>
            </div>
            <div style="font-size: 12px; text-align: right; color: #666;">
              Total Translations: ${metrics.total_translations}<br/>
              Average Accuracy: ${metrics.recognition_accuracy}%
            </div>
          </header>
          <h3>Recent History Logs</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">S.No</th>
                <th style="width: 150px;">Timestamp</th>
                <th>Original Gesture (English)</th>
                <th>Translated Output</th>
                <th style="width: 120px;">Language</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Render Skeleton HUD loader
  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-48 rounded-xl skeleton-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-[350px] rounded-2xl skeleton-shimmer" />
          <div className="lg:col-span-4 h-[350px] rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  // Activity chart calculations (custom SVG)
  const activityDates = Object.keys(metrics.activity_analytics).sort();
  const activityValues = activityDates.map(d => metrics.activity_analytics[d]);
  const maxVal = activityValues.length > 0 ? Math.max(...activityValues, 5) : 5;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Activity Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track translation counts, model accuracy logs, and language distribution metrics.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/40 shadow-sm cursor-pointer active:scale-95 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Stats
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Translations */}
        <div className="glass-panel bg-white/70 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <BarChart className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Translations</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5 block">{metrics.total_translations}</span>
          </div>
        </div>

        {/* Most Used Language */}
        <div className="glass-panel bg-white/70 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Favorite Language</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5 block truncate max-w-[150px]">
              {metrics.most_used_language}
            </span>
          </div>
        </div>

        {/* Recognition Accuracy */}
        <div className="glass-panel bg-white/70 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Inference Accuracy</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5 block">
              {metrics.recognition_accuracy.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Active Days */}
        <div className="glass-panel bg-white/70 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usage Days Log</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5 block">
              {Object.keys(metrics.activity_analytics).length}
            </span>
          </div>
        </div>

      </div>

      {/* Analytics Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Custom SVG Line Chart for Activity logs */}
        <div className="lg:col-span-8 glass-panel bg-white/70 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-md flex flex-col min-h-[350px]">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">
            Translation Volume Over Time
          </h3>
          <div className="flex-1 flex items-end w-full relative pt-4 pb-2 pr-2">
            {activityDates.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic">
                No activity data logged yet. Save translations to generate metrics.
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-between">
                <svg className="w-full h-[200px]" viewBox="0 0 600 200">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => (
                    <line
                      key={idx}
                      x1="0"
                      y1={200 - p * 180}
                      x2="600"
                      y2={200 - p * 180}
                      stroke="rgba(156, 163, 175, 0.15)"
                      strokeWidth="1"
                    />
                  ))}
                  
                  {/* Drawing the SVG line path connecting dates */}
                  {activityDates.length > 1 && (
                    <path
                      d={activityDates.map((d, i) => {
                        const x = (i / (activityDates.length - 1)) * 580 + 10;
                        const y = 190 - (metrics.activity_analytics[d] / maxVal) * 170;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="url(#indigo-grad)"
                      strokeWidth="3.5"
                    />
                  )}
                  
                  {/* Small Dots on peaks */}
                  {activityDates.map((d, i) => {
                    const x = activityDates.length > 1 ? (i / (activityDates.length - 1)) * 580 + 10 : 300;
                    const y = 190 - (metrics.activity_analytics[d] / maxVal) * 170;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="5"
                        className="fill-indigo-500 stroke-white dark:stroke-slate-900 stroke-2"
                      />
                    );
                  })}

                  <defs>
                    <linearGradient id="indigo-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* X Axis Labels */}
                <div className="flex justify-between text-[10px] text-slate-400 mt-2.5 font-bold uppercase tracking-wider px-2">
                  {activityDates.map((d, i) => (
                    <span key={i}>{d.substring(5)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Favorite Languages Progress bars panel */}
        <div className="lg:col-span-4 glass-panel bg-white/70 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-md flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">
            Language Share
          </h3>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[260px] pr-1.5">
            {Object.keys(metrics.language_distribution).length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No languages recorded yet.
              </div>
            ) : (
              Object.keys(metrics.language_distribution).map((lang, idx) => {
                const count = metrics.language_distribution[lang];
                const pct = ((count / metrics.total_translations) * 100).toFixed(0);
                
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">{lang}</span>
                      <span className="text-slate-500">{pct}% ({count})</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Translations Logs History Table */}
      <div className="glass-panel bg-white/70 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-md">
        
        {/* Table header with report button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-3.5 border-b border-slate-200/60 dark:border-slate-800/60">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Recent Translations Log
          </h3>
          {metrics.recent_translations.length > 0 && (
            <button
              id="export-pdf-btn"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 rounded-xl text-xs font-extrabold hover:bg-indigo-100 dark:hover:bg-indigo-950/75 cursor-pointer active:scale-95 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT REPORT (PRINT)
            </button>
          )}
        </div>

        {/* Scrollable table container */}
        <div className="overflow-x-auto">
          {metrics.recent_translations.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 italic">
              No translation records found. Translate gestures in the Studio and save them.
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-900 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">Detected (English)</th>
                  <th className="pb-3 font-semibold">Translated Output</th>
                  <th className="pb-3 font-semibold">Target Language</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60">
                {metrics.recent_translations.map((t, idx) => (
                  <tr key={t.translation_id || idx} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="py-3.5 pr-4 whitespace-nowrap text-slate-400">
                      {new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 pr-4 font-bold text-indigo-600 dark:text-indigo-400">
                      {t.detected_text}
                    </td>
                    <td className="py-3.5 pr-4 font-extrabold text-slate-800 dark:text-white">
                      {t.translated_text}
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {t.language}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}
