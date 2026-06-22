import React, { useState, useEffect } from 'react';
import { useStore, TASK_TEMPLATES } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';
import { TaskType, TaskStatus, TaskPriority, PromptItem, CodeSnippet, Attachment, ChecklistItem } from '../types';

export const NewTaskModal: React.FC = () => {
  const {
    isCreateModalOpen,
    createModalInitialType,
    createModalInitialStatus,
    projects,
    settings,
    setIsCreateModalOpen,
    addTask
  } = useStore();

  const lang = settings.language;

  // Local Task Draft Fields
  const [taskType, setTaskType] = useState<TaskType>('feature');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('planned');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('unassigned');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [draftChecklist, setDraftChecklist] = useState<ChecklistItem[]>([]);

  // Intermediate lists for prompts, code, files additions
  const [draftPrompts, setDraftPrompts] = useState<PromptItem[]>([]);
  const [draftCodeSnippets, setDraftCodeSnippets] = useState<CodeSnippet[]>([]);
  const [draftAttachments, setDraftAttachments] = useState<Attachment[]>([]);

  // Local entry form controls
  const [isAddPromptOpen, setIsAddPromptOpen] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');

  const [isAddCodeOpen, setIsAddCodeOpen] = useState(false);
  const [newCodeTitle, setNewCodeTitle] = useState('');
  const [newCodeContent, setNewCodeContent] = useState('');
  const [newCodeLanguage, setNewCodeLanguage] = useState('typescript');

  // Align form state values when modal opens or closes
  useEffect(() => {
    if (isCreateModalOpen) {
      const type = createModalInitialType || 'feature';
      setTaskType(type);
      setTaskStatus(createModalInitialStatus || 'planned');
      setTitle('');
      
      // Load template defaults
      const template = TASK_TEMPLATES[type];
      setDescription(template?.descriptionTemplate || '');
      setPriority(template?.defaultPriority || 'medium');
      setDraftChecklist(
        (template?.defaultChecklist || []).map((text, idx) => ({
          id: `chk-${Date.now()}-${idx}`,
          text,
          done: false
        }))
      );
      
      setProjectId(projects[0]?.id || 'unassigned');
      setDraftPrompts([]);
      setDraftCodeSnippets([]);
      setDraftAttachments([]);
      setIsAddPromptOpen(false);
      setIsAddCodeOpen(false);
      setNewPromptTitle('');
      setNewPromptContent('');
      setNewCodeTitle('');
      setNewCodeContent('');
    }
  }, [isCreateModalOpen, createModalInitialType, createModalInitialStatus, projects]);

  const handleSelectType = (type: TaskType) => {
    setTaskType(type);
    const template = TASK_TEMPLATES[type];
    if (template) {
      setPriority(template.defaultPriority);
      setDescription(template.descriptionTemplate);
      setDraftChecklist(
        template.defaultChecklist.map((text, idx) => ({
          id: `chk-${Date.now()}-${idx}`,
          text,
          done: false
        }))
      );
    }
  };

  const handleAddPromptItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptContent.trim()) return;

    const pmpt: PromptItem = {
      id: `prompt-${Date.now()}`,
      title: newPromptTitle.trim(),
      content: newPromptContent.trim(),
      provider: 'custom'
    };
    setDraftPrompts([...draftPrompts, pmpt]);
    setNewPromptTitle('');
    setNewPromptContent('');
    setIsAddPromptOpen(false);
  };

  const handleAddCodeSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeTitle.trim() || !newCodeContent.trim()) return;

    const snip: CodeSnippet = {
      id: `snip-${Date.now()}`,
      title: newCodeTitle.trim(),
      code: newCodeContent.trim(),
      language: newCodeLanguage
    };
    setDraftCodeSnippets([...draftCodeSnippets, snip]);
    setNewCodeTitle('');
    setNewCodeContent('');
    setIsAddCodeOpen(false);
  };

  const handleManualAttachmentSim = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;

    const items: Attachment[] = [];
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx] as any;
      const sourcePath = file.path;
      if (sourcePath && window.api) {
        const result = await window.api.saveAttachment(sourcePath, file.name);
        if (result && result.success) {
          items.push({
            id: `att-${Date.now()}-${idx}`,
            name: file.name,
            size: `${Math.round(file.size / 1024)} KB`,
            type: file.type || file.name.split('.').pop() || 'file',
            url: result.path
          });
        }
      }
    }
    setDraftAttachments([...draftAttachments, ...items]);
  };

  const handleFileDropSync = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []) as any[];
    if (!files || files.length === 0) return;

    const items: Attachment[] = [];
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const sourcePath = file.path;
      if (sourcePath && window.api) {
        const result = await window.api.saveAttachment(sourcePath, file.name);
        if (result && result.success) {
          items.push({
            id: `att-${Date.now()}-${idx}`,
            name: file.name,
            size: `${Math.round(file.size / 1024)} KB`,
            type: file.type || file.name.split('.').pop() || 'file',
            url: result.path
          });
        }
      }
    }
    setDraftAttachments([...draftAttachments, ...items]);
  };

  if (!isCreateModalOpen) return null;

  // Task Types Configuration
  const visualTypes: { type: TaskType; labelKey: any; descKey: any; gradient: string; icon: string }[] = [
    { type: 'bug', labelKey: 'typeBug', descKey: 'typeBugDesc', gradient: 'from-rose-500 to-orange-500', icon: 'Bug' },
    { type: 'feature', labelKey: 'typeFeature', descKey: 'typeFeatureDesc', gradient: 'from-blue-500 to-cyan-400', icon: 'Sparkles' },
    { type: 'release', labelKey: 'typeRelease', descKey: 'typeReleaseDesc', gradient: 'from-purple-600 to-pink-500', icon: 'Rocket' },
    { type: 'refactor', labelKey: 'typeRefactor', descKey: 'typeRefactorDesc', gradient: 'from-orange-500 to-amber-500', icon: 'Wrench' },
    { type: 'documentation', labelKey: 'typeDocumentation', descKey: 'typeDocumentationDesc', gradient: 'from-teal-500 to-cyan-400', icon: 'BookOpen' },
    { type: 'prompt', labelKey: 'typePrompt', descKey: 'typePromptDesc', gradient: 'from-pink-500 to-violet-600', icon: 'Cpu' },
  ];

  // Workflow Config
  const visualStatuses: { status: TaskStatus; labelKey: any; descKey: any; colorText: string; bgHighlight: string; icon: string }[] = [
    { status: 'planned', labelKey: 'planned', descKey: 'statusPlannedDesc', colorText: 'text-sky-400', bgHighlight: 'bg-sky-500/10 border-sky-400/40', icon: 'Pin' },
    { status: 'pending', labelKey: 'waiting', descKey: 'statusWaitingDesc', colorText: 'text-amber-400', bgHighlight: 'bg-amber-500/10 border-amber-400/40', icon: 'Clock' },
    { status: 'in_progress', labelKey: 'inWork', descKey: 'statusInWorkDesc', colorText: 'text-orange-400', bgHighlight: 'bg-orange-500/10 border-orange-400/40', icon: 'Play' },
    { status: 'testing', labelKey: 'testing', descKey: 'statusTestingDesc', colorText: 'text-purple-400', bgHighlight: 'bg-purple-500/10 border-purple-400/40', icon: 'FlaskConical' },
    { status: 'completed', labelKey: 'completed', descKey: 'statusCompletedDesc', colorText: 'text-emerald-400', bgHighlight: 'bg-emerald-500/10 border-emerald-400/40', icon: 'CheckCircle2' },
    { status: 'cancelled', labelKey: 'cancelled', descKey: 'statusCancelledDesc', colorText: 'text-rose-400', bgHighlight: 'bg-rose-500/10 border-rose-400/40', icon: 'XCircle' },
  ];

  const getPriorityStyle = (prio: TaskPriority) => {
    switch(prio) {
      case 'urgent': return 'from-rose-500 to-red-600 shadow-[0_4px_12px_rgba(239,68,68,0.2)]';
      case 'high': return 'from-orange-500 to-amber-500 shadow-[0_4px_12px_rgba(249,115,22,0.2)]';
      case 'medium': return 'from-amber-400 to-yellow-500 shadow-[0_4px_12px_rgba(234,179,8,0.2)]';
      case 'low': return 'from-sky-500 to-indigo-500 shadow-[0_4px_12px_rgba(56,189,248,0.2)]';
      default: return 'from-slate-600 to-slate-700';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      description: description.trim(),
      projectId,
      priority,
      type: taskType,
      status: taskStatus,
      tags: [],
      checklist: draftChecklist,
      attachments: draftAttachments,
      prompts: draftPrompts,
      codeSnippets: draftCodeSnippets,
      notes: ''
    });

    setIsCreateModalOpen(false);
  };

  const renderIcon = (name: string, cls: string = "w-5 h-5") => {
    const LucideIcon = (Icons as any)[name];
    if (LucideIcon) return <LucideIcon className={cls} />;
    return <Icons.FileText className={cls} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-[#040816]/75 backdrop-blur-md transition-transform">
      {/* Container Card */}
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-950/60 shadow-[0_24px_64px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex flex-col h-[90vh] overflow-hidden select-none animate-in fade-in zoom-in duration-300">
        
        {/* Modal Top Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#071126]/30 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg outline outline-1 outline-white/20 flex items-center justify-center accent-bg-gradient shadow-md">
              <Icons.SquarePen className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white tracking-tight">{getTranslation(lang, 'newTask')}</h3>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{getTranslation(lang, 'premiumTaskCreator')}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(false)}
            className="p-1.5 rounded-lg btn-ghost hover:text-white transition-colors cursor-pointer"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Workflow Pipeline Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7 scroll-smooth">
          
          {/* STEP 1: TASK TYPE SELECTION CARD MATRIX */}
          <div className="space-y-3 select-none">
            <h4 className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <span className="accent-text font-bold">01.</span>
              <span>{getTranslation(lang, 'chooseType')}</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {visualTypes.map((t) => {
                const isActive = taskType === t.type;
                return (
                  <div
                    key={t.type}
                    onClick={() => handleSelectType(t.type)}
                    className={`cursor-pointer group relative p-4 rounded-xl border transition-all text-left flex flex-col items-start gap-2.5 bg-slate-900/30 ${
                      isActive 
                        ? 'border-flux-azure bg-white/[0.08] shadow-[0_0_15px_rgba(63,140,255,0.15)]' 
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Glowing highlight sphere */}
                    <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-tr ${t.gradient} opacity-5 blur-xl group-hover:opacity-10 transition-opacity`} />
                    <div className={`p-2 rounded-lg bg-gradient-to-tr ${t.gradient} text-slate-950 shadow-md transform group-hover:scale-110 transition-transform duration-300`}>
                      {renderIcon(t.icon, "w-4 h-4")}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        {getTranslation(lang, t.labelKey)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-tight line-clamp-2">
                        {getTranslation(lang, t.descKey)}
                      </div>
                    </div>
                    {/* Active Checkmark indicator */}
                    {isActive && (
                      <span className="absolute bottom-2.5 right-2.5 accent-bg-20 accent-text p-0.5 rounded-full accent-border-30">
                        <Icons.Check className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 2: TIMELINE WORKFLOW STATUS SELECTION */}
          <div className="space-y-3 select-none">
            <h4 className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <span className="accent-text font-bold">02.</span>
              <span>{getTranslation(lang, 'chooseStatus')}</span>
            </h4>
            
            {/* Visual connected timeline timeline container */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 relative">
              {visualStatuses.map((st) => {
                const isActive = taskStatus === st.status;
                return (
                  <div
                    key={st.status}
                    onClick={() => setTaskStatus(st.status)}
                    className={`cursor-pointer p-2.5 rounded-xl border text-center flex flex-col items-center justify-between gap-1.5 transition-all bg-slate-900/20 ${
                      isActive 
                        ? `border-flux-violet bg-white/[0.08] shadow-[0_0_15px_rgba(140,91,255,0.15)]` 
                        : 'border-white/5 hover:border-white/10 hover:bg-[#071126]/30 border-b border-white/[0.06]'
                    }`}
                  >
                    <div className={`p-1.5 rounded ${isActive ? st.colorText : 'text-slate-500'}`}>
                      {renderIcon(st.icon, "w-4 h-4")}
                    </div>
                    <div className={`text-[11px] font-semibold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {getTranslation(lang, st.labelKey)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: TITLE, SPECS & METADATA DETAILS */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <span className="accent-text font-bold">03.</span>
              <span>Task Specification Details</span>
            </h4>

            {/* Standard Form inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Form controls */}
              <div className="md:col-span-8 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{getTranslation(lang, 'taskTitle')}</label>
                  <input
                    type="text"
                    required
                    placeholder={getTranslation(lang, 'taskTitlePlaceholder')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full py-2.5 px-3.5 rounded-xl border border-white/5 bg-[#071126]/30 border-b border-white/[0.06] text-sm text-white placeholder-slate-500 focus:outline-none accent-focus-50 shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{getTranslation(lang, 'taskDescription')}</label>
                  <textarea
                    rows={5}
                    placeholder={getTranslation(lang, 'taskDescriptionPlaceholder')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full py-2.5 px-3.5 rounded-xl border border-white/5 bg-[#071126]/30 border-b border-white/[0.06] text-xs text-white placeholder-slate-500 focus:outline-none accent-focus-50 font-sans"
                  />
                </div>

                {/* Checklist Section */}
                <div className="space-y-2 mt-4">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {lang === 'ru' ? 'Чек-лист шаблона' : lang === 'uk' ? 'Чек-лист шаблону' : 'Template Checklist'}
                  </label>
                  <div className="space-y-1.5">
                    {draftChecklist.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2 bg-slate-900/20 p-2 border border-white/5 rounded-xl">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={(e) => {
                            const updated = [...draftChecklist];
                            updated[idx].done = e.target.checked;
                            setDraftChecklist(updated);
                          }}
                          className="w-3.5 h-3.5 rounded border-white/10 bg-black/45 accent-text focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const updated = [...draftChecklist];
                            updated[idx].text = e.target.value;
                            setDraftChecklist(updated);
                          }}
                          className="flex-1 text-xs text-white bg-transparent focus:outline-none placeholder-slate-600"
                          placeholder="Checklist item text"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setDraftChecklist(draftChecklist.filter(it => it.id !== item.id));
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Icons.Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="new-chk-item-input"
                        placeholder={lang === 'ru' ? 'Добавить пункт...' : lang === 'uk' ? 'Додати пункт...' : 'Add checklist item...'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              setDraftChecklist([...draftChecklist, { id: `chk-${Date.now()}-${draftChecklist.length}`, text: val, done: false }]);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                        className="flex-1 py-1.5 px-3.5 rounded-lg border border-white/5 bg-[#071126]/30 border-b border-white/[0.06] text-xs text-white placeholder-slate-500 focus:outline-none accent-focus-50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('new-chk-item-input') as HTMLInputElement;
                          const val = input?.value.trim();
                          if (val) {
                            setDraftChecklist([...draftChecklist, { id: `chk-${Date.now()}-${draftChecklist.length}`, text: val, done: false }]);
                            input.value = '';
                          }
                        }}
                        className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        {lang === 'ru' ? 'Добавить' : lang === 'uk' ? 'Додати' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side Metadata controls (Project links, Priority, Tags) */}
              <div className="md:col-span-4 space-y-4">
                {/* Project selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{getTranslation(lang, 'selectProject')}</label>
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {projects.map((proj) => {
                      const isSel = projectId === proj.id;
                      const colMap: any = {
                        indigo: 'border-indigo-400/30 text-indigo-400',
                        emerald: 'border-emerald-400/30 text-emerald-400',
                        sky: 'border-sky-400/30 text-sky-400',
                        rose: 'border-rose-400/30 text-rose-400',
                        amber: 'border-amber-400/30 text-amber-400',
                        purple: 'border-purple-400/30 text-purple-400',
                        teal: 'border-teal-400/30 text-teal-400'
                      };
                      return (
                        <div
                          key={proj.id}
                          onClick={() => setProjectId(proj.id)}
                          className={`cursor-pointer px-2.5 py-1 rounded-lg border text-[10px] font-medium truncate shrink-0 select-none ${
                            isSel 
                              ? 'bg-emerald-400 text-slate-950 border-emerald-400' 
                              : `bg-slate-900/25 text-slate-400 border-white/5 hover:border-white/10 hover:text-slate-200`
                          }`}
                        >
                          {proj.name}
                        </div>
                      );
                    })}
                    <div
                      onClick={() => setProjectId('unassigned')}
                      className={`cursor-pointer px-2.5 py-1 rounded-lg border text-[10px] truncate shrink-0 select-none ${
                        projectId === 'unassigned'
                          ? 'bg-emerald-400 text-slate-950 border-emerald-400'
                          : 'bg-slate-900/25 text-slate-400 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {getTranslation(lang, 'unassigned')}
                    </div>
                  </div>
                </div>

                {/* Priority Selector pills */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{getTranslation(lang, 'selectPriority')}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((prio) => {
                      const isSel = priority === prio;
                      const displayLabel = getTranslation(lang, `priority${prio.charAt(0).toUpperCase() + prio.slice(1)}` as any);
                      return (
                        <button
                          key={prio}
                          type="button"
                          onClick={() => setPriority(prio)}
                          className={`py-1 px-2 text-[10px] font-mono rounded border flex items-center justify-center gap-1 cursor-pointer select-none transition-all ${
                            isSel 
                              ? `bg-gradient-to-r ${getPriorityStyle(prio)} text-slate-950 font-semibold border-transparent`
                              : 'bg-slate-900/30 text-slate-400 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <span className="capitalize">{displayLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* STEP 4: OPTIONAL TASK SPECIFICATION BLOCKS */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <span className="accent-text font-bold">04.</span>
              <span>{lang === 'ru' ? 'Дополнительные спецификации (промты, код, файлы)' : 'Optional Specifications (Prompts, Code, Files)'}</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* PROMPTS COMPONENT */}
              <div className="space-y-3 p-4 rounded-xl border border-white/5 bg-slate-900/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Icons.Bot className="w-3.5 h-3.5 text-rose-400" />
                      <span>{getTranslation(lang, 'promptsTitle')}</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setIsAddPromptOpen(!isAddPromptOpen)}
                      className="py-1 px-2 rounded hover:bg-white/5 text-[10px] font-semibold text-rose-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Icons.Plus className="w-3 h-3" />
                      <span>{getTranslation(lang, 'addPromptBtn')}</span>
                    </button>
                  </div>

                  {isAddPromptOpen && (
                    <div className="space-y-2 p-2.5 rounded-lg border border-white/10 bg-slate-950/40 mt-2">
                      <input
                        type="text"
                        placeholder={getTranslation(lang, 'promptTitlePlaceholder')}
                        value={newPromptTitle}
                        onChange={(e) => setNewPromptTitle(e.target.value)}
                        className="w-full py-1 px-2 text-xs rounded border border-white/5 bg-black/45 text-white placeholder-slate-500 focus:outline-none"
                      />
                      <textarea
                        rows={3}
                        placeholder={getTranslation(lang, 'promptContentPlaceholder')}
                        value={newPromptContent}
                        onChange={(e) => setNewPromptContent(e.target.value)}
                        className="w-full p-2 text-xs font-mono rounded border border-white/5 bg-black/45 text-rose-300 placeholder-slate-500 focus:outline-none"
                      />
                      <div className="flex justify-end gap-1.5 text-[10px]">
                        <button type="button" onClick={() => setIsAddPromptOpen(false)} className="px-1.5 py-0.5 text-slate-400 hover:text-white cursor-pointer">{getTranslation(lang, 'cancel')}</button>
                        <button type="button" onClick={handleAddPromptItem} className="px-2 py-0.5 font-bold rounded btn-danger text-white cursor-pointer">Add</button>
                      </div>
                    </div>
                  )}

                  {/* Draft Prompts chips/cards */}
                  <div className="space-y-2 mt-2 max-h-[160px] overflow-y-auto">
                    {draftPrompts.map((p) => (
                      <div key={p.id} className="p-2 rounded border border-white/5 bg-[#0a0a0f] flex items-start justify-between gap-1 group">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-slate-200 truncate">{p.title}</div>
                          <div className="text-[9px] font-mono text-slate-500 mt-0.5 max-h-8 overflow-hidden text-ellipsis line-clamp-1">{p.content}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDraftPrompts(draftPrompts.filter(item => item.id !== p.id))}
                          className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                        >
                          <Icons.X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {draftPrompts.length === 0 && !isAddPromptOpen && (
                      <div className="text-center py-4 text-[10px] text-slate-600 italic">No prompts added</div>
                    )}
                  </div>
                </div>
              </div>

              {/* CODE SNIPPETS COMPONENT */}
              <div className="space-y-3 p-4 rounded-xl border border-white/5 bg-slate-900/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Icons.Code2 className="w-3.5 h-3.5 text-teal-400" />
                      <span>{getTranslation(lang, 'codeSnippetsTitle')}</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setIsAddCodeOpen(!isAddCodeOpen)}
                      className="py-1 px-2 rounded hover:bg-white/5 text-[10px] font-semibold text-teal-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Icons.Plus className="w-3 h-3" />
                      <span>{getTranslation(lang, 'addCodeSnippet')}</span>
                    </button>
                  </div>

                  {isAddCodeOpen && (
                    <div className="space-y-2 p-2.5 rounded-lg border border-white/10 bg-slate-950/40 mt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder={getTranslation(lang, 'codeTitlePlaceholder')}
                          value={newCodeTitle}
                          onChange={(e) => setNewCodeTitle(e.target.value)}
                          className="w-full py-1 px-2 text-xs rounded border border-white/5 bg-black/45 text-white placeholder-slate-500 focus:outline-none"
                        />
                        <select
                          value={newCodeLanguage}
                          onChange={(e) => setNewCodeLanguage(e.target.value)}
                          className="w-full py-1 px-2 text-xs rounded border border-white/5 bg-black/45 text-white focus:outline-none font-mono"
                        >
                          {['typescript', 'javascript', 'python', 'json', 'html', 'css', 'sql', 'bash'].map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        rows={3}
                        placeholder={getTranslation(lang, 'codeContentPlaceholder')}
                        value={newCodeContent}
                        onChange={(e) => setNewCodeContent(e.target.value)}
                        className="w-full p-2 text-xs font-mono rounded border border-white/5 bg-black/45 text-teal-300 placeholder-slate-500 focus:outline-none"
                      />
                      <div className="flex justify-end gap-1.5 text-[10px]">
                        <button type="button" onClick={() => setIsAddCodeOpen(false)} className="px-1.5 py-0.5 text-slate-400 hover:text-white cursor-pointer">{getTranslation(lang, 'cancel')}</button>
                        <button type="button" onClick={handleAddCodeSnippet} className="px-2 py-0.5 font-bold rounded bg-teal-500 text-slate-950 cursor-pointer">Add</button>
                      </div>
                    </div>
                  )}

                  {/* Draft Code Snippets chips/cards */}
                  <div className="space-y-2 mt-2 max-h-[160px] overflow-y-auto">
                    {draftCodeSnippets.map((c) => (
                      <div key={c.id} className="p-2 rounded border border-white/5 bg-[#0a0a0f] flex items-start justify-between gap-1 group">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-slate-200 truncate">{c.title}</div>
                          <div className="text-[8px] font-mono text-slate-500 mt-0.5 uppercase tracking-wide">{c.language}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDraftCodeSnippets(draftCodeSnippets.filter(item => item.id !== c.id))}
                          className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                        >
                          <Icons.X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {draftCodeSnippets.length === 0 && !isAddCodeOpen && (
                      <div className="text-center py-4 text-[10px] text-slate-600 italic">No code blocks added</div>
                    )}
                  </div>
                </div>
              </div>

              {/* FILES/ATTACHMENTS COMPONENT */}
              <div className="space-y-3 p-4 rounded-xl border border-white/5 bg-slate-900/10 flex flex-col justify-between">
                <div>
                  <div className="pb-1.5 border-b border-white/5">
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Icons.Paperclip className="w-3.5 h-3.5 text-sky-400" />
                      <span>{getTranslation(lang, 'attachmentsTitle')}</span>
                    </h5>
                  </div>

                  {/* File Drop Drag Box */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={handleFileDropSync}
                    className="border border-dashed border-white/10 accent-hover-bg bg-slate-950/20 p-3 rounded-lg text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 relative group mt-2"
                  >
                    <input
                      type="file"
                      multiple
                      onChange={handleManualAttachmentSim}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Icons.UploadCloud className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                    <p className="text-[10px] text-slate-400 font-medium">{getTranslation(lang, 'dragDropText')}</p>
                  </div>

                  {/* Draft Attachments chips/cards */}
                  <div className="space-y-1.5 mt-2 max-h-[140px] overflow-y-auto">
                    {draftAttachments.map((att) => (
                      <div key={att.id} className="p-1.5 rounded border border-white/5 bg-[#0a0a0f] flex items-center justify-between gap-1 text-[10px]">
                        <div className="min-w-0 flex items-center gap-1.5">
                          <Icons.File className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="truncate text-slate-300 font-medium">{att.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDraftAttachments(draftAttachments.filter(item => item.id !== att.id))}
                          className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                        >
                          <Icons.X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {draftAttachments.length === 0 && (
                      <div className="text-center py-4 text-[10px] text-slate-600 italic">No files attached</div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Controls footer */}
        <div className="p-4 border-t border-white/5 bg-[#071126]/30 border-b border-white/[0.06] flex items-center justify-end gap-3 shrink-0 select-none">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(false)}
            className="btn-ghost py-2 px-4 text-xs font-semibold transition-colors cursor-pointer"
          >
            {getTranslation(lang, 'cancel')}
          </button>
          <button
            type="button"
            disabled={!title.trim()}
            onClick={handleSave}
            className={`py-2 px-5 rounded-xl text-xs font-semibold text-slate-950 flex items-center gap-1.5 transform active:scale-95 transition-all cursor-pointer ${
              title.trim() 
                ? 'btn-primary' 
                : 'accent-bg-20 accent-text-muted cursor-not-allowed border border-emerald-400/10'
            }`}
          >
            <Icons.Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{getTranslation(lang, 'createTaskBtn')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
