import React, { useState } from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';

export const Onboarding: React.FC = () => {
  const {
    projects,
    addProject,
    setIsCreateModalOpen,
    updateSettings,
    loadAllFromDB,
    settings
  } = useStore();

  const lang = settings.language;
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projName, setProjName] = useState('');
  const [projColor, setProjColor] = useState('indigo');
  const [projIcon, setProjIcon] = useState('Folder');

  const projectColors = ['indigo', 'emerald', 'sky', 'rose', 'amber', 'purple', 'teal'];

  const completeOnboarding = async () => {
    if (projects.length === 0) {
      const defaultName = lang === 'ru' ? 'Основной проект' : lang === 'uk' ? 'Основний проект' : 'Default Project';
      await addProject(defaultName, 'Primary workspace folder.', 'indigo', 'Folder');
    }
    updateSettings('onboardingCompleted', 'true');
  };

  const handleCreateFirstProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;

    await addProject(projName.trim(), 'Primary workspace folder created during onboarding.', projColor, projIcon);
    completeOnboarding();
  };

  const handleCreateFirstTask = async () => {
    await completeOnboarding();
    // Delay slightly to let onboarding transition, then open modal
    setTimeout(() => {
      setIsCreateModalOpen(true, 'feature', 'planned');
    }, 300);
  };

  const handleImport = async () => {
    if (window.api) {
      try {
        const result = await window.api.importData();
        if (result && result.data) {
          const { tasks, projects, releases, notes, prompts } = result.data;
          
          // Import projects
          if (projects && projects.length > 0) {
            for (const p of projects) {
              await window.api.saveProject(p);
            }
          }
          // Import tasks
          if (tasks && tasks.length > 0) {
            for (const t of tasks) {
              await window.api.saveTask(t);
            }
          }
          // Import notes
          if (notes && notes.length > 0) {
            for (const n of notes) {
              await window.api.saveNote(n);
            }
          }
          // Import releases
          if (releases && releases.length > 0) {
            for (const r of releases) {
              await window.api.saveRelease(r);
            }
          }
          // Import prompts
          if (prompts && prompts.length > 0) {
            for (const p of prompts) {
              await window.api.savePrompt(p);
            }
          }

          // Reload state and exit onboarding
          await loadAllFromDB();
          completeOnboarding();
        }
      } catch (err) {
        console.error('Failed to import data during onboarding', err);
      }
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-bg-base text-slate-100 min-h-screen">
      
      {/* Onboarding Glass Box Card */}
      <div className="w-full max-w-xl p-8 rounded-3xl border border-white/10 bg-slate-950/40 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] relative overflow-hidden space-y-8 select-none">
        
        {/* Glow ambient circle */}
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-indigo-500/25 to-transparent blur-[80px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-rose-500/20 to-transparent blur-[80px]" />

        {/* Brand visual header */}
        <div className="text-center space-y-4 relative z-10">
          <div className="flex justify-center">
            {/* High-Fidelity visual Flux logo */}
            <div className="w-20 h-20 p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_4px_16px_rgba(0,125,255,0.35)]">
                <path d="M 18,58 C 17,40 32,20 68,20 C 87,20 96,25 98,27 C 82,34 62,37 45,44 C 28,51 20,55 18,58 Z" fill="#007dff" opacity="0.8" />
                <path d="M 22,53 C 24,36 40,36 58,36 C 76,36 84,40 86,41 C 74,47 56,51 42,57 C 28,63 22,69 22,76 Z" fill="#ff52df" opacity="0.85" />
                <path d="M 21,58 C 20,70 28,84 43,84 C 48,84 52,79 52,74 C 52,67 43,62 36,60 Z" fill="#cd1cee" />
              </svg>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              {lang === 'ru' ? 'Добро пожаловать в Flux Tasks' : 
               lang === 'uk' ? 'Ласкаво просимо до Flux Tasks' : 
               'Welcome to Flux Tasks'}
            </h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {lang === 'ru' ? 'Ваше премиальное локальное рабочее пространство для отслеживания задач, управления AI промптами и кодом в SQLite базе данных.' : 
               lang === 'uk' ? 'Ваш преміальний локальний робочий простір для відстеження завдань, керування AI промптами та кодом в SQLite базі даних.' : 
               'Your premium offline workstation for task schedules, AI prompt snippets, and clean codebases stored in SQLite.'}
            </p>
          </div>
        </div>

        {/* Interactive content body */}
        <div className="relative z-10">
          {showProjectForm ? (
            <form onSubmit={handleCreateFirstProject} className="p-5 rounded-2xl glass-panel space-y-4">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {lang === 'ru' ? 'Создать первый проект' : lang === 'uk' ? 'Створити перший проект' : 'Create First Project'}
              </div>
              <input
                type="text"
                required
                autoFocus
                placeholder={lang === 'ru' ? 'Название проекта (например: Мой Стартап)...' : lang === 'uk' ? 'Назва проекту...' : 'Project title (e.g. My startup)...'}
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-white/10 bg-black/45 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-1.5">
                  {projectColors.map((clr) => (
                    <span
                      key={clr}
                      onClick={() => setProjColor(clr)}
                      className={`w-4 h-4 rounded-full cursor-pointer border-2 transition-transform ${
                        projColor === clr ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                      style={{
                        backgroundColor: 
                          clr === 'indigo' ? '#818cf8' :
                          clr === 'emerald' ? '#34d399' :
                          clr === 'sky' ? '#38bdf8' :
                          clr === 'rose' ? '#fb7185' :
                          clr === 'amber' ? '#fbbf24' :
                          clr === 'purple' ? '#c084fc' : '#2dd4bf'
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-2 text-xs">
                  <button 
                    type="button" 
                    onClick={() => setShowProjectForm(false)} 
                    className="px-3 py-1 text-slate-400 hover:text-white"
                  >
                    {getTranslation(lang, 'cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-1.5 rounded-lg font-bold btn-primary text-white"
                  >
                    Ok
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {/* Button: First Project */}
              <button
                onClick={() => setShowProjectForm(true)}
                className="p-4 rounded-2xl border border-white/5 glass-panel glass-panel-hover text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Icons.FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      {lang === 'ru' ? 'Создать первый проект' : lang === 'uk' ? 'Створити перший проект' : 'Create first project'}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {lang === 'ru' ? 'Создайте структуру для группировки будущих задач.' : lang === 'uk' ? 'Створіть структуру для групування майбутніх завдань.' : 'Build project folders to categorize your tasks.'}
                    </p>
                  </div>
                </div>
                <Icons.ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
              </button>

              {/* Button: First Task */}
              <button
                onClick={handleCreateFirstTask}
                className="p-4 rounded-2xl border border-white/5 glass-panel glass-panel-hover text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Icons.PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {lang === 'ru' ? 'Создать первую задачу' : lang === 'uk' ? 'Створити першу задачу' : 'Create first task'}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {lang === 'ru' ? 'Сразу переходите к планированию первой задачи.' : lang === 'uk' ? 'Відразу переходьте до планування першого завдання.' : 'Open a modal checklist forms directly.'}
                    </p>
                  </div>
                </div>
                <Icons.ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
              </button>

              {/* Button: Import data */}
              <button
                onClick={handleImport}
                className="p-4 rounded-2xl border border-white/5 glass-panel glass-panel-hover text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                    <Icons.FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-rose-400 transition-colors">
                      {lang === 'ru' ? 'Импортировать данные' : lang === 'uk' ? 'Імпортувати дані' : 'Import backup logs'}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {lang === 'ru' ? 'Загрузите сохраненный бэкап в формате JSON или Markdown.' : lang === 'uk' ? 'Завантажте збережений бекап у форматі JSON або Markdown.' : 'Load your previous tasks database export.'}
                    </p>
                  </div>
                </div>
                <Icons.ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
              </button>
            </div>
          )}
        </div>

        {/* Skipping footer */}
        {!showProjectForm && (
          <div className="text-center relative z-10 pt-2">
            <button
              onClick={completeOnboarding}
              className="text-[11px] text-slate-500 hover:text-slate-300 underline transition-colors cursor-pointer"
            >
              {lang === 'ru' ? 'Пропустить и запустить пустое приложение' : 
               lang === 'uk' ? 'Пропустити та запустити порожню програму' : 
               'Skip and open empty workspace'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
