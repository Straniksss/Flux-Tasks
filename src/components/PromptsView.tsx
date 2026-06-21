import React, { useState } from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';
import { PromptItem } from '../types';

export const PromptsView: React.FC = () => {
  const {
    prompts,
    addPrompt,
    updatePrompt,
    deletePrompt,
    settings
  } = useStore();

  const lang = settings.language;
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpenAdd, setIsOpenAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newProvider, setNewProvider] = useState<'chatgpt' | 'gemini' | 'claude' | 'custom'>('gemini');
  const [newContent, setNewContent] = useState('');
  const [newTagsStr, setNewTagsStr] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editProvider, setEditProvider] = useState<'chatgpt' | 'gemini' | 'claude' | 'custom'>('gemini');
  const [editContent, setEditContent] = useState('');
  const [editTagsStr, setEditTagsStr] = useState('');

  // Copy feedback map
  const [copyFeedbackMap, setCopyFeedbackMap] = useState<Record<string, boolean>>({});

  const handleCreatePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const tagsList = newTagsStr.split(',').map(t => t.trim()).filter(Boolean);
    addPrompt(newTitle.trim(), newDesc.trim(), newContent.trim(), newProvider, tagsList);
    setNewTitle('');
    setNewDesc('');
    setNewContent('');
    setNewTagsStr('');
    setNewProvider('gemini');
    setIsOpenAdd(false);
  };

  const handleStartEdit = (p: PromptItem) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditDesc(p.description || '');
    setEditProvider(p.provider);
    setEditContent(p.content);
    setEditTagsStr(p.tags ? p.tags.join(', ') : '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim() || !editContent.trim()) return;
    const tagsList = editTagsStr.split(',').map(t => t.trim()).filter(Boolean);
    updatePrompt(id, editTitle.trim(), editDesc.trim(), editContent.trim(), editProvider, tagsList);
    setEditingId(null);
  };

  const handleCopyText = (content: string, elementId: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopyFeedbackMap(prev => ({ ...prev, [elementId]: true }));
      setTimeout(() => {
        setCopyFeedbackMap(prev => ({ ...prev, [elementId]: false }));
      }, 1500);
    });
  };

  const filteredPrompts = prompts.filter(p => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      p.title.toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query) ||
      (p.tags || []).some(t => t.toLowerCase().includes(query))
    );
  });

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'gemini': return 'text-sky-400 bg-sky-500/10 border-sky-400/20';
      case 'chatgpt': return 'text-emerald-400 bg-emerald-500/10 border-emerald-400/20';
      case 'claude': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gemini': return <Icons.Sparkles className="w-3.5 h-3.5" />;
      case 'chatgpt': return <Icons.Compass className="w-3.5 h-3.5" />;
      case 'claude': return <Icons.Cpu className="w-3.5 h-3.5" />;
      default: return <Icons.Terminal className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      
      {/* View Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-white tracking-tight flex items-center gap-2">
            <Icons.Cpu className="w-5 h-5 text-indigo-400" />
            <span>🤖 {lang === 'ru' ? 'Библиотека промптов' : lang === 'uk' ? 'Бібліотека промптів' : 'AI Prompt Library'}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {lang === 'ru' ? 'Управляйте вашими шаблонами запросов для нейросетей.' : 
             lang === 'uk' ? 'Керуйте вашими шаблонами запитів для нейромереж.' : 
             'Manage and copy your neural networks query templates.'}
          </p>
        </div>

        <button
          onClick={() => setIsOpenAdd(!isOpenAdd)}
          className="py-1.5 px-3 rounded-lg border btn-secondary font-mono text-xs flex items-center gap-1 text-slate-300 cursor-pointer"
        >
          <Icons.Plus className="w-3.5 h-3.5" />
          <span>{lang === 'ru' ? 'Добавить промпт' : lang === 'uk' ? 'Додати промпт' : 'New Prompt'}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'ru' ? 'Поиск промптов по названию, тексту...' : lang === 'uk' ? 'Пошук промптів за назвою, текстом...' : 'Search prompts...'}
          className="w-full py-1.5 pl-9 pr-4 rounded-xl border border-white/5 glass-input focus:border-indigo-400 px-3 py-1.5"
        />
        {searchQuery && (
          <Icons.X 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 hover:text-white cursor-pointer"
          />
        )}
      </div>

      {/* Add Prompt Form */}
      {isOpenAdd && (
        <form onSubmit={handleCreatePrompt} className="p-4 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md space-y-3 max-w-2xl">
          <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            {lang === 'ru' ? 'Создать новый промпт' : lang === 'uk' ? 'Створити новий промпт' : 'Create New Prompt'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder={lang === 'ru' ? 'Название промпта...' : lang === 'uk' ? 'Назва промпту...' : 'Prompt name...'}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="md:col-span-2 py-1.5 px-2.5 rounded-lg border border-white/5 glass-input focus:border-indigo-500"
            />
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value as any)}
              className="py-1.5 px-2.5 rounded-lg border border-white/5 bg-black/45 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="gemini">Google Gemini</option>
              <option value="chatgpt">OpenAI ChatGPT</option>
              <option value="claude">Anthropic Claude</option>
              <option value="custom">Custom System</option>
            </select>
          </div>
          <input
            type="text"
            placeholder={lang === 'ru' ? 'Описание (назначение промпта)...' : lang === 'uk' ? 'Опис (призначення промпту)...' : 'Description (what it does)...'}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full py-1.5 px-2.5 rounded-lg border border-white/5 glass-input focus:border-indigo-500"
          />
          <input
            type="text"
            placeholder={lang === 'ru' ? 'Теги (через запятую)...' : lang === 'uk' ? 'Теги (через кому)...' : 'Tags (comma separated)...'}
            value={newTagsStr}
            onChange={(e) => setNewTagsStr(e.target.value)}
            className="w-full py-1.5 px-2.5 rounded-lg border border-white/5 glass-input focus:border-indigo-500"
          />
          <textarea
            required
            placeholder={lang === 'ru' ? 'Текст запроса...' : lang === 'uk' ? 'Текст запиту...' : 'Write the prompt query text here...'}
            rows={4}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-white/5 glass-input focus:border-indigo-500 font-mono"
          />
          <div className="flex justify-end gap-2 text-xs">
            <button type="button" onClick={() => setIsOpenAdd(false)} className="px-3 py-1 text-slate-400 hover:text-white">{getTranslation(lang, 'cancel')}</button>
            <button type="submit" className="px-4 py-1.5 rounded-lg font-bold btn-primary text-white">{lang === 'ru' ? 'Добавить' : lang === 'uk' ? 'Додати' : 'Create'}</button>
          </div>
        </form>
      )}

      {/* Grid of prompts cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
        {filteredPrompts.map((p) => {
          const isEditing = editingId === p.id;
          const hasCopied = copyFeedbackMap[p.id] || false;

          return (
            <div key={p.id} className="rounded-xl border border-white/5 bg-slate-950/20 backdrop-blur-md p-4 flex flex-col justify-between gap-4 transition-all hover:border-white/10 hover:bg-slate-950/30">
              
              {isEditing ? (
                <div className="space-y-3 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="md:col-span-2 py-1 px-2 rounded border border-white/10 bg-slate-900 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={editProvider}
                      onChange={(e) => setEditProvider(e.target.value as any)}
                      className="py-1 px-2 rounded border border-white/10 bg-slate-900 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    >
                      <option value="gemini">Gemini</option>
                      <option value="chatgpt">ChatGPT</option>
                      <option value="claude">Claude</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full py-1 px-2 rounded border border-white/10 bg-slate-900 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Description..."
                  />
                  <input
                    type="text"
                    value={editTagsStr}
                    onChange={(e) => setEditTagsStr(e.target.value)}
                    className="w-full py-1 px-2 rounded border border-white/10 bg-slate-900 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Tags (comma separated)..."
                  />
                  <textarea
                    required
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 rounded border border-white/10 bg-slate-900 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="flex justify-end gap-1 text-[10px]">
                    <button onClick={() => setEditingId(null)} className="px-2 py-0.5 rounded bg-white/5 text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={() => handleSaveEdit(p.id)} className="px-2.5 py-0.5 rounded btn-primary text-white">Save</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${getProviderColor(p.provider)}`}>
                        {getProviderIcon(p.provider)}
                        <span>{p.provider.toUpperCase()}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Icons.FilePen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePrompt(p.id)}
                          className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Icons.Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-white leading-tight">{p.title}</h3>
                    {p.description && (
                      <p className="text-[11px] text-slate-400 italic leading-relaxed">{p.description}</p>
                    )}
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.tags.map(t => (
                          <span key={t} className="text-[9px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/10">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative rounded-lg border border-white/5 bg-black/35 p-3 font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed scrollbar-thin">
                    {p.content}
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <span className="text-[9px] text-slate-500">Flux Prompt Engine v1</span>
                    <button
                      onClick={() => handleCopyText(p.content, p.id)}
                      className={`py-1 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        hasCopied 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-300'
                      }`}
                    >
                      {hasCopied ? (
                        <>
                          <Icons.Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{lang === 'ru' ? 'Скопировано!' : lang === 'uk' ? 'Скопійовано!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Icons.Copy className="w-3.5 h-3.5" />
                          <span>{lang === 'ru' ? 'Копировать' : lang === 'uk' ? 'Копіювати' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredPrompts.length === 0 && (
          <div className="col-span-full text-center py-10 border border-dashed border-white/5 rounded-xl text-slate-500 text-xs">
            {lang === 'ru' ? 'Промпты не найдены.' : lang === 'uk' ? 'Промпти не знайдені.' : 'No AI Prompts found.'}
          </div>
        )}
      </div>

    </div>
  );
};
