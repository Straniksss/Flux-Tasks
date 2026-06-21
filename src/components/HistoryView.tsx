import React from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';

export const HistoryView: React.FC = () => {
  const { activityLogs, settings } = useStore();
  const lang = settings.language;

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return <Icons.Plus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'status_changed':
      case 'status':
        return <Icons.RefreshCw className="w-3.5 h-3.5 text-amber-400" />;
      case 'edited':
      case 'updated':
        return <Icons.FilePen className="w-3.5 h-3.5 text-indigo-400" />;
      case 'deleted':
        return <Icons.Trash2 className="w-3.5 h-3.5 text-rose-400" />;
      case 'project':
        return <Icons.FolderSync className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Icons.Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getActionBg = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'status_changed':
      case 'status': return 'bg-amber-500/10 border-amber-500/20';
      case 'edited':
      case 'updated': return 'bg-indigo-500/10 border-indigo-500/20';
      case 'deleted': return 'bg-rose-500/10 border-rose-500/20';
      case 'project': return 'bg-sky-500/10 border-sky-500/20';
      default: return 'bg-slate-500/10 border-slate-500/20';
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-display font-semibold text-white tracking-tight flex items-center gap-2">
          <Icons.History className="w-5 h-5 text-indigo-400" />
          <span>{lang === 'ru' ? 'История изменений' : lang === 'uk' ? 'Історія змін' : 'Activity History'}</span>
        </h2>
        <p className="text-xs text-slate-400">
          {lang === 'ru' ? 'Хронологический лог всех системных изменений и операций с задачами.' : 
           lang === 'uk' ? 'Хронологічний лог всіх системних змін та операцій із завданнями.' : 
           'Chronological history audit trail of all task operations and system modifications.'}
        </p>
      </div>

      {/* Timeline logs */}
      <div className="space-y-4 max-w-2xl relative pl-6">
        {/* Vertical line indicator */}
        <div className="absolute left-[11px] top-2 bottom-2 w-[1px] bg-white/5" />

        {activityLogs.map((log: any) => (
          <div key={log.id} className="relative flex items-start gap-4 group">
            
            {/* Timeline dot/icon */}
            <div className={`absolute left-[-23px] top-0.5 w-[22px] h-[22px] rounded-full border flex items-center justify-center bg-slate-950/80 z-10 ${getActionBg(log.action)}`}>
              {getActionIcon(log.action)}
            </div>

            {/* Content card */}
            <div className="flex-1 p-3.5 rounded-xl border border-white/5 bg-slate-950/20 backdrop-blur-md space-y-1.5 transition-all hover:bg-slate-950/30 hover:border-white/10">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-mono text-slate-500">{formatTimestamp(log.timestamp)}</span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{log.action}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">{log.details}</p>
              {log.taskId && (
                <div className="text-[9px] font-mono text-slate-500">
                  Task ID: <span className="text-slate-400">{log.taskId}</span>
                </div>
              )}
            </div>

          </div>
        ))}

        {activityLogs.length === 0 && (
          <div className="text-center py-10 border border-dashed border-white/5 rounded-xl text-slate-500 text-xs">
            {lang === 'ru' ? 'История изменений пуста.' : lang === 'uk' ? 'Історія змін порожня.' : 'No activity logs found.'}
          </div>
        )}
      </div>

    </div>
  );
};
