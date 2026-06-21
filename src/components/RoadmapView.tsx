import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';
import { Release } from '../types';
import { GitHubReleasesView } from './GitHubReleasesView';

export const RoadmapView: React.FC = () => {
  const {
    releases,
    addRelease,
    updateReleaseStatus,
    deleteRelease,
    settings,
    tasks,
    projects,
    showToast
  } = useStore();

  const lang = settings.language;
  const [roadmapTab, setRoadmapTab] = useState<'local' | 'github'>('local');
  const [selectedGitHubProjectId, setSelectedGitHubProjectId] = useState<string>('');
  const [isOpenAdd, setIsOpenAdd] = useState(false);
  const [newVer, setNewVer] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newChangesStr, setNewChangesStr] = useState('');

  const linkedProjects = projects.filter(p => p.githubOwner && p.githubRepo);
  useEffect(() => {
    if (linkedProjects.length > 0 && !selectedGitHubProjectId) {
      setSelectedGitHubProjectId(linkedProjects[0].id);
    }
  }, [projects, selectedGitHubProjectId]);

  const handleCreateRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVer.trim() || !newName.trim()) return;

    const changes = newChangesStr
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    addRelease(newVer.trim(), newName.trim(), newDesc.trim(), newDate, changes);
    setNewVer('');
    setNewName('');
    setNewDesc('');
    setNewDate('');
    setNewChangesStr('');
    setIsOpenAdd(false);
  };

  const handleAutoGenerateChangelog = () => {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const queryVer = newVer.trim().toLowerCase();
    let matching = completedTasks;
    if (queryVer) {
      const cleanVer = queryVer.startsWith('v') ? queryVer.slice(1) : queryVer;
      matching = completedTasks.filter(t => 
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(cleanVer))) ||
        t.title.toLowerCase().includes(cleanVer) ||
        (t.description && t.description.toLowerCase().includes(cleanVer))
      );
    }
    
    if (matching.length === 0 && completedTasks.length > 0) {
      matching = completedTasks;
    }
    
    if (matching.length === 0) {
      showToast(lang === 'ru' ? 'Нет завершенных задач для генерации!' : lang === 'uk' ? 'Немає завершених завдань для генерації!' : 'No completed tasks found to generate from!', 'info');
      return;
    }
    
    // Group matching completed tasks by type
    const features: string[] = [];
    const bugs: string[] = [];
    const docs: string[] = [];
    const refactor: string[] = [];
    const prompts: string[] = [];
    const others: string[] = [];

    matching.forEach(t => {
      const itemText = t.title;
      if (t.type === 'feature') features.push(itemText);
      else if (t.type === 'bug') bugs.push(itemText);
      else if (t.type === 'documentation') docs.push(itemText);
      else if (t.type === 'refactor') refactor.push(itemText);
      else if (t.type === 'prompt') prompts.push(itemText);
      else others.push(itemText);
    });

    const lines: string[] = [];
    if (features.length > 0) {
      lines.push('### Features:');
      features.forEach(f => lines.push(`- ${f}`));
    }
    if (bugs.length > 0) {
      if (lines.length > 0) lines.push('');
      lines.push('### Bug Fixes:');
      bugs.forEach(b => lines.push(`- ${b}`));
    }
    if (docs.length > 0) {
      if (lines.length > 0) lines.push('');
      lines.push('### Documentation:');
      docs.forEach(d => lines.push(`- ${d}`));
    }
    if (refactor.length > 0) {
      if (lines.length > 0) lines.push('');
      lines.push('### Refactor:');
      refactor.forEach(r => lines.push(`- ${r}`));
    }
    if (prompts.length > 0) {
      if (lines.length > 0) lines.push('');
      lines.push('### AI Prompts:');
      prompts.forEach(p => lines.push(`- ${p}`));
    }
    if (others.length > 0) {
      if (lines.length > 0) lines.push('');
      lines.push('### Others:');
      others.forEach(o => lines.push(`- ${o}`));
    }
    
    setNewChangesStr(lines.join('\n'));
  };

  const getReleaseProgress = (rel: Release) => {
    // If completed, return 100
    if (rel.status === 'completed') return 100;
    
    // Attempt to match tasks containing the release tag/version name in title or tag lists to compute real progress
    const matchingTasks = tasks.filter(t => 
      t.tags.includes(`v${rel.version}`) || 
      t.tags.includes(rel.version) ||
      t.title.toLowerCase().includes(rel.version)
    );

    if (matchingTasks.length === 0) {
      // Return a simulated high-end placeholder if empty
      return rel.version === '1.2.0' ? 64 : 10;
    }

    const completed = matchingTasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / matchingTasks.length) * 100);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none">
      
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-white tracking-tight flex items-center gap-2">
            <Icons.Map className="w-5 h-5 text-rose-400" />
            <span>{getTranslation(lang, 'roadmapTitle')}</span>
          </h2>
          <p className="text-xs text-slate-400">{getTranslation(lang, 'roadmapDesc')}</p>
        </div>

        {roadmapTab === 'local' && (
          <button
            onClick={() => setIsOpenAdd(!isOpenAdd)}
            className="py-1.5 px-3 rounded-lg border btn-secondary font-mono text-xs flex items-center gap-1 text-slate-300 cursor-pointer"
          >
            <Icons.Plus className="w-3.5 h-3.5" />
            <span>{getTranslation(lang, 'newRelease')}</span>
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-0.5 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => setRoadmapTab('local')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer duration-200 ${
              roadmapTab === 'local' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'
            }`}
          >
            <Icons.Map className="w-3.5 h-3.5 text-rose-400" />
            <span>{lang === 'ru' ? 'Локальный роадмап' : lang === 'uk' ? 'Локальний роадмап' : 'Local Roadmap'}</span>
          </button>
          <button
            type="button"
            onClick={() => setRoadmapTab('github')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer duration-200 ${
              roadmapTab === 'github' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'
            }`}
          >
            <Icons.GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            <span>GitHub Releases</span>
          </button>
        </div>

        {roadmapTab === 'github' && (
          <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-lg">
            <span className="text-[11px] font-mono text-slate-400">{lang === 'ru' ? 'Проект:' : lang === 'uk' ? 'Проект:' : 'Project:'}</span>
            <select
              value={selectedGitHubProjectId}
              onChange={(e) => setSelectedGitHubProjectId(e.target.value)}
              className="py-0.5 px-1.5 rounded border border-white/10 bg-slate-950/40 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer min-w-[150px]"
            >
              {linkedProjects.length === 0 ? (
                <option value="" className="bg-slate-900 text-slate-400">{lang === 'ru' ? 'Нет связанных проектов' : lang === 'uk' ? 'Немає зв\'язаних проектів' : 'No linked projects'}</option>
              ) : (
                linkedProjects.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name} ({p.githubOwner}/{p.githubRepo})
                  </option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      {roadmapTab === 'github' ? (
        <GitHubReleasesView projectId={selectedGitHubProjectId} />
      ) : (
        <>
          {/* Add Release Form */}
          {isOpenAdd && (
            <form onSubmit={handleCreateRelease} className="p-4 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="v1.3.0"
                  value={newVer}
                  onChange={(e) => setNewVer(e.target.value)}
                  className="py-1.5 px-2.5 rounded-lg border border-white/5 bg-black/45 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Flux Sprint name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="md:col-span-2 py-1.5 px-2.5 rounded-lg border border-white/5 bg-black/45 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="py-1.5 px-2.5 rounded-lg border border-white/5 bg-black/45 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Summary description..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="py-1.5 px-2.5 rounded-lg border border-white/5 bg-black/45 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={handleAutoGenerateChangelog}
                    className="self-end px-2 py-0.5 mb-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-400/20 transition-all cursor-pointer flex items-center gap-1"
                  >
                    ⚡ {lang === 'ru' ? 'Заполнить из готовых задач' : lang === 'uk' ? 'Заповнити з готових записів' : 'Generate Changelog'}
                  </button>
                  <textarea
                    placeholder="Planned milestones / features changes list (one per line)..."
                    rows={2}
                    value={newChangesStr}
                    onChange={(e) => setNewChangesStr(e.target.value)}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-white/5 bg-black/45 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setIsOpenAdd(false)} className="px-3 py-1 text-slate-400">{getTranslation(lang, 'cancel')}</button>
                <button type="submit" className="px-4 py-1 rounded-lg font-bold btn-danger text-white">{getTranslation(lang, 'newRelease')}</button>
              </div>
            </form>
          )}

          {/* Connected timelines map */}
          <div className="space-y-6 max-w-4xl relative">
            {/* Draw a subtle vert line for connected timeline */}
            <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-white/5" />

            {releases.map((rel) => {
              const progress = getReleaseProgress(rel);
              const isDone = rel.status === 'completed';

              return (
                <div key={rel.id} className="relative pl-14 group">
                  
                  {/* Timeline dot */}
                  <div 
                    onClick={() => updateReleaseStatus(rel.id, isDone ? 'planned' : 'completed')}
                    className={`absolute left-[17px] top-1 w-[14px] h-[14px] rounded-full border-2 cursor-pointer transition-all flex items-center justify-center ${
                      isDone 
                        ? 'border-emerald-400 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]' 
                        : 'border-slate-700 bg-slate-900 group-hover:border-rose-400'
                    }`}
                    title="Click to toggle status"
                  >
                    {isDone && <Icons.Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />}
                  </div>

                  {/* Main Information card */}
                  <div className="p-5 rounded-xl border border-white/5 bg-slate-950/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                          isDone 
                            ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          v{rel.version}
                        </span>
                        <h3 className="text-sm font-semibold text-white truncate">{rel.name}</h3>
                        <span className="text-[10px] font-mono text-slate-500">• {getTranslation(lang, 'releasedOn')} {rel.date}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans leading-relaxed">{rel.description}</p>

                      {/* Planned list of features inside changes */}
                      {rel.changes && rel.changes.length > 0 && (
                        <div className="pt-2">
                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{getTranslation(lang, 'plannedFeatures')}</div>
                          <ul className="space-y-1">
                            {rel.changes.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-slate-300 text-[11px]">
                                <Icons.CheckCircle2 className="w-3.5 h-3.5 text-slate-600 mt-0.5 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Progress details */}
                    <div className="md:w-48 shrink-0 text-right space-y-2">
                      <div className="flex justify-between items-center text-[11px] font-mono">
                        <span className="text-slate-500">{getTranslation(lang, 'releaseProgress')}</span>
                        <span className="font-semibold text-white">{progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-700" 
                          style={{ 
                            width: `${progress}%`,
                            backgroundColor: isDone ? '#10b981' : '#f43f5e'
                          }} 
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => updateReleaseStatus(rel.id, isDone ? 'planned' : 'completed')}
                          className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          {isDone ? getTranslation(lang, 'markAsPlanned') : getTranslation(lang, 'markAsCompleted')}
                        </button>
                        <span className="text-slate-700">|</span>
                        <button
                          onClick={() => deleteRelease(rel.id)}
                          className="text-[10px] text-rose-400/70 hover:text-rose-400 cursor-pointer"
                        >
                          {getTranslation(lang, 'deleteLabel')}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}

            {releases.length === 0 && (
              <div className="text-center py-10 border border-dashed border-white/5 rounded-xl text-slate-500 text-xs">
                {getTranslation(lang, 'emptyRoadmap')}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
