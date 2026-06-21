import React from 'react';
import { useStore } from '../store';

export const TitleBar: React.FC = () => {
  const { settings, currentView } = useStore();
  const [isMaximized, setIsMaximized] = React.useState(false);
  const lang = settings.language;

  React.useEffect(() => {
    const checkState = async () => {
      if (window.api?.window) {
        const max = await window.api.window.isMaximized();
        setIsMaximized(max);
      }
    };
    checkState();
    window.addEventListener('resize', checkState);
    return () => window.removeEventListener('resize', checkState);
  }, []);

  if (!window.api) return null; // Render nothing if not in Electron context

  const getActiveViewTitle = () => {
    const dict: Record<string, Record<string, string>> = {
      ru: {
        dashboard: 'Панель управления',
        all_tasks: 'Все задачи',
        planned: 'Запланировано',
        pending: 'Ожидает',
        in_progress: 'В работе',
        testing: 'Тестирование',
        completed: 'Выполнено',
        cancelled: 'Отменено',
        notes: 'Заметки',
        roadmap: 'Карта развития',
        prompts: 'AI Промпты',
        settings: 'Настройки',
        history: 'История изменений',
        archive: 'Архив задач'
      },
      uk: {
        dashboard: 'Панель керування',
        all_tasks: 'Всі задачі',
        planned: 'Заплановано',
        pending: 'Очікує',
        in_progress: 'В роботі',
        testing: 'Тестування',
        completed: 'Виконано',
        cancelled: 'Скасовано',
        notes: 'Нотатки',
        roadmap: 'Карта розвитку',
        prompts: 'AI Промпти',
        settings: 'Налаштування',
        history: 'Історія змін',
        archive: 'Архів задач'
      },
      en: {
        dashboard: 'Dashboard',
        all_tasks: 'All Tasks',
        planned: 'Planned',
        pending: 'Pending',
        in_progress: 'In Progress',
        testing: 'Testing',
        completed: 'Completed',
        cancelled: 'Cancelled',
        notes: 'Notes',
        roadmap: 'Roadmap',
        prompts: 'AI Prompts',
        settings: 'Settings',
        history: 'Activity History',
        archive: 'Task Archive'
      }
    };
    return (dict[lang] || dict['en'])[currentView] || currentView;
  };

  return (
    <div 
      className="h-12 flex items-center justify-between pl-4 pr-3 shrink-0 select-none border-b border-white/[0.03] bg-white/[0.005] relative z-40"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Left: View Title */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400/80 uppercase">
          {getActiveViewTitle()}
        </span>
      </div>

      {/* Right: Window Controls in Flux Liquid Glass style */}
      <div 
        className="flex items-center gap-1 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl p-0.5 backdrop-blur-xl shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-all duration-300 select-none"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {/* Minimize Button */}
        <button 
          onClick={() => window.api?.window.minimize()}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-200 cursor-pointer"
          title={lang === 'ru' ? 'Свернуть' : lang === 'uk' ? 'Згорнути' : 'Minimize'}
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 2" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="10" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>

        {/* Maximize/Restore Button */}
        <button 
          onClick={() => {
            if (isMaximized) {
              window.api?.window.restore();
            } else {
              window.api?.window.maximize();
            }
          }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-200 cursor-pointer"
          title={isMaximized 
            ? (lang === 'ru' ? 'Свернуть в окно' : lang === 'uk' ? 'Згорнути у вікно' : 'Restore Down')
            : (lang === 'ru' ? 'Развернуть' : lang === 'uk' ? 'Розгорнути' : 'Maximize')
          }
        >
          {isMaximized ? (
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.5 3V8.5H7M3 1.5H8.5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1.5" y="1.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          )}
        </button>

        {/* Close Button */}
        <button 
          onClick={() => window.api?.window.close()}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all duration-200 cursor-pointer"
          title={lang === 'ru' ? 'Закрыть' : lang === 'uk' ? 'Закрити' : 'Close'}
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};
