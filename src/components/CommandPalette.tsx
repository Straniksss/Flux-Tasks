import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import * as Icons from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'task' | 'project' | 'note' | 'prompt' | 'release';
  icon: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const {
    tasks,
    projects,
    notes,
    prompts,
    releases,
    setSelectedTask,
    setSelectedProjectViewId,
    setCurrentView,
    settings
  } = useStore();

  const lang = settings.language;
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle outside click and Escape / Arrow keys shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredResults.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          filteredResults[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, query, selectedIndex]);

  // Auto-scroll selected item into view
  useEffect(() => {
    const activeEl = resultsRef.current?.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Build searchable items list
  const searchItems: SearchResult[] = [];

  // Tasks
  tasks.forEach(t => {
    searchItems.push({
      id: t.id,
      title: t.title,
      subtitle: `${lang === 'ru' ? 'Задача' : lang === 'uk' ? 'Завдання' : 'Task'} | Status: ${t.status}`,
      type: 'task',
      icon: 'CheckSquare',
      action: () => {
        setSelectedTask(t);
        onClose();
      }
    });
  });

  // Projects
  projects.forEach(p => {
    searchItems.push({
      id: p.id,
      title: p.name,
      subtitle: `${lang === 'ru' ? 'Проект' : lang === 'uk' ? 'Проект' : 'Project'} | ${p.description || ''}`,
      type: 'project',
      icon: p.icon || 'Folder',
      action: () => {
        setSelectedProjectViewId(p.id);
        setCurrentView('all_tasks');
        setSelectedTask(null);
        onClose();
      }
    });
  });

  // Notes
  notes.forEach(n => {
    searchItems.push({
      id: n.id,
      title: n.title,
      subtitle: `${lang === 'ru' ? 'Заметка' : lang === 'uk' ? 'Нотатка' : 'Note'} | ${n.content.substring(0, 50)}...`,
      type: 'note',
      icon: 'StickyNote',
      action: () => {
        setCurrentView('notes');
        setSelectedTask(null);
        onClose();
      }
    });
  });

  // Prompts
  prompts.forEach(p => {
    searchItems.push({
      id: p.id,
      title: p.title,
      subtitle: `${lang === 'ru' ? 'AI Промпт' : lang === 'uk' ? 'AI Промпт' : 'AI Prompt'} | Provider: ${p.provider}`,
      type: 'prompt',
      icon: 'Cpu',
      action: () => {
        setCurrentView('prompts');
        setSelectedTask(null);
        onClose();
      }
    });
  });

  // Releases / Roadmap
  releases.forEach(r => {
    searchItems.push({
      id: r.id,
      title: `v${r.version} - ${r.name}`,
      subtitle: `${lang === 'ru' ? 'Релиз' : lang === 'uk' ? 'Реліз' : 'Release'} | Status: ${r.status}`,
      type: 'release',
      icon: 'Rocket',
      action: () => {
        setCurrentView('roadmap');
        setSelectedTask(null);
        onClose();
      }
    });
  });

  // Filter items matching search queries
  const filteredResults = searchItems.filter(item => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q)
    );
  }).slice(0, 8); // Limit to top 8 items for fast scrolling and layout stability

  const getIcon = (name: string, cls: string = "w-4 h-4 text-slate-400") => {
    const LucideIcon = (Icons as any)[name];
    if (LucideIcon) return <LucideIcon className={cls} />;
    return <Icons.FileText className={cls} />;
  };

  const getBadgeBg = (type: string) => {
    switch (type) {
      case 'task': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'project': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'note': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'prompt': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'release': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#040816]/75 backdrop-blur-md flex items-start justify-center pt-24 px-4 select-none"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-[0_32px_64px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col h-[400px]"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Icons.Search className="w-4 h-4 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={
              lang === 'ru' ? 'Поиск задач, заметок, промптов, релизов...' : 
              lang === 'uk' ? 'Пошук завдань, нотаток, промптів, релізів...' : 
              'Search tasks, notes, AI prompts, releases...'
            }
            className="w-full text-xs text-white bg-transparent border-none outline-none placeholder-slate-500"
          />
          <span className="text-[9px] font-mono border border-white/10 rounded px-1.5 py-0.5 bg-white/5 text-slate-500 uppercase select-none">ESC</span>
        </div>

        {/* Results Container */}
        <div 
          ref={resultsRef}
          className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent"
        >
          {filteredResults.map((item, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <div
                key={item.id}
                data-active={isSelected}
                onClick={() => item.action()}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${
                  isSelected 
                    ? 'bg-white/[0.08] border-white/10 shadow-md' 
                    : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/5'
                }`}
              >
                <div className="flex items-center gap-3 truncate min-w-0">
                  <div className={`p-1.5 rounded-lg border bg-slate-950/20`}>
                    {getIcon(item.icon)}
                  </div>
                  <div className="truncate text-left">
                    <h4 className="text-[12px] font-semibold text-white leading-snug truncate">{item.title}</h4>
                    <p className="text-[10px] text-slate-400 truncate leading-snug">{item.subtitle}</p>
                  </div>
                </div>

                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${getBadgeBg(item.type)}`}>
                  {item.type.toUpperCase()}
                </span>
              </div>
            );
          })}

          {filteredResults.length === 0 && (
            <div className="text-center py-20 text-slate-500 text-xs">
              {lang === 'ru' ? 'Результаты не найдены' : lang === 'uk' ? 'Результати не знайдені' : 'No results found'}
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-white/5 bg-slate-950/25 flex justify-between items-center text-[9px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span>↑↓ {lang === 'ru' ? 'Навигация' : 'Navigate'}</span>
            <span>|</span>
            <span>ENTER {lang === 'ru' ? 'Открыть' : 'Select'}</span>
          </div>
          <span>Flux Quick Search</span>
        </div>

      </div>
    </div>
  );
};
