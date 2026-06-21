import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useStore } from '../store';

export const GitHubSettings: React.FC = () => {
  const { settings, showToast } = useStore();
  const lang = settings.language;

  const [isConnected, setIsConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string; avatarUrl: string; scopes: string[] } | null>(null);
  
  const [tokenInput, setTokenInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const t = {
    en: {
      title: 'GitHub Integration',
      desc: 'Link your GitHub account to sync project repositories, import issues as tasks, and publish releases directly.',
      patLabel: 'Enter GitHub Token',
      patPlaceholder: 'Paste your GitHub token here...',
      createTokenBtn: 'Create GitHub Token',
      connectBtn: 'Connect GitHub',
      disconnectBtn: 'Disconnect',
      refreshBtn: 'Refresh Status',
      statusConnected: 'Connected',
      statusOffline: 'Connected (Offline)',
      scopesLabel: 'Granted Scopes:',
      infoText: 'Your token is securely encrypted using Electron safeStorage and stored in the local SQLite database. It is never logged and never exposed directly to the renderer process.',
      reqScopes: 'Required scopes: repo, read:user, workflow.',
      connecting: 'Connecting...',
      disconnecting: 'Disconnecting...',
      successConnect: 'GitHub account connected successfully!',
      successDisconnect: 'GitHub account disconnected.',
      emptyToken: 'Please enter a personal access token.',
      scopesWarning: 'Warning: Missing some recommended scopes (repo, read:user, workflow).'
    },
    ru: {
      title: 'Интеграция с GitHub',
      desc: 'Подключите ваш аккаунт GitHub для связывания проектов, автоматического импорта задач и публикации релизов.',
      patLabel: 'Вставьте GitHub Token',
      patPlaceholder: 'Вставьте ваш GitHub токен...',
      createTokenBtn: 'Создать GitHub токен',
      connectBtn: 'Подключить GitHub',
      disconnectBtn: 'Отключить',
      refreshBtn: 'Обновить статус',
      statusConnected: 'Подключено',
      statusOffline: 'Подключено (Офлайн)',
      scopesLabel: 'Предоставленные права:',
      infoText: 'Токен надежно шифруется с помощью Electron safeStorage и сохраняется в локальной базе данных SQLite. Он никогда не записывается в логи.',
      reqScopes: 'Необходимые права: repo, read:user, workflow.',
      connecting: 'Подключение...',
      disconnecting: 'Отключение...',
      successConnect: 'Аккаунт GitHub успешно подключен!',
      successDisconnect: 'Аккаунт GitHub отключен.',
      emptyToken: 'Пожалуйста, введите токен доступа.',
      scopesWarning: 'Внимание: Отсутствуют некоторые рекомендуемые права (repo, read:user, workflow).'
    },
    uk: {
      title: 'Інтеграція з GitHub',
      desc: 'Підключіть ваш акаунт GitHub для зв\'язку проектів, автоматичного імпорту завдань та публікації релізів.',
      patLabel: 'Вставте GitHub Token',
      patPlaceholder: 'Вставте ваш GitHub токен...',
      createTokenBtn: 'Створити GitHub токен',
      connectBtn: 'Підключити GitHub',
      disconnectBtn: 'Відключити',
      refreshBtn: 'Оновити статус',
      statusConnected: 'Підключено',
      statusOffline: 'Підключено (Офлайн)',
      scopesLabel: 'Надані права:',
      infoText: 'Токен надійно шифрується за допомогою Electron safeStorage і зберігається в локальній базі даних SQLite. Він ніколи не записується в логи.',
      reqScopes: 'Необхідні права: repo, read:user, workflow.',
      connecting: 'Підключення...',
      disconnecting: 'Відключення...',
      successConnect: 'Акаунт GitHub успішно підключено!',
      successDisconnect: 'Акаунт GitHub відключено.',
      emptyToken: 'Будь ласка, введіть токен доступу.',
      scopesWarning: 'Увага: Відсутні деякі рекомендовані права (repo, read:user, workflow).'
    }
  }[lang === 'ru' || lang === 'uk' ? lang : 'en'];

  const checkStatus = async () => {
    if (!window.api || !window.api.github) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await window.api.github.getStatus();
      if (res.connected) {
        setIsConnected(true);
        setIsOnline(!!res.online);
        setUser(res.user || null);
      } else {
        setIsConnected(false);
        setUser(null);
      }
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      showToast(t.emptyToken, 'error');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await window.api!.github.connect(tokenInput.trim());
      if (res.success && res.user) {
        setIsConnected(true);
        setIsOnline(true);
        setUser(res.user);
        setTokenInput('');
        showToast(t.successConnect, 'success');
        
        // Verify scopes
        const hasRepo = res.user.scopes.includes('repo');
        const hasReadUser = res.user.scopes.includes('read:user') || res.user.scopes.includes('user');
        const hasWorkflow = res.user.scopes.includes('workflow');
        if (!hasRepo || !hasReadUser || !hasWorkflow) {
          showToast(t.scopesWarning, 'info');
        }
      } else {
        setErrorMessage(res.error || 'Failed to connect');
        showToast(res.error || 'Failed to connect', 'error');
      }
    } catch (e: any) {
      setErrorMessage(e.message);
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const res = await window.api!.github.disconnect();
      if (res.success) {
        setIsConnected(false);
        setUser(null);
        showToast(t.successDisconnect, 'info');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-white/10 glass-panel space-y-5 select-none text-white">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Icons.Github className="w-5 h-5 text-indigo-400 shrink-0" />
          <h2 className="text-sm font-bold tracking-tight">{t.title}</h2>
        </div>

        {isConnected && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isOnline 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            {isOnline ? t.statusConnected : t.statusOffline}
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">{t.desc}</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Icons.Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : isConnected && user ? (
        <div className="space-y-4">
          {/* User profile details layout */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-black/25">
            <img 
              src={user.avatarUrl} 
              alt={user.username} 
              className="w-12 h-12 rounded-full border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
            />
            <div className="space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{user.username}</span>
                <a 
                  href={`https://github.com/${user.username}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Icons.ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Icons.Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.scopesLabel} {user.scopes.length > 0 ? user.scopes.join(', ') : 'none'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={checkStatus}
              className="py-1.5 px-3 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white font-bold flex items-center gap-1.5 cursor-pointer transition-all text-xs"
            >
              <Icons.RefreshCw className="w-3.5 h-3.5" />
              <span>{t.refreshBtn}</span>
            </button>
            <button
              onClick={handleDisconnect}
              className="py-1.5 px-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold flex items-center gap-1.5 cursor-pointer transition-all text-xs"
            >
              <Icons.LogOut className="w-3.5 h-3.5" />
              <span>{t.disconnectBtn}</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="flex justify-start">
            <a
              href="https://github.com/settings/tokens/new?description=Flux%20Tasks&scopes=repo,read:user,workflow"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg border border-indigo-500/25 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-bold text-xs transition-all cursor-pointer select-none"
            >
              <Icons.ExternalLink className="w-3.5 h-3.5" />
              <span>{t.createTokenBtn}</span>
            </a>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 font-semibold uppercase">{t.patLabel}</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder={t.patPlaceholder}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full py-2 pl-9.5 pr-3.5 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-500 focus:outline-none focus:border-flux-azure focus:ring-1 focus:ring-flux-azure/30"
              />
              <Icons.Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
            </div>
            <div className="text-[10px] text-slate-500 leading-normal">{t.reqScopes}</div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 flex items-center gap-2">
              <Icons.AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="py-2 px-4 rounded-xl bg-gradient-to-r from-flux-blue to-flux-indigo text-white font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-[0_4px_15px_rgba(91,92,255,0.15)] hover:shadow-[0_6px_20px_rgba(91,92,255,0.25)] flex items-center gap-1.5"
          >
            <Icons.CheckCircle className="w-4 h-4" />
            <span>{t.connectBtn}</span>
          </button>
        </form>
      )}

      <div className="p-3 rounded-xl border border-white/5 bg-black/10 text-[10px] text-slate-500 flex items-start gap-2">
        <Icons.Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">{t.infoText}</span>
      </div>
    </div>
  );
};
