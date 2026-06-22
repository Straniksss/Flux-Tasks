import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';
import { Task, ChecklistItem, CodeSnippet, PromptItem, Attachment, TaskPriority, TaskStatus, TaskType } from '../types';
import { MarkdownViewer } from './MarkdownViewer';

export const TaskDetailView: React.FC = () => {
  const {
    selectedTask,
    setSelectedTask,
    updateTask,
    deleteTask,
    projects,
    settings,
    showToast
  } = useStore();

  const lang = settings.language;

  // Local editing states to enable direct Notion-like speed
  const [isEditingDocs, setIsEditingDocs] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDesc, setEditedDesc] = useState('');
  const [editedNotes, setEditedNotes] = useState('');

  // Checklist Adding block
  const [newCheckItem, setNewCheckItem] = useState('');

  // Code Block Adding block
  const [isAddCodeOpen, setIsAddCodeOpen] = useState(false);
  const [newCodeTitle, setNewCodeTitle] = useState('');
  const [newCodeLanguage, setNewCodeLanguage] = useState('typescript');
  const [newCodeContent, setNewCodeContent] = useState('');

  // Prompt Adding block
  const [isAddPromptOpen, setIsAddPromptOpen] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptProvider, setNewPromptProvider] = useState<'chatgpt' | 'gemini' | 'claude' | 'custom'>('gemini');
  const [newPromptContent, setNewPromptContent] = useState('');

  // Copy feedbacks
  const [copyFeedbackMap, setCopyFeedbackMap] = useState<Record<string, boolean>>({});
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  // Align details state when a task is loaded/selected
  useEffect(() => {
    if (selectedTask) {
      setEditedTitle(selectedTask.title);
      setEditedDesc(selectedTask.description || '');
      setEditedNotes(selectedTask.notes || '');
      setIsEditingDocs(false);
      setIsAddCodeOpen(false);
      setIsAddPromptOpen(false);
    }
  }, [selectedTask]);

  if (!selectedTask) return null;

  // Sync basic field changes directly
  const handleFieldChange = (field: keyof Task, value: any, logMsg: string) => {
    updateTask({
      ...selectedTask,
      [field]: value
    }, logMsg);
  };

  const handleCreateGitHubIssue = async () => {
    const linkedProject = projects.find(p => p.id === selectedTask.projectId);
    if (!linkedProject || !linkedProject.githubOwner || !linkedProject.githubRepo) {
      showToast(lang === 'ru' ? 'Сначала свяжите проект с репозиторием GitHub' : lang === 'uk' ? 'Спочатку зв\'яжіть проект з репозиторієм GitHub' : 'Please link the project to a GitHub repository first', 'error');
      return;
    }

    if (!window.api || !window.api.github) {
      showToast('GitHub API unavailable', 'error');
      return;
    }

    setIsCreatingIssue(true);
    try {
      const checklistMarkdown = selectedTask.checklist && selectedTask.checklist.length > 0
        ? '\n\n### Checklist\n' + selectedTask.checklist.map(item => `- [${item.done ? 'x' : ' '}] ${item.text}`).join('\n')
        : '';
      const desc = selectedTask.description || '';
      const body = `${desc}${checklistMarkdown}\n\n*Created from Flux Tasks task ID: ${selectedTask.id}*`;

      const res = await window.api.github.createIssue(
        linkedProject.githubOwner,
        linkedProject.githubRepo,
        {
          title: selectedTask.title,
          body: body,
          labels: selectedTask.tags || []
        }
      );

      if (res.success && res.issue) {
        updateTask({
          ...selectedTask,
          githubIssueNumber: res.issue.number,
          githubIssueUrl: res.issue.htmlUrl,
          githubIssueState: res.issue.state
        }, `Linked task to GitHub Issue #${res.issue.number}`);

        showToast(lang === 'ru' ? 'GitHub Issue успешно создано!' : lang === 'uk' ? 'GitHub Issue успішно створено!' : 'GitHub Issue created successfully!', 'success');
      } else {
        showToast(res.error || 'Failed to create GitHub issue', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsCreatingIssue(false);
    }
  };

  const handleSaveDocs = () => {
    if (!editedTitle.trim()) return;
    updateTask({
      ...selectedTask,
      title: editedTitle.trim(),
      description: editedDesc.trim(),
      notes: editedNotes.trim()
    }, 'Specification documents refactored');
    setIsEditingDocs(false);
  };

  // Checklist actions
  const handleToggleCheck = (itemId: string, done: boolean) => {
    const updatedChecklist = selectedTask.checklist.map(item => 
      item.id === itemId ? { ...item, done } : item
    );
    const itemText = selectedTask.checklist.find(i => i.id === itemId)?.text || '';
    handleFieldChange(
      'checklist', 
      updatedChecklist, 
      `Checklist item status changed: ${itemText} -> ${done ? 'DONE' : 'PENDING'}`
    );
  };

  const handleCreateCheckItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckItem.trim()) return;
    
    const newItem: ChecklistItem = {
      id: `chk-item-${Date.now()}`,
      text: newCheckItem.trim(),
      done: false
    };

    handleFieldChange(
      'checklist',
      [...(selectedTask.checklist || []), newItem],
      `Appended checklist bullet: ${newItem.text}`
    );
    setNewCheckItem('');
  };

  const handleRemoveCheckItem = (itemId: string) => {
    const culledItem = selectedTask.checklist.find(i => i.id === itemId)?.text || '';
    const filtered = selectedTask.checklist.filter(item => item.id !== itemId);
    handleFieldChange(
      'checklist',
      filtered,
      `Removed checklist bullet: ${culledItem}`
    );
  };

  // Code blocks actions
  const handleAddCodeSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeTitle.trim() || !newCodeContent.trim()) return;

    const block: CodeSnippet = {
      id: `code-${Date.now()}`,
      title: newCodeTitle.trim(),
      code: newCodeContent.trim(),
      language: newCodeLanguage
    };

    handleFieldChange(
      'codeSnippets',
      [...(selectedTask.codeSnippets || []), block],
      `Inserted code block spec: ${block.title}`
    );

    setNewCodeTitle('');
    setNewCodeContent('');
    setIsAddCodeOpen(false);
  };

  const handleRemoveCodeSnippet = (snippetId: string) => {
    const filtered = selectedTask.codeSnippets.filter(c => c.id !== snippetId);
    handleFieldChange('codeSnippets', filtered, 'Removed code snippet');
  };

  // Prompt actions
  const handleAddPromptItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptContent.trim()) return;

    const prompt: PromptItem = {
      id: `prompt-${Date.now()}`,
      title: newPromptTitle.trim(),
      content: newPromptContent.trim(),
      provider: newPromptProvider
    };

    handleFieldChange(
      'prompts',
      [...(selectedTask.prompts || []), prompt],
      `Stored custom AI prompt: ${prompt.title}`
    );

    setNewPromptTitle('');
    setNewPromptContent('');
    setIsAddPromptOpen(false);
  };

  const handleRemovePromptItem = (promptId: string) => {
    const filtered = selectedTask.prompts.filter(p => p.id !== promptId);
    handleFieldChange('prompts', filtered, 'Cleaned AI prompt block');
  };

  // Real File Drop Attachment
  const handleFileDropSync = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files) as any[];
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const sourcePath = file.path;
      if (sourcePath && window.api) {
        const result = await window.api.saveAttachment(sourcePath, file.name);
        if (result && result.success) {
          newAttachments.push({
            id: `att-${Date.now()}-${idx}`,
            name: file.name,
            size: `${Math.round(file.size / 1024)} KB`,
            type: file.type || file.name.split('.').pop() || 'file',
            url: result.path
          });
        }
      }
    }

    if (newAttachments.length > 0) {
      handleFieldChange(
        'attachments',
        [...(selectedTask.attachments || []), ...newAttachments],
        `Uploaded attachments: ${newAttachments.map(it => it.name).join(', ')}`
      );
    }
  };

  const handleManualAttachment = async () => {
    if (window.api) {
      const sourcePath = await window.api.selectFile();
      if (!sourcePath) return;

      const fileName = sourcePath.split(/[/\\]/).pop() || 'file';
      const result = await window.api.saveAttachment(sourcePath, fileName);
      if (result && result.success) {
        const newAtt: Attachment = {
          id: `att-${Date.now()}`,
          name: fileName,
          size: 'Local File',
          type: fileName.split('.').pop() || 'file',
          url: result.path
        };
        handleFieldChange(
          'attachments',
          [...(selectedTask.attachments || []), newAtt],
          `Added attachment: ${fileName}`
        );
      }
    }
  };

  const handleCopyText = (content: string, elementId: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopyFeedbackMap(prev => ({ ...prev, [elementId]: true }));
      setTimeout(() => {
        setCopyFeedbackMap(prev => ({ ...prev, [elementId]: false }));
      }, 1500);
    });
  };

  const handleDeleteTaskObj = () => {
    deleteTask(selectedTask.id);
  };

  // Helper styles mapping
  const resolvePriorityColor = (prio: TaskPriority) => {
    switch (prio) {
      case 'urgent': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const renderIcon = (name: string, cls: string = "w-4 h-4") => {
    const LucideIcon = (Icons as any)[name];
    if (LucideIcon) return <LucideIcon className={cls} />;
    return <Icons.FileText className={cls} />;
  };

  const countByCheck = () => {
    const currentList = selectedTask.checklist || [];
    const doneCount = currentList.filter(i => i.done).length;
    return `${doneCount} / ${currentList.length}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      
      {/* Top action header */}
      <div className="p-4 border-b border-white/5 bg-slate-900/30 flex items-center justify-between shrink-0 select-none">
        <button
          onClick={() => setSelectedTask(null)}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg btn-secondary text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Icons.ChevronLeft className="w-4 h-4" />
          <span>{getTranslation(lang, 'backToList')}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Delete Icon action */}
          <button
            onClick={handleDeleteTaskObj}
            className="flex items-center gap-1 py-1 px-2.5 rounded-lg border border-rose-500/10 bg-rose-500/10 hover:bg-rose-500/25 text-xs font-semibold text-rose-400 table-cell cursor-pointer"
          >
            <Icons.Trash2 className="w-3.5 h-3.5" />
            <span>{getTranslation(lang, 'deleteTask')}</span>
          </button>
        </div>
      </div>

      {/* Main interactive split workspace screen detail scroll */}
      <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/5 overflow-y-auto lg:overflow-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        
        {/* Left Side: Notion-Inspired docs specification, code snippet compiler, prompt manager, checklists */}
        <div className="flex-1 overflow-visible lg:overflow-y-auto p-6 space-y-7 scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          
          {/* Docs header title area */}
          <div className="space-y-4">
            {isEditingDocs ? (
              <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-slate-950/40">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full py-2 px-3 text-lg font-display font-medium rounded-lg border border-white/5 bg-black/45 text-white placeholder-slate-500 focus:outline-none accent-focus"
                />
                
                <textarea
                  rows={8}
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  className="w-full p-3 text-xs font-mono rounded-lg border border-white/5 bg-black/45 text-slate-200 placeholder-slate-500 focus:outline-none accent-focus"
                  placeholder="Markdown description or detailed specs..."
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingDocs(false)}
                    className="btn-ghost py-1 px-3 text-xs"
                  >
                    {getTranslation(lang, 'cancel')}
                  </button>
                  <button
                    onClick={handleSaveDocs}
                    className="py-1 px-4.5 rounded-lg text-xs font-bold btn-accent"
                  >
                    {getTranslation(lang, 'saveTask')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="group space-y-3 cursor-pointer" onClick={() => setIsEditingDocs(true)}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-display font-semibold text-white tracking-tight leading-tight hover:text-emerald-400 transition-colors">
                    {selectedTask.title}
                  </h2>
                  <span className="p-1 rounded bg-white/5 text-slate-400 group-hover:block hidden shrink-0" title="Edit Specification">
                    <Icons.FilePen className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Simulated Markdown renderer */}
                {selectedTask.description ? (
                  <div className="text-xs text-slate-300 leading-relaxed max-w-none pr-2 rounded border border-white/[0.03] bg-white/[0.01] p-3">
                    <MarkdownViewer text={selectedTask.description} />
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic hover:text-slate-400">{getTranslation(lang, 'taskDescriptionPlaceholder')}</p>
                )}
              </div>
            )}
          </div>

          {/* CHECKLISTS COMPONENT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Icons.CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>{getTranslation(lang, 'checklistTitle')}</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-bold">
                {countByCheck()}
              </span>
            </div>

            <div className="space-y-2">
              {(selectedTask.checklist || []).map((item) => (
                <div key={item.id} className="group flex items-center justify-between p-2 rounded-lg glass-panel glass-panel-hover transition-all">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) => handleToggleCheck(item.id, e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-slate-900 accent-text focus:ring-opacity-0 cursor-pointer"
                    />
                    <span className={`text-xs ${item.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {item.text}
                    </span>
                  </label>
                  <button 
                    onClick={() => handleRemoveCheckItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                  >
                    <Icons.X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add checklist input formula */}
              <form onSubmit={handleCreateCheckItem} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder={getTranslation(lang, 'addChecklistItem')}
                  value={newCheckItem}
                  onChange={(e) => setNewCheckItem(e.target.value)}
                  className="flex-1 py-1.5 px-3 rounded-lg border border-white/5 glass-input accent-focus"
                />
                <button type="submit" className="py-1 px-3 text-xs btn-secondary shrink-0 rounded-lg cursor-pointer">
                  Ok
                </button>
              </form>
            </div>
          </div>

          {/* CODE BLOCKS COMPILER GRAPH */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Icons.Code2 className="w-4 h-4 text-teal-400" />
                <span>{getTranslation(lang, 'codeSnippetsTitle')}</span>
              </h3>
              <button
                onClick={() => setIsAddCodeOpen(!isAddCodeOpen)}
                className="py-1 px-2.5 rounded hover:bg-white/5 text-[10px] font-semibold text-teal-400 flex items-center gap-1"
              >
                <Icons.Plus className="w-3.5 h-3.5" />
                <span>{getTranslation(lang, 'addCodeSnippet')}</span>
              </button>
            </div>

            {/* Inline snippet creation block */}
            {isAddCodeOpen && (
              <form onSubmit={handleAddCodeSnippet} className="p-3 rounded-xl border border-white/10 bg-slate-950/40 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder={getTranslation(lang, 'codeTitlePlaceholder')}
                    value={newCodeTitle}
                    onChange={(e) => setNewCodeTitle(e.target.value)}
                    className="w-full py-1 px-2.5 text-xs rounded-lg border border-white/5 bg-black/45 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                  <select
                    value={newCodeLanguage}
                    onChange={(e) => setNewCodeLanguage(e.target.value)}
                    className="w-full py-1 px-2.5 text-xs rounded-lg border border-white/5 bg-black/45 text-white focus:outline-none focus:border-teal-500 font-mono"
                  >
                    {['typescript', 'javascript', 'python', 'json', 'html', 'css', 'sql', 'bash', 'yaml'].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder={getTranslation(lang, 'codeContentPlaceholder')}
                  value={newCodeContent}
                  onChange={(e) => setNewCodeContent(e.target.value)}
                  className="w-full p-2.5 text-xs font-mono rounded-lg border border-white/5 bg-black/45 text-teal-300 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button type="button" onClick={() => setIsAddCodeOpen(false)} className="px-2 py-1 text-slate-400 hover:text-white">{getTranslation(lang, 'cancel')}</button>
                  <button type="submit" className="px-3 py-1 font-bold rounded bg-teal-500 text-slate-900">Add Block</button>
                </div>
              </form>
            )}

            {/* List existing snippets */}
            <div className="space-y-3">
              {(selectedTask.codeSnippets || []).map((snip) => (
                <div key={snip.id} className="rounded-xl border border-white/5 bg-slate-950/40 relative group overflow-hidden">
                  <div className="p-2 border-b border-white/5 bg-slate-900/30 flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Icons.FileCode className="w-3.5 h-3.5 text-teal-400" />
                      <span>{snip.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-slate-500 uppercase font-bold">{snip.language}</span>
                      <button
                        onClick={() => handleRemoveCodeSnippet(snip.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 cursor-pointer transition-opacity"
                        title="Delete code block"
                      >
                        <Icons.Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {/* Compilation viewer */}
                  <div className="p-3.5 font-mono text-xs text-teal-300 leading-relaxed bg-[#040816]/80 border border-white/5 rounded-lg max-h-48 overflow-y-auto whitespace-pre">
                    {snip.code}
                  </div>
                  {/* Floating Action copies */}
                  <button
                    onClick={() => handleCopyText(snip.code, snip.id)}
                    className="absolute bottom-2.5 right-2.5 py-1 px-2.5 rounded bg-white/10 hover:bg-white/20 font-mono text-[9px] text-white flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copyFeedbackMap[snip.id] ? (
                      <>
                        <Icons.Check className="w-3 h-3 text-emerald-400" />
                        <span>{getTranslation(lang, 'copied')}</span>
                      </>
                    ) : (
                      <>
                        <Icons.Copy className="w-3 h-3" />
                        <span>{getTranslation(lang, 'copyCode')}</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* AI PROMPTS DIRECTORY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Icons.Bot className="w-4 h-4 text-rose-400" />
                <span>{getTranslation(lang, 'promptsTitle')}</span>
              </h3>
              <button
                onClick={() => setIsAddPromptOpen(!isAddPromptOpen)}
                className="py-1 px-2.5 rounded hover:bg-white/5 text-[10px] font-semibold text-rose-400 flex items-center gap-1"
              >
                <Icons.Plus className="w-3.5 h-3.5" />
                <span>{getTranslation(lang, 'addPromptBtn')}</span>
              </button>
            </div>

            {/* Prompt creation Block */}
            {isAddPromptOpen && (
              <form onSubmit={handleAddPromptItem} className="p-3 rounded-xl border border-white/10 bg-slate-950/40 space-y-3">
                <input
                  type="text"
                  required
                  placeholder={getTranslation(lang, 'promptTitlePlaceholder')}
                  value={newPromptTitle}
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  className="w-full py-1.5 px-3 text-xs rounded-lg border border-white/5 bg-black/45 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <textarea
                  rows={4}
                  required
                  placeholder={getTranslation(lang, 'promptContentPlaceholder')}
                  value={newPromptContent}
                  onChange={(e) => setNewPromptContent(e.target.value)}
                  className="w-full p-2.5 text-xs font-mono rounded-lg border border-white/5 bg-black/45 text-rose-300 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button type="button" onClick={() => setIsAddPromptOpen(false)} className="px-2 py-1 text-slate-400 hover:text-white">{getTranslation(lang, 'cancel')}</button>
                  <button type="submit" className="px-3 py-1 font-bold rounded btn-danger text-white">Save Preset</button>
                </div>
              </form>
            )}

            {/* Prompt cards layout */}
            <div className="grid grid-cols-1 gap-3">
              {(selectedTask.prompts || []).map((pr) => (
                <div key={pr.id} className="p-3 rounded-xl glass-panel glass-panel-hover group relative transition-colors">
                  <div className="flex items-center justify-between font-medium text-xs mb-2">
                    <div className="flex items-center gap-1.5 text-white font-semibold">
                      <Icons.MessageSquareCode className="w-3.5 h-3.5 text-rose-400" />
                      <span>{pr.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemovePromptItem(pr.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-opacity"
                        title="Delete AI Prompt block"
                      >
                        <Icons.X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-sans text-slate-300 italic whitespace-pre-wrap leading-relaxed pr-2 p-2.5 rounded bg-[#040816]/80 border border-white/5 rounded-lg">
                    {pr.content}
                  </p>
                  <button
                    onClick={() => handleCopyText(pr.content, pr.id)}
                    className="absolute bottom-5 right-5 py-1 px-2.5 rounded bg-white/5 hover:bg-white/15 text-[9px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copyFeedbackMap[pr.id] ? (
                      <>
                        <Icons.Check className="w-3 h-3 text-emerald-400" />
                        <span>{getTranslation(lang, 'copied')}</span>
                      </>
                    ) : (
                      <>
                        <Icons.Copy className="w-3 h-3" />
                        <span>{getTranslation(lang, 'copyCode')}</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ATTACHMENTS WITH DROPZONE SIM */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1.5 border-b border-white/5">
              <Icons.Paperclip className="w-4 h-4 text-sky-400" />
              <span>{getTranslation(lang, 'attachmentsTitle')}</span>
            </h3>

            {/* Drop Drag Box */}
            <div
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={handleFileDropSync}
              onClick={handleManualAttachment}
              className="border border-dashed border-white/[0.12] hover:border-flux-azure bg-white/[0.02] p-5 rounded-xl transition-all text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 relative group"
            >
              <Icons.UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
              <p className="text-xs text-slate-400 font-medium">{getTranslation(lang, 'dragDropText')}</p>
              <p className="text-[10px] text-slate-500">{lang === 'ru' ? 'Кликните для выбора файла или перетащите его сюда' : lang === 'uk' ? 'Клікніть для вибору файлу або перетягніть його сюди' : 'Click to select file or drag it here'}</p>
            </div>

            {/* Display list attachments */}
            {selectedTask.attachments && selectedTask.attachments.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedTask.attachments.map((att) => {
                  return (
                    <div 
                      key={att.id} 
                      onClick={async () => {
                        if (window.api) {
                          const res = await window.api.openAttachment(att.url);
                          if (res && !res.success) {
                            showToast(getTranslation(lang, 'fileNotFoundError'), 'error');
                          }
                        }
                      }}
                      className="p-2 glass-panel glass-panel-hover flex items-center justify-between gap-1 group relative cursor-pointer"
                      title={lang === 'ru' ? 'Кликните, чтобы открыть файл' : lang === 'uk' ? 'Клікніть, щоб відкрити файл' : 'Click to open file'}
                    >
                      <div className="min-w-0 flex items-center gap-1.5">
                        <Icons.File className="w-4 h-4 text-sky-400 shrink-0" />
                        <div className="truncate">
                          <div className="text-[10px] text-slate-200 font-semibold truncate leading-tight">{att.name}</div>
                          <div className="text-[9px] font-mono text-slate-500 truncate mt-0.5">{att.size}</div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const filter = selectedTask.attachments.filter(a => a.id !== att.id);
                          handleFieldChange('attachments', filter, `Removed file attachment ${att.name}`);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-opacity animate-none"
                      >
                        <Icons.Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Specs details (Status, project, priority, history log, simple notes) */}
        <div className="w-full lg:w-80 shrink-0 bg-[#071126]/30 border-l border-white/[0.06] p-5 space-y-6 overflow-visible lg:overflow-y-auto select-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          
          {/* Metadata Specs controls */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-400 pb-1.5 border-b border-white/5">{getTranslation(lang, 'taskProperties')}</h3>
            
            {/* Status change block */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{getTranslation(lang, 'workflowStage')}</label>
              <div className="grid grid-cols-2 gap-1">
                {['planned', 'pending', 'in_progress', 'testing', 'completed', 'cancelled'].map((st) => {
                  const labelVal = getTranslation(lang, st as any);
                  const isCurStatus = selectedTask.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => handleFieldChange('status', st, `Status changed directly to ${getTranslation(lang, st as any)}`)}
                      className={`py-1 px-1.5 rounded text-[10px] uppercase font-bold border transition-all text-center select-none cursor-pointer ${
                        isCurStatus 
                          ? 'bg-white/[0.08] text-white border-flux-azure font-semibold shadow-md'
                          : 'bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/[0.05] hover:text-slate-200'
                      }`}
                    >
                      {labelVal.substring(0, 10)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Project linkage */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{getTranslation(lang, 'projectAssociation')}</label>
              <select
                value={selectedTask.projectId}
                onChange={(e) => handleFieldChange('projectId', e.target.value, 'Linked project re-assigned')}
                className="w-full py-1.5 px-2.5 rounded-lg border border-white/5 bg-black/35 text-xs text-white focus:outline-none accent-focus"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="unassigned">{getTranslation(lang, 'unassigned')}</option>
              </select>
            </div>

            {/* GitHub Issue Connection */}
            {(() => {
              const linkedProject = projects.find(p => p.id === selectedTask.projectId);
              const isProjectLinkedToGitHub = !!(linkedProject && linkedProject.githubOwner && linkedProject.githubRepo);
              if (!isProjectLinkedToGitHub) return null;

              return (
                <div className="space-y-2.5 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Icons.GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
                    <span>GitHub Issue</span>
                  </h4>

                  {selectedTask.githubIssueNumber ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-400">#{selectedTask.githubIssueNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-mono border font-bold ${
                          selectedTask.githubIssueState === 'closed'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {selectedTask.githubIssueState || 'open'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <a
                          href={selectedTask.githubIssueUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full block py-1 px-2 rounded bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold text-center cursor-pointer transition-all"
                        >
                          {lang === 'ru' ? 'Открыть в браузере' : lang === 'uk' ? 'Відкрити у браузері' : 'Open in Browser'}
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.api || !window.api.github) return;
                            try {
                              const res = await window.api.github.getIssue(linkedProject!.githubOwner!, linkedProject!.githubRepo!, selectedTask.githubIssueNumber!);
                              if (res.success && res.issue) {
                                updateTask({
                                  ...selectedTask,
                                  githubIssueState: res.issue.state
                                }, 'Refreshed GitHub issue status');
                                showToast(lang === 'ru' ? 'Статус обновлен!' : lang === 'uk' ? 'Статус оновлено!' : 'Issue status updated!', 'success');
                              } else {
                                showToast(res.error || 'Failed to refresh issue status', 'error');
                              }
                            } catch (e: any) {
                              showToast(e.message, 'error');
                            }
                          }}
                          className="w-full py-1 px-2 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[10px] text-slate-300 text-center cursor-pointer transition-all"
                        >
                          {lang === 'ru' ? 'Обновить статус' : lang === 'uk' ? 'Оновити статус' : 'Refresh Status'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {lang === 'ru' ? 'Эта задача не связана с задачей GitHub.' : lang === 'uk' ? 'Це завдання не пов\'язане із завданням GitHub.' : 'This task is not linked to a GitHub issue.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleCreateGitHubIssue}
                        disabled={isCreatingIssue}
                        className="w-full py-1.5 px-3 rounded-lg btn-accent-soft text-[10px] font-semibold text-center cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreatingIssue
                          ? (lang === 'ru' ? 'Создание...' : lang === 'uk' ? 'Створення...' : 'Creating...')
                          : (lang === 'ru' ? 'Создать GitHub Issue' : lang === 'uk' ? 'Створити GitHub Issue' : 'Create GitHub Issue')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Priority selection row */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{getTranslation(lang, 'priorityLevel')}</label>
              <div className="flex flex-wrap gap-1">
                {(['urgent', 'high', 'medium', 'low', 'none'] as TaskPriority[]).map((prio) => {
                  const isCur = selectedTask.priority === prio;
                  const labelValue = getTranslation(lang, `priority${prio.charAt(0).toUpperCase() + prio.slice(1)}` as any);
                  return (
                    <button
                      key={prio}
                      onClick={() => handleFieldChange('priority', prio, `Priority level updated to ${labelValue}`)}
                      className={`py-1 px-2 text-[9px] uppercase font-mono rounded border transition-all cursor-pointer ${
                        isCur 
                          ? resolvePriorityColor(prio) + ' border-transparent font-bold scale-105' 
                          : 'bg-black/35 text-slate-500 border-white/5 hover:text-slate-300'
                      }`}
                    >
                      {labelValue}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Simple scratch notes separate area */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-400 pb-1.5 border-b border-white/5">{getTranslation(lang, 'developerNotes')}</h3>
            <textarea
              rows={4}
              placeholder={getTranslation(lang, 'developerNotesPlaceholder')}
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              onBlur={() => {
                if (editedNotes !== (selectedTask.notes || '')) {
                  updateTask({
                    ...selectedTask,
                    notes: editedNotes
                  }, 'Updated developer notes');
                }
              }}
              className="w-full p-2.5 rounded-xl border border-white/5 glass-input accent-focus font-mono"
            />
          </div>

          {/* Core history audits */}
          <div className="space-y-3.5 select-none">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-400 pb-1.5 border-b border-white/5">{getTranslation(lang, 'historyTitle')}</h3>
            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {(selectedTask.history || []).map((h) => (
                <div key={h.id} className="flex gap-2.5">
                  <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <div>
                    <div className="text-[10px] text-slate-200 leading-snug">{h.details}</div>
                    <div className="text-[8px] font-mono text-slate-500 mt-0.5">
                      {new Date(h.timestamp).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
