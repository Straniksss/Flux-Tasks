import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';
import { GlassPreset, BackgroundStyle, AppLanguage } from '../types';
import { GitHubSettings } from './GitHubSettings';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    backups,
    triggerBackup,
    restoreFromBackup,
    deleteBackup,
    cleanAutoBackups,
    resetDatabase,
    loadAllFromDB,
    tasks,
    projects,
    releases,
    notes,
    prompts,
    showToast,
    dbPath
  } = useStore();

  const lang = settings.language;
  const [accentInput, setAccentInput] = useState(settings.accentColor);
  const [restoredFileJson, setRestoredFileJson] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);

  // Version and Rollback states
  const [installedVersion, setInstalledVersion] = useState<string>('');
  const [rollbackInfo, setRollbackInfo] = useState<{ occurred: boolean; error?: string } | null>(null);

  useEffect(() => {
    setAccentInput(settings.accentColor);
  }, [settings.accentColor]);

  useEffect(() => {
    const fetchVersionAndRollback = async () => {
      if (window.api) {
        try {
          if (window.api.app && window.api.app.getVersion) {
            const ver = await window.api.app.getVersion();
            setInstalledVersion(ver);
          } else if (window.api.getCurrentVersion) {
            const ver = await window.api.getCurrentVersion();
            setInstalledVersion(ver);
          }
          if (window.api.checkRollback) {
            const rb = await window.api.checkRollback();
            if (rb.occurred) {
              setRollbackInfo(rb);
            }
          }
        } catch (err) {}
      }
    };
    fetchVersionAndRollback();
  }, []);

  const formatBytes = (bytes: number | undefined) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Update states
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'no-update' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [discoveredManifest, setDiscoveredManifest] = useState<any>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [downloadedPackagePath, setDownloadedPackagePath] = useState<string | null>(null);

  const handleCheckForUpdates = async () => {
    setUpdateStatus('checking');
    setUpdateError(null);
    if (window.api) {
      try {
        const res = await window.api.checkForUpdates(settings.updateChannel || 'stable');
        if (res.error) {
          setUpdateStatus('error');
          setUpdateError(res.error);
        } else if (res.updateAvailable) {
          setUpdateStatus('available');
          setDiscoveredManifest(res.manifest);
        } else {
          setUpdateStatus('no-update');
        }
      } catch (err: any) {
        setUpdateStatus('error');
        setUpdateError(err.message || 'Error occurred');
      }
    }
  };

  const handleDownloadUpdate = async () => {
    if (!discoveredManifest || !window.api) return;
    setUpdateStatus('downloading');
    try {
      const res = await window.api.downloadUpdate(discoveredManifest);
      if (res.success && res.packagePath) {
        setUpdateStatus('downloaded');
        setDownloadedPackagePath(res.packagePath);
      } else {
        setUpdateStatus('error');
        setUpdateError(res.error || 'Download failed');
      }
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateError(err.message || 'Download failed');
    }
  };

  const handleInstallUpdate = async () => {
    if (!downloadedPackagePath || !discoveredManifest || !window.api) return;
    try {
      const isAsarOnly = downloadedPackagePath.endsWith('app.asar');
      await window.api.installUpdate(downloadedPackagePath, isAsarOnly);
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateError(err.message || 'Installation failed');
    }
  };

  const handleDownloadFullInstaller = async () => {
    if (!discoveredManifest || !window.api) return;
    setUpdateStatus('downloading');
    setUpdateError(null);
    try {
      const fullManifest = {
        ...discoveredManifest,
        asarUrl: undefined // delete to force packageUrl exe download
      };
      const res = await window.api.downloadUpdate(fullManifest);
      if (res.success && res.packagePath) {
        setUpdateStatus('downloaded');
        setDownloadedPackagePath(res.packagePath);
      } else {
        setUpdateStatus('error');
        setUpdateError(res.error || 'Download failed');
      }
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateError(err.message || 'Download failed');
    }
  };

  const handleOpenLog = () => {
    if (window.api) {
      window.api.openUpdateLog();
    }
  };

  // Background presets config
  const bgConfigs: { style: BackgroundStyle; labelKey: any; icon: string }[] = [
    { style: 'orbit', labelKey: 'bgOrbit', icon: 'Orbit' },
    { style: 'aurora', labelKey: 'bgAurora', icon: 'Sparkles' },
    { style: 'deep-noir', labelKey: 'bgDeepNoir', icon: 'Moon' },
    { style: 'crystal-lake', labelKey: 'bgCrystalLake', icon: 'Compass' }
  ];

  // Glass Materials presets config
  const glassConfigs: { preset: GlassPreset; labelKey: any; desc: string }[] = [
    { preset: 'crystal', labelKey: 'presetCrystal', desc: '90% Light transmission, thin bright borders' },
    { preset: 'frosted', labelKey: 'presetFrosted', desc: 'Balanced frosted look with blur saturate scale' },
    { preset: 'acrylic', labelKey: 'presetAcrylic', desc: 'Heavy night-tint backdrop, subtle chromatic dust' },
    { preset: 'ultra-blur', labelKey: 'presetUltraBlur', desc: 'Overwhelming frosted fog, soft glow vectors' },
    { preset: 'minimal', labelKey: 'presetMinimal', desc: 'Solid fast performance, classic clear outline' }
  ];

  // Color preset swatches
  const swatchColors = [
    { name: 'emerald', start: '#10b981', end: '#06b6d4', text: 'Flux Emerald' }, // Green-to-Teal
    { name: 'blue', start: '#3b82f6', end: '#8b5cf6', text: 'Arctic Indigo' }, // Blue-to-Purple
    { name: 'purple', start: '#a855f7', end: '#ec4899', text: 'Vapor Fuchsia' }, // Purple-to-Pink
    { name: 'pink', start: '#ec4899', end: '#f43f5e', text: 'Cherry Blossom' }, // Pink-to-Rose
    { name: 'orange', start: '#f97316', end: '#ef4444', text: 'Neon Aurora' }, // Orange-to-Red
    { name: 'teal', start: '#14b8a6', end: '#10b981', text: 'Minty Glass' }, // Teal-to-Green
    { name: 'yellow', start: '#f59e0b', end: '#eab308', text: 'Amber Sun' } // Amber-to-Yellow
  ];

  const handleApplyCustomAccent = (hex: string) => {
    setAccentInput(hex);
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return;

    const normalizedHex = hex.toLowerCase();
    updateSettings('accentColor', normalizedHex);
    // Auto set start-end of gradients matching selected accent for solid look
    updateSettings('gradientStart', normalizedHex);
    updateSettings('gradientEnd', normalizedHex);
  };

  const handleSwatchClick = (preset: typeof swatchColors[0]) => {
    updateSettings('accentColor', preset.start);
    setAccentInput(preset.start);
    updateSettings('gradientStart', preset.start);
    updateSettings('gradientEnd', preset.end);
    // Align glass tinting
    updateSettings('glassTint', preset.name as any);
  };

  const handleImport = async () => {
    if (window.api) {
      try {
        const result = await window.api.importData();
        if (result && result.data) {
          const { tasks: impTasks, projects: impProj, releases: impRel, notes: impNotes, prompts: impPrompts } = result.data;
          
          if (impProj && impProj.length > 0) {
            for (const p of impProj) await window.api.saveProject(p);
          }
          if (impTasks && impTasks.length > 0) {
            for (const t of impTasks) await window.api.saveTask(t);
          }
          if (impNotes && impNotes.length > 0) {
            for (const n of impNotes) await window.api.saveNote(n);
          }
          if (impRel && impRel.length > 0) {
            for (const r of impRel) await window.api.saveRelease(r);
          }
          if (impPrompts && impPrompts.length > 0) {
            for (const p of impPrompts) await window.api.savePrompt(p);
          }

          await loadAllFromDB();
          setRestoreFeedback(lang === 'ru' ? 'Импорт завершен!' : lang === 'uk' ? 'Імпорт завершено!' : 'Import complete!');
          setTimeout(() => setRestoreFeedback(null), 3000);
        }
      } catch (err: any) {
        setRestoreFeedback(`Error: ${err.message}`);
        setTimeout(() => setRestoreFeedback(null), 5000);
      }
    }
  };

  const handleExportData = async (format: 'json' | 'md' | 'html' | 'csv') => {
    if (window.api) {
      const result = await window.api.exportData(format, { tasks, projects, releases, notes, prompts });
      if (result && result.success) {
        setRestoreFeedback(lang === 'ru' ? 'Экспорт выполнен!' : lang === 'uk' ? 'Експорт виконано!' : 'Export successful!');
        setTimeout(() => setRestoreFeedback(null), 3000);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-8 select-none w-full scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      
      {/* Settings Title */}
      <div>
        <h2 className="text-xl font-display font-semibold text-white tracking-tight flex items-center gap-2">
          <Icons.Settings className="w-5 h-5 accent-text animate-spin" style={{ animationDuration: '6s' }} />
          <span>{getTranslation(lang, 'settingsTitle')}</span>
        </h2>
        <p className="text-xs text-slate-400">{getTranslation(lang, 'controlDesignSystemDesc')}</p>
      </div>

      {/* SECTION I: THEME & APPEARANCE */}
      <div className="p-6 rounded-2xl border border-white/5 bg-slate-950/20 backdrop-blur-md space-y-6">
        <div>
          <h3 className="text-sm font-display font-semibold text-slate-100 flex items-center gap-2">
            <Icons.Palette className="w-5 h-5 text-indigo-400" />
            <span>{getTranslation(lang, 'themeSectionTitle')}</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{getTranslation(lang, 'themeSectionDesc')}</p>
        </div>

        <div className="border-t border-white/[0.03] pt-5 space-y-6">
          {/* 1. DESKTOP BACKGROUND STYLE */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <Icons.Wallpaper className="w-4 h-4 accent-text" />
              <span>{getTranslation(lang, 'bgStyleLabel')}</span>
            </h4>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 select-none">
              {bgConfigs.map(({ style, labelKey, icon }) => {
                const isSel = settings.bgStyle === style;
                const IconComponent = (Icons as any)[icon] || Icons.HelpCircle;
                return (
                  <div
                    key={style}
                    onClick={() => updateSettings('bgStyle', style)}
                    className={`cursor-pointer p-3.5 rounded-xl border text-center flex flex-col items-center gap-2 transition-all bg-slate-900/30 ${
                      isSel 
                        ? 'accent-border-50 bg-slate-900/60 shadow-md scale-[1.01]'
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`p-1 rounded ${isSel ? 'accent-text accent-bg-10' : 'text-slate-500'}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-white">{getTranslation(lang, labelKey)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. ACCENT Presets & Sliding Custom Gradients */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <Icons.SlidersHorizontal className="w-4 h-4 accent-text" />
              <span>{getTranslation(lang, 'accentColorLabel')}</span>
            </h4>

            {/* Color presets swatches */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {swatchColors.map((clrPreset) => {
                const isSel = settings.accentColor.toLowerCase() === clrPreset.start.toLowerCase() && settings.gradientEnd.toLowerCase() === clrPreset.end.toLowerCase();
                return (
                  <div
                    key={clrPreset.name}
                    onClick={() => handleSwatchClick(clrPreset)}
                    className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center gap-2.5 bg-slate-900/30 font-medium ${
                      isSel 
                        ? 'accent-border-50 bg-slate-900/50 shadow'
                        : 'border-white/5 hover:border-white/10 hover:bg-slate-900/40'
                    }`}
                  >
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0" 
                      style={{ backgroundImage: `linear-gradient(to right, ${clrPreset.start}, ${clrPreset.end})` }} 
                    />
                    <span className="text-[11px] text-slate-300 leading-none">{clrPreset.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Custom hex selector */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 shrink-0">
                <label className="text-[10px] text-slate-400 font-mono">{getTranslation(lang, 'customColorHex')}</label>
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(accentInput) ? accentInput : settings.accentColor}
                  onChange={(e) => handleApplyCustomAccent(e.target.value)}
                  className="w-7 h-7 rounded border-none bg-transparent cursor-pointer shrink-0"
                  title="Accent color picker"
                />
                <input
                  type="text"
                  value={accentInput}
                  onChange={(e) => handleApplyCustomAccent(e.target.value)}
                  onBlur={() => {
                    if (!/^#[0-9a-f]{6}$/i.test(accentInput)) {
                      setAccentInput(settings.accentColor);
                    }
                  }}
                  maxLength={7}
                  className="py-1 px-2 border border-white/10 bg-black/45 rounded font-mono text-[10px] text-white w-20 uppercase"
                />
              </div>
              <div className="text-[10px] text-slate-500 font-sans">
                {getTranslation(lang, 'activeStyleStartsFrom')} <span className="font-mono font-bold text-white uppercase">{settings.gradientStart}</span> {getTranslation(lang, 'convergesGradientInto')} <span className="font-mono font-bold text-white uppercase">{settings.gradientEnd}</span>.
              </div>
            </div>
          </div>

          {/* 3. GLASS MATERIAL PRESETS */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <Icons.GlassWater className="w-4 h-4 accent-text" />
              <span>{getTranslation(lang, 'glassPresetLabel')}</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 select-none">
              {glassConfigs.map(({ preset, labelKey, desc }) => {
                const isSel = settings.glassPreset === preset;
                return (
                  <div
                    key={preset}
                    onClick={() => updateSettings('glassPreset', preset)}
                    className={`cursor-pointer p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all bg-slate-900/30 ${
                      isSel 
                        ? 'accent-border-50 bg-slate-900/70 accent-glow-sm scale-[1.02]'
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white truncate">{getTranslation(lang, labelKey)}</div>
                    <div className="text-[9px] text-slate-500 leading-tight mt-1.5 line-clamp-2">{desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. FINE-TUNED APPEARANCE METRICS */}
          <div className="pt-5 border-t border-white/[0.04] space-y-4">
            <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <Icons.Sliders className="w-4 h-4 accent-text" />
              <span>{lang === 'ru' ? 'Тонкая настройка интерфейса' : lang === 'uk' ? 'Тонке налаштування інтерфейсу' : 'Fine-Tuned Metrics'}</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Spacing Scale & Animations */}
              <div className="space-y-4">
                {/* Spacing Mode */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-300 flex justify-between">
                    <span>{lang === 'ru' ? 'Масштаб интервалов (Spacing)' : lang === 'uk' ? 'Масштаб інтервалів (Spacing)' : 'Layout Spacing Scale'}</span>
                    <span className="text-[10px] font-mono accent-text font-bold uppercase">{settings.spacingScale === 'compact' ? (lang === 'ru' ? 'Компактный' : lang === 'uk' ? 'Компактний' : 'Compact') : (lang === 'ru' ? 'Комфортный' : lang === 'uk' ? 'Комфортний' : 'Comfortable')}</span>
                  </label>
                  <div className="flex bg-slate-900/40 rounded-xl p-1 border border-white/5 select-none w-fit">
                    <button
                      onClick={() => updateSettings('spacingScale', 'comfortable')}
                      className={`py-1 px-3.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${settings.spacingScale !== 'compact' ? 'bg-white text-slate-950 shadow font-bold' : 'text-slate-400 hover:text-white'}`}
                    >
                      {lang === 'ru' ? 'Комфортный' : lang === 'uk' ? 'Комфортний' : 'Comfortable'}
                    </button>
                    <button
                      onClick={() => updateSettings('spacingScale', 'compact')}
                      className={`py-1 px-3.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${settings.spacingScale === 'compact' ? 'bg-white text-slate-950 shadow font-bold' : 'text-slate-400 hover:text-white'}`}
                    >
                      {lang === 'ru' ? 'Компактный' : lang === 'uk' ? 'Компактний' : 'Compact'}
                    </button>
                  </div>
                </div>

                {/* Interface Animations */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-300 flex justify-between">
                    <span>{lang === 'ru' ? 'Анимации интерфейса' : lang === 'uk' ? 'Анімації інтерфейсу' : 'UI Animations'}</span>
                    <span className="text-[10px] font-mono accent-text font-bold uppercase">{settings.animationsEnabled === 'false' ? (lang === 'ru' ? 'Выкл' : 'Off') : (lang === 'ru' ? 'Вкл' : 'On')}</span>
                  </label>
                  <div className="flex bg-slate-900/40 rounded-xl p-1 border border-white/5 select-none w-fit">
                    <button
                      onClick={() => updateSettings('animationsEnabled', 'true')}
                      className={`py-1 px-3.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${settings.animationsEnabled !== 'false' ? 'bg-white text-slate-950 shadow font-bold' : 'text-slate-400 hover:text-white'}`}
                    >
                      {lang === 'ru' ? 'Включены' : lang === 'uk' ? 'Увімкнено' : 'Enabled'}
                    </button>
                    <button
                      onClick={() => updateSettings('animationsEnabled', 'false')}
                      className={`py-1 px-3.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${settings.animationsEnabled === 'false' ? 'bg-white text-slate-950 shadow font-bold' : 'text-slate-400 hover:text-white'}`}
                    >
                      {lang === 'ru' ? 'Выключены' : lang === 'uk' ? 'Вимкнено' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Font Scale & Radius */}
              <div className="space-y-4">
                {/* Font Scale */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium text-slate-300">
                    <span>{lang === 'ru' ? 'Масштаб шрифта' : lang === 'uk' ? 'Масштаб шрифту' : 'Font Size Scale'}</span>
                    <span className="font-mono accent-text font-bold">{settings.fontScale || '1.0'}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.80"
                    max="1.30"
                    step="0.05"
                    value={settings.fontScale || '1.0'}
                    onChange={(e) => updateSettings('fontScale', e.target.value)}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </div>

                {/* Card Radius */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium text-slate-300">
                    <span>{lang === 'ru' ? 'Скругление карточек (Radius)' : lang === 'uk' ? 'Скруглення карток (Radius)' : 'Card Border Radius'}</span>
                    <span className="font-mono accent-text font-bold">{settings.cardRadius || '18'}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="1"
                    value={settings.cardRadius || '18'}
                    onChange={(e) => updateSettings('cardRadius', e.target.value)}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3">
              {/* Glass Opacity */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium text-slate-300">
                  <span>{lang === 'ru' ? 'Интенсивность стекла (Opacity)' : lang === 'uk' ? 'Інтенсивність скла (Opacity)' : 'Glass Opacity'}</span>
                  <span className="font-mono accent-text font-bold">{Math.round((parseFloat(settings.glassOpacity || '0.015')) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.30"
                  step="0.005"
                  value={settings.glassOpacity || '0.015'}
                  onChange={(e) => updateSettings('glassOpacity', e.target.value)}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent)' }}
                />
              </div>

              {/* Glass Blur */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium text-slate-300">
                  <span>{lang === 'ru' ? 'Радиус размытия (Blur)' : lang === 'uk' ? 'Радіус розмиття (Blur)' : 'Glass Blur Radius'}</span>
                  <span className="font-mono accent-text font-bold">{settings.glassBlur || '36'}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="64"
                  step="2"
                  value={settings.glassBlur || '36'}
                  onChange={(e) => updateSettings('glassBlur', e.target.value)}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent)' }}
                />
              </div>

              {/* Sidebar Opacity */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium text-slate-300">
                  <span>{lang === 'ru' ? 'Прозрачность боковой панели' : lang === 'uk' ? 'Прозорість бічної панелі' : 'Sidebar Opacity'}</span>
                  <span className="font-mono accent-text font-bold">{Math.round((parseFloat(settings.sidebarOpacity || '0.03')) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.20"
                  step="0.005"
                  value={settings.sidebarOpacity || '0.03'}
                  onChange={(e) => updateSettings('sidebarOpacity', e.target.value)}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual elegant separator line between key visual layout theme and secondary system parameters */}
      <div className="relative py-4 flex items-center">
        <div className="flex-grow border-t border-white/[0.04]"></div>
        <span className="flex-shrink mx-4 text-[10px] font-mono tracking-widest text-slate-500 uppercase">Advanced / System Utilities</span>
        <div className="flex-grow border-t border-white/[0.04]"></div>
      </div>

      <GitHubSettings />

      {/* SECTION II: SYSTEM CONTROLS & DATABASE UTILITY (MOVED TO THE ABSOLUTE BOTTOM) */}
      <div className="p-6 rounded-2xl border border-white/[0.03] bg-slate-950/20 backdrop-blur-md space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-white/[0.03]">
          <div>
            <h3 className="text-sm font-display font-semibold text-slate-100 flex items-center gap-2">
              <Icons.Cpu className="w-5 h-5 text-indigo-400 animate-pulse" />
              <span>{getTranslation(lang, 'systemSectionTitle')}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{getTranslation(lang, 'systemSectionDesc')}</p>
          </div>
          
          {/* Language Switch */}
          <div className="flex items-center gap-2 bg-slate-900/40 rounded-xl p-1 border border-white/5 select-none w-fit">
            {[
              { tag: 'ru', text: 'RU' },
              { tag: 'uk', text: 'UK' },
              { tag: 'en', text: 'EN' }
            ].map(({ tag, text }) => {
              const isSel = settings.language === tag;
              return (
                <button
                  key={tag}
                  onClick={() => updateSettings('language', tag)}
                  className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    isSel 
                      ? 'bg-white text-slate-950 shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>

        {/* Premium 3-card Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left card: Локальная база данных SQLite */}
          <div className="glass-card p-5 flex flex-col justify-between border border-white/5 bg-slate-900/10 text-[11px] hover:border-white/10 transition-all">
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Icons.Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>{lang === 'ru' ? 'Локальная БД SQLite' : lang === 'uk' ? 'Локальна БД SQLite' : 'SQLite Local DB'}</span>
              </h4>
              
              <div className="space-y-2.5 font-sans pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{lang === 'ru' ? 'Статус:' : 'Status:'}</span>
                  <span className="font-mono font-bold accent-text flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full accent-bg animate-ping inline-block" />
                    Live
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.03]">
                  <span className="text-slate-400">Engine:</span>
                  <span className="font-mono text-slate-300 font-semibold">SQLite 3 (Sync)</span>
                </div>

                <div className="pt-1 border-t border-white/[0.03] space-y-1">
                  <div className="text-slate-400">{lang === 'ru' ? 'Путь / имя файла:' : 'File path:'}</div>
                  <div className="font-mono text-[9px] text-slate-500 font-medium break-all select-text p-1.5 rounded bg-black/30 border border-white/5 max-h-16 overflow-y-auto">
                    {dbPath || 'tasks.db'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/[0.03]">
                  <span className="text-slate-400">{lang === 'ru' ? 'Количество задач:' : 'Tasks Count:'}</span>
                  <span className="font-mono text-slate-300 font-bold">{tasks.length}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/[0.03]">
                  <span className="text-slate-400">{lang === 'ru' ? 'Количество проектов:' : 'Projects Count:'}</span>
                  <span className="font-mono text-slate-300 font-bold">{projects.length}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/[0.03]">
                  <span className="text-slate-400">{lang === 'ru' ? 'Количество заметок:' : 'Notes Count:'}</span>
                  <span className="font-mono text-slate-300 font-bold">{notes.length}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-auto">
              <div className="text-[9px] font-mono text-slate-500 text-center uppercase tracking-widest text-slate-500">
                {getTranslation(lang, 'localSandboxStorage')}
              </div>
            </div>
          </div>

          {/* Middle card: Резервные копии */}
          <div className="glass-card p-5 flex flex-col justify-between border border-white/5 bg-slate-900/10 hover:border-white/10 transition-all">
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Icons.DownloadCloud className="w-3.5 h-3.5 accent-text" />
                <span>{lang === 'ru' ? 'Резервные копии' : lang === 'uk' ? 'Резервні копії' : 'Backups & Settings'}</span>
              </h4>
              
              {/* Backup Settings */}
              <div className="space-y-3.5 pt-1.5">
                {/* Enabled Toggle */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold">{lang === 'ru' ? 'Автобэкап:' : 'Auto Backup:'}</span>
                  <button
                    onClick={() => updateSettings('autoBackupEnabled', settings.autoBackupEnabled === 'false' ? 'true' : 'false')}
                    className={`py-1 px-3.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      settings.autoBackupEnabled !== 'false'
                        ? 'accent-bg-10 accent-text accent-border-25'
                        : 'bg-slate-900/50 text-slate-500 border-white/5'
                    }`}
                  >
                    {settings.autoBackupEnabled !== 'false' 
                      ? (lang === 'ru' ? 'Включено' : 'Enabled') 
                      : (lang === 'ru' ? 'Выключено' : 'Disabled')}
                  </button>
                </div>

                {/* Backup Interval Select */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold">{lang === 'ru' ? 'Интервал автобэкапа:' : 'Auto backup interval:'}</span>
                  <select
                    value={settings.autoBackupIntervalHours || '12'}
                    onChange={(e) => updateSettings('autoBackupIntervalHours', e.target.value)}
                    className="py-1 px-1.5 bg-slate-950 border border-white/10 rounded font-mono text-[10px] text-white focus:outline-none cursor-pointer"
                  >
                    <option value="6">6 {lang === 'ru' ? 'часов' : 'hours'}</option>
                    <option value="12">12 {lang === 'ru' ? 'часов' : 'hours'}</option>
                    <option value="24">24 {lang === 'ru' ? 'часа' : 'hours'}</option>
                    <option value="48">48 {lang === 'ru' ? 'часов' : 'hours'}</option>
                  </select>
                </div>

                {/* Retention period */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold">{lang === 'ru' ? 'Хранить автобэкапы:' : 'Backup retention:'}</span>
                  <select
                    value={settings.backupRetentionDays || '3'}
                    onChange={(e) => updateSettings('backupRetentionDays', e.target.value)}
                    className="py-1 px-1.5 bg-slate-950 border border-white/10 rounded font-mono text-[10px] text-white focus:outline-none cursor-pointer"
                  >
                    <option value="1">1 {lang === 'ru' ? 'день' : 'day'}</option>
                    <option value="3">3 {lang === 'ru' ? 'дня' : 'days'}</option>
                    <option value="7">7 {lang === 'ru' ? 'дней' : 'days'}</option>
                    <option value="14">14 {lang === 'ru' ? 'дней' : 'days'}</option>
                    <option value="30">30 {lang === 'ru' ? 'дней' : 'days'}</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-white/[0.03] space-y-2 flex flex-col">
                {/* Create Manual Backup */}
                <button
                  onClick={() => triggerBackup('manual')}
                  className="py-1.5 px-3 rounded-xl btn-accent text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'ru' ? 'Создать копию сейчас' : lang === 'uk' ? 'Створити копію зараз' : 'Create Copy Now'}</span>
                </button>

                {/* Import JSON/MD */}
                <button
                  onClick={handleImport}
                  className="py-1.5 px-3 rounded-xl border border-white/10 bg-white/5 text-slate-300 text-[10px] hover:bg-white/10 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Icons.Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'ru' ? 'Импортировать JSON / MD' : lang === 'uk' ? 'Імпортувати JSON / MD' : 'Import JSON / MD'}</span>
                </button>

                {/* Exports dropdown/row */}
                <div className="grid grid-cols-4 gap-1 pt-1">
                  <button
                    onClick={() => handleExportData('json')}
                    title="Export JSON"
                    className="py-1 px-1 text-center rounded border border-white/5 hover:border-teal-500/20 bg-slate-900/50 hover:bg-teal-500/5 text-[9px] text-teal-400 font-bold cursor-pointer"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => handleExportData('md')}
                    title="Export Markdown"
                    className="py-1 px-1 text-center rounded border border-white/5 hover:border-teal-500/20 bg-slate-900/50 hover:bg-teal-500/5 text-[9px] text-teal-400 font-bold cursor-pointer"
                  >
                    MD
                  </button>
                  <button
                    onClick={() => handleExportData('html')}
                    title="Export HTML"
                    className="py-1 px-1 text-center rounded border border-white/5 hover:border-teal-500/20 bg-slate-900/50 hover:bg-teal-500/5 text-[9px] text-teal-400 font-bold cursor-pointer"
                  >
                    HTML
                  </button>
                  <button
                    onClick={() => handleExportData('csv')}
                    title="Export CSV"
                    className="py-1 px-1 text-center rounded border border-white/5 hover:border-teal-500/20 bg-slate-900/50 hover:bg-teal-500/5 text-[9px] text-teal-400 font-bold cursor-pointer"
                  >
                    CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-auto border-t border-white/[0.03] space-y-2">
              {/* Retention clean button */}
              <button
                onClick={async () => {
                  const res = await cleanAutoBackups();
                  if (res.success) {
                    showToast(
                      lang === 'ru' 
                        ? `Очищено старых копий: ${res.deletedCount}` 
                        : `Deleted old auto backups: ${res.deletedCount}`, 
                      'success'
                    );
                  }
                }}
                className="w-full py-1.5 rounded-lg border border-rose-500/10 hover:border-rose-500/20 hover:bg-rose-500/5 text-rose-400 hover:text-rose-300 text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Icons.Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Очистить старые AUTO backups' : 'Clean old AUTO backups'}</span>
              </button>

              {/* Clear DB Button */}
              <button
                onClick={resetDatabase}
                className="w-full py-1.5 rounded-lg border border-transparent hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 text-[9px] font-semibold flex items-center justify-center cursor-pointer transition-colors"
              >
                {lang === 'ru' ? 'Очистить БД' : lang === 'uk' ? 'Очистити БД' : 'Clear DB'}
              </button>
            </div>
          </div>

          {/* Right card: Список резервных копий */}
          <div className="glass-card p-5 flex flex-col justify-between border border-white/5 bg-slate-900/10 hover:border-white/10 transition-all lg:col-span-1">
            <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
              <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider shrink-0">
                <Icons.List className="w-3.5 h-3.5 text-indigo-400" />
                <span>{lang === 'ru' ? 'Список резервных копий' : lang === 'uk' ? 'Список резервних копій' : 'Backup File List'}</span>
              </h4>
              
              {/* Backups List Scroll Container with Custom Scrollbar */}
              <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {backups.map((bak) => (
                  <div key={bak.id} className="p-2.5 border border-white/5 bg-black/25 rounded-xl space-y-1.5 hover:border-white/10 transition-all select-text">
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] font-mono px-1 py-0.2 rounded border font-semibold ${
                        bak.type === 'auto' 
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' 
                          : 'accent-bg-10 accent-text accent-border-25'
                      }`}>
                        {bak.type === 'auto' ? 'AUTO' : 'MANUAL'}
                      </span>
                      
                      <span className="font-mono text-[9px] text-slate-400 font-bold shrink-0">
                        {formatBytes(bak.sizeBytes)}
                      </span>
                    </div>
                    
                    <div className="font-mono text-[9px] text-slate-300 break-all select-all font-semibold">
                      {bak.id}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-white/[0.02]">
                      <span>{new Date(bak.timestamp).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}</span>
                      
                      <div className="flex items-center gap-2.5 font-bold shrink-0">
                        <button 
                          onClick={async () => {
                            const res = await restoreFromBackup(bak.id);
                            if (res.success) {
                              showToast(lang === 'ru' ? 'База данных успешно восстановлена!' : 'Database restored successfully!', 'success');
                            } else {
                              showToast(`Error: ${res.error}`, 'error');
                            }
                          }}
                          className="text-[10px] accent-text accent-hover-text hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <Icons.RotateCcw className="w-2.5 h-2.5" />
                          <span>{lang === 'ru' ? 'Восст.' : 'Restore'}</span>
                        </button>
                        <button 
                          onClick={() => deleteBackup(bak.id)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <Icons.X className="w-2.5 h-2.5" />
                          <span>{lang === 'ru' ? 'Удалить' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {backups.length === 0 && (
                  <div className="h-full flex items-center justify-center py-10 text-slate-600 text-[10px] font-sans text-center">
                    {lang === 'ru' ? 'Резервные копии не найдены' : 'No backups found.'}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION III: UPDATES & SOFTWARE DELIVERY */}
      <div className="p-5 rounded-2xl border border-white/[0.03] bg-slate-950/10 space-y-6">
        <div>
          <h3 className="text-xs font-display font-semibold text-slate-400 flex items-center gap-2">
            <Icons.Rocket className="w-4 h-4 text-slate-400" />
            <span>{lang === 'ru' ? 'Обновление ПО' : lang === 'uk' ? 'Оновлення ПЗ' : 'Software Updates & Delivery'}</span>
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {lang === 'ru' ? 'Управление каналами обновлений и проверка новых версий.' : 
             lang === 'uk' ? 'Керування каналами оновлень та перевірка нових версій.' : 
             'Manage update channels, check for new releases and apply patches.'}
          </p>
        </div>

        <div className="border-t border-white/[0.02] pt-4 space-y-5">
          {rollbackInfo && (
            <div className="p-4 rounded-xl border border-rose-500/25 bg-rose-500/5 text-rose-400 space-y-1.5 animate-fade-in">
              <div className="font-bold flex items-center gap-1.5">
                <Icons.AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{lang === 'ru' ? 'Сбой обновления' : lang === 'uk' ? 'Збій оновлення' : 'Update Failed'}</span>
              </div>
              <div className="text-[10px]">
                {lang === 'ru' ? 'Предыдущая версия была успешно восстановлена.' :
                 lang === 'uk' ? 'Попередня версія була успішно відновлена.' :
                 'Previous version restored.'}
              </div>
              {rollbackInfo.error && <div className="text-[9px] text-rose-300/80 font-mono">Error: {rollbackInfo.error}</div>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Version and Channel info */}
            <div className="space-y-3 p-3 rounded-xl border border-white/5 bg-black/20">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{lang === 'ru' ? 'Текущая версия:' : lang === 'uk' ? 'Поточна версія:' : 'Current Version:'}</span>
                <span className="font-mono font-bold text-slate-200">v{installedVersion || '...'}</span>
              </div>

              {/* Select update channel */}
              <div className="space-y-1.5 pt-1.5 border-t border-white/[0.03]">
                <label className="text-[10px] text-slate-500 font-semibold uppercase">{lang === 'ru' ? 'Канал обновлений:' : lang === 'uk' ? 'Канал оновлень:' : 'Update Channel:'}</label>
                <select
                  value={settings.updateChannel || 'stable'}
                  onChange={(e) => updateSettings('updateChannel', e.target.value)}
                  className="w-full py-1.5 px-3 rounded-xl border border-white/5 bg-slate-900/40 text-xs text-white focus:outline-none accent-focus"
                >
                  <option value="stable">Stable (Рекомендуется)</option>
                  <option value="beta">Beta (Тестирование)</option>
                  <option value="alpha">Alpha (Экспериментальный)</option>
                  <option value="rc">Release Candidate (RC)</option>
                </select>
              </div>
            </div>

            {/* Check/Download Actions */}
            <div className="space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">{lang === 'ru' ? 'Управление обновлениями' : lang === 'uk' ? 'Керування оновленнями' : 'Update Actions'}</div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCheckForUpdates}
                    disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                    className="py-1.5 px-3 rounded-lg btn-accent font-bold flex items-center gap-1 cursor-pointer transition-colors text-[11px] disabled:opacity-50"
                  >
                    <Icons.RefreshCw className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
                    <span>{lang === 'ru' ? 'Проверить обновления' : lang === 'uk' ? 'Перевірити оновлення' : 'Check for Updates'}</span>
                  </button>

                  <button
                    onClick={handleOpenLog}
                    className="py-1.5 px-3 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white font-bold flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                  >
                    <Icons.FileText className="w-3.5 h-3.5" />
                    <span>{lang === 'ru' ? 'Журнал обновлений' : lang === 'uk' ? 'Журнал оновлень' : 'Open Update Log'}</span>
                  </button>
                </div>
              </div>

              {/* Status information panel */}
              <div className="text-[11px] pt-1">
                {updateStatus === 'checking' && (
                  <span className="text-slate-400 animate-pulse">{lang === 'ru' ? 'Поиск обновлений...' : lang === 'uk' ? 'Пошук оновлень...' : 'Checking for updates...'}</span>
                )}
                {updateStatus === 'no-update' && (
                  <span className="accent-text font-semibold">{lang === 'ru' ? 'У вас установлена последняя версия.' : lang === 'uk' ? 'У вас встановлена остання версія.' : 'You are running the latest version.'}</span>
                )}
                {updateStatus === 'error' && (
                  <div className="space-y-2">
                    <div className="text-rose-400 font-semibold">
                      {updateError && (updateError.includes('404') || updateError.includes('not found')) ? (
                        lang === 'ru' ? 'Для выбранного канала пока нет опубликованных обновлений.' :
                        lang === 'uk' ? 'Для вибраного каналу поки немає опублікованих оновлень.' :
                        'No updates have been published for the selected channel yet.'
                      ) : (
                        lang === 'ru' ? `Ошибка: ${updateError}` :
                        lang === 'uk' ? `Помилка: ${updateError}` :
                        `Error: ${updateError}`
                      )}
                    </div>
                    {discoveredManifest && (
                      <button
                        onClick={handleDownloadFullInstaller}
                        className="py-1 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold hover:bg-amber-500/20 hover:text-amber-300 text-[10px] cursor-pointer transition-all"
                      >
                        {lang === 'ru' ? 'Скачать полный установщик (EXE)' : lang === 'uk' ? 'Завантажити повний установник (EXE)' : 'Download Full Installer (EXE)'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* New release info drawer if found */}
          {updateStatus === 'available' && discoveredManifest && (
            <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3.5 animate-fade-in text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">{lang === 'ru' ? 'Доступно обновление' : lang === 'uk' ? 'Доступне оновлення' : 'Update Available'}</span>
                <button
                  onClick={handleDownloadUpdate}
                  className="py-1 px-3 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] cursor-pointer transition-colors"
                >
                  {lang === 'ru' ? 'Скачать обновление' : lang === 'uk' ? 'Завантажити оновлення' : 'Download Update'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-2.5 rounded-lg bg-black/20 border border-white/5">
                <div>
                  <span className="text-slate-500">{lang === 'ru' ? 'Текущая:' : lang === 'uk' ? 'Поточна:' : 'Current:'}</span>
                  <span className="font-mono font-semibold text-slate-300 ml-1.5">v{installedVersion}</span>
                </div>
                <div>
                  <span className="text-slate-500">{lang === 'ru' ? 'Новая:' : lang === 'uk' ? 'Нова:' : 'Latest:'}</span>
                  <span className="font-mono font-bold accent-text ml-1.5">v{discoveredManifest.version}</span>
                </div>
                <div>
                  <span className="text-slate-500">{lang === 'ru' ? 'Размер:' : lang === 'uk' ? 'Розмір:' : 'Download Size:'}</span>
                  <span className="font-mono font-semibold text-slate-300 ml-1.5">{discoveredManifest.size ? formatBytes(discoveredManifest.size) : 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-500">{lang === 'ru' ? 'Канал:' : lang === 'uk' ? 'Канал:' : 'Channel:'}</span>
                  <span className="font-semibold text-indigo-400 capitalize ml-1.5">{discoveredManifest.channel}</span>
                </div>
              </div>

              {discoveredManifest.releaseNotes && discoveredManifest.releaseNotes.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{lang === 'ru' ? 'Список изменений:' : lang === 'uk' ? 'Список змін:' : 'Changelog:'}</div>
                  <ul className="list-disc pl-4 text-[10px] text-slate-300 space-y-0.5">
                    {discoveredManifest.releaseNotes.map((note: string, idx: number) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Downloading state */}
          {updateStatus === 'downloading' && (
            <div className="p-3 rounded-xl border border-white/5 bg-slate-900/40 flex items-center justify-between gap-4">
              <span className="text-[11px] text-slate-400 animate-pulse">{lang === 'ru' ? 'Загрузка пакета обновления...' : lang === 'uk' ? 'Завантаження пакета оновлення...' : 'Downloading update package...'}</span>
              <Icons.Loader2 className="w-4 h-4 accent-text animate-spin" />
            </div>
          )}

          {/* Download complete, ready to install */}
          {updateStatus === 'downloaded' && (
            <div className="p-4 rounded-xl border accent-border-20 accent-bg-5 flex items-center justify-between gap-4 animate-fade-in">
              <div>
                <div className="text-xs font-bold text-white">{lang === 'ru' ? 'Обновление загружено!' : lang === 'uk' ? 'Оновлення завантажено!' : 'Update Downloaded!'}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{lang === 'ru' ? 'Нажмите кнопку для установки и перезапуска приложения.' : lang === 'uk' ? 'Натисніть кнопку для встановлення та перезапуску програми.' : 'Click install to apply patch and restart the application.'}</div>
              </div>
              <button
                onClick={handleInstallUpdate}
                className="py-1.5 px-4 rounded-lg btn-accent font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                {lang === 'ru' ? 'Установить и перезапустить' : lang === 'uk' ? 'Встановити та перезапустити' : 'Install & Restart'}
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
