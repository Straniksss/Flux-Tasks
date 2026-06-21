import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useStore } from '../store';

interface GitHubReleasesViewProps {
  projectId: string;
}

export const GitHubReleasesView: React.FC<GitHubReleasesViewProps> = ({ projectId }) => {
  const { projects, settings, showToast } = useStore();
  const lang = settings.language;
  const project = projects.find(p => p.id === projectId);

  const [releases, setReleases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [isGitHubOnline, setIsGitHubOnline] = useState(false);

  const t = {
    en: {
      releasesTitle: 'GitHub Releases',
      noLink: 'Please link this project to a GitHub repository to view releases.',
      notConnected: 'GitHub is not connected in Settings.',
      offline: 'GitHub service is currently offline or unreachable.',
      refreshBtn: 'Refresh',
      publishedAt: 'Published',
      draftBadge: 'Draft',
      prereleaseBadge: 'Prerelease',
      noReleases: 'No releases found on GitHub for this repository.',
      assetsHeader: 'Release Assets',
      downloadCount: 'downloads',
      stable: 'Stable Release',
      beta: 'Beta update',
      alpha: 'Alpha experiment',
      rc: 'Release Candidate',
      openBrowser: 'Open in Browser'
    },
    ru: {
      releasesTitle: 'GitHub Релизы',
      noLink: 'Пожалуйста, свяжите этот проект с репозиторием GitHub для просмотра релизов.',
      notConnected: 'GitHub не подключен в настройках.',
      offline: 'Сервис GitHub в данный момент офлайн или недоступен.',
      refreshBtn: 'Обновить',
      publishedAt: 'Опубликовано',
      draftBadge: 'Черновик',
      prereleaseBadge: 'Предварительный',
      noReleases: 'Релизов репозитория на GitHub не найдено.',
      assetsHeader: 'Файлы релиза (Assets)',
      downloadCount: 'скачиваний',
      stable: 'Стабильный релиз',
      beta: 'Бета-версия',
      alpha: 'Альфа-версия',
      rc: 'Кандидат на релиз (RC)',
      openBrowser: 'Открыть в браузере'
    },
    uk: {
      releasesTitle: 'GitHub Релізи',
      noLink: 'Будь ласка, зв\'яжіть цей проект з репозиторієм GitHub для перегляду релізів.',
      notConnected: 'GitHub не підключено в налаштуваннях.',
      offline: 'Сервіс GitHub в даний момент офлайн або недоступний.',
      refreshBtn: 'Оновити',
      publishedAt: 'Опубліковано',
      draftBadge: 'Чернетка',
      prereleaseBadge: 'Попередній',
      noReleases: 'Релізів репозиторію на GitHub не знайдено.',
      assetsHeader: 'Файли релізу (Assets)',
      downloadCount: 'завантажень',
      stable: 'Стабільний реліз',
      beta: 'Бета-версія',
      alpha: 'Альфа-версія',
      rc: 'Кандидат на реліз (RC)',
      openBrowser: 'Відкрити в браузері'
    }
  }[lang === 'ru' || lang === 'uk' ? lang : 'en'];

  useEffect(() => {
    const getGithubStatus = async () => {
      if (window.api && window.api.github) {
        try {
          const res = await window.api.github.getStatus();
          setIsGitHubConnected(res.connected);
          setIsGitHubOnline(!!res.online);
        } catch (e) {}
      }
    };
    getGithubStatus();
  }, [projectId]);

  const loadReleases = async () => {
    if (!project?.githubOwner || !project?.githubRepo || !window.api) return;
    setIsLoading(true);
    try {
      const res = await window.api.github.getReleases(project.githubOwner, project.githubRepo);
      if (res.success && res.releases) {
        setReleases(res.releases);
      } else {
        showToast(res.error || 'Failed to fetch releases', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isGitHubConnected && isGitHubOnline && project?.githubOwner && project?.githubRepo) {
      loadReleases();
    }
  }, [projectId, isGitHubConnected, isGitHubOnline]);

  if (!project) return null;

  const isLinked = !!(project.githubOwner && project.githubRepo);

  if (!isLinked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none space-y-4">
        <Icons.Rocket className="w-16 h-16 text-slate-500/40 animate-bounce" style={{ animationDuration: '3s' }} />
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-semibold text-slate-300">{t.noLink}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-display font-semibold text-white tracking-tight flex items-center gap-2">
            <Icons.Rocket className="w-5 h-5 text-purple-400" />
            <span>{t.releasesTitle} — {project.name}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {project.githubOwner}/{project.githubRepo}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadReleases}
            className="py-1.5 px-3 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Icons.RefreshCw className="w-3.5 h-3.5" />
            <span>{t.refreshBtn}</span>
          </button>
        </div>
      </div>

      {/* Connection warnings */}
      {!isGitHubConnected && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
          <Icons.AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t.notConnected}</span>
        </div>
      )}

      {isGitHubConnected && !isGitHubOnline && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
          <Icons.WifiOff className="w-4 h-4 shrink-0" />
          <span>{t.offline}</span>
        </div>
      )}

      {/* Releases List rendering */}
      {isGitHubConnected && isGitHubOnline && (
        isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Icons.Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : releases.length > 0 ? (
          <div className="space-y-4">
            {releases.map(rel => (
              <div key={rel.id} className="glass-card p-5 space-y-4 border border-white/5 relative overflow-hidden group">
                {/* Background light glow for visual hierarchy */}
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 transition-transform group-hover:scale-125" style={{ backgroundColor: rel.prerelease ? '#c084fc' : '#34d399' }} />

                <div className="flex items-start justify-between flex-wrap gap-4 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-sky-400">{rel.tagName}</span>
                      
                      {/* Draft badge status */}
                      {rel.draft && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          {t.draftBadge}
                        </span>
                      )}

                      {/* Prerelease badge status */}
                      {rel.prerelease && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase bg-purple-500/10 border border-purple-500/20 text-purple-400">
                          {t.prereleaseBadge}
                        </span>
                      )}

                      {!rel.draft && !rel.prerelease && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          Latest Stable
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">{rel.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <a 
                      href={rel.htmlUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-2 rounded-lg border border-white/5 bg-white/5 text-slate-400 hover:text-white transition-colors"
                      title={t.openBrowser}
                    >
                      <Icons.ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Body changelog notes */}
                {rel.body && (
                  <div className="text-xs text-slate-400 leading-relaxed font-mono whitespace-pre-wrap p-3 rounded-xl bg-black/20 border border-white/5 max-h-48 overflow-y-auto scrollbar-thin select-text">
                    {rel.body}
                  </div>
                )}

                {/* List of uploaded release assets */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Icons.File className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t.assetsHeader} ({rel.assets.length})</span>
                  </div>

                  {rel.assets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                      {rel.assets.map((asset: any) => (
                        <div key={asset.id} className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-white/[0.01] font-mono">
                          <span className="text-slate-300 truncate mr-2" title={asset.name}>{asset.name}</span>
                          <span className="text-slate-500 shrink-0">
                            {((asset.size || 0) / (1024 * 1024)).toFixed(2)} MB • {asset.downloadCount} {t.downloadCount}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-600 italic text-[10px]">{lang === 'ru' ? 'Нет прикрепленных файлов' : 'No assets uploaded.'}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500 text-xs">
            {t.noReleases}
          </div>
        )
      )}

    </div>
  );
};
