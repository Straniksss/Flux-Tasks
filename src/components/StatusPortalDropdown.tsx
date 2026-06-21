import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TaskStatus } from '../types';
import { getTranslation } from '../localization';

interface StatusPortalDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: TaskStatus;
  onSelect: (newStatus: TaskStatus) => void;
  triggerRect: DOMRect | null;
  lang: string;
}

export const StatusPortalDropdown: React.FC<StatusPortalDropdownProps> = ({
  isOpen,
  onClose,
  currentStatus,
  onSelect,
  triggerRect,
  lang
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleClose = () => {
      onClose();
    };

    // Close on any click, scroll or window resize
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);

    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !triggerRect) return null;

  const dropdownHeight = 220; // Estimated height for 6 items
  const dropdownWidth = 176;  // w-44
  const margin = 6;

  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;

  let top = triggerRect.bottom + margin;
  let openUp = false;

  // Flip upward if not enough space below, but space above is sufficient
  if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
    top = triggerRect.top - dropdownHeight - margin;
    openUp = true;
  }

  let left = triggerRect.right - dropdownWidth;
  if (left < 12) {
    left = 12;
  } else if (left + dropdownWidth > window.innerWidth - 12) {
    left = window.innerWidth - dropdownWidth - 12;
  }

  const statusesList: { value: TaskStatus; labelKey: string; indicatorClass: string }[] = [
    { value: 'planned', labelKey: 'planned', indicatorClass: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]' },
    { value: 'pending', labelKey: 'waiting', indicatorClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' },
    { value: 'in_progress', labelKey: 'inWork', indicatorClass: 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)] animate-pulse' },
    { value: 'testing', labelKey: 'testing', indicatorClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]' },
    { value: 'completed', labelKey: 'completed', indicatorClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' },
    { value: 'cancelled', labelKey: 'cancelled', indicatorClass: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]' }
  ];

  return createPortal(
    <div 
      onClick={(e) => e.stopPropagation()}
      className={`fixed w-44 rounded-xl border border-white/10 bg-[#0c0c14]/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-[9999] py-1 select-none ${
        openUp ? 'animate-slide-fade-up origin-bottom' : 'animate-slide-fade-down origin-top'
      }`}
      style={{
        top: `${top}px`,
        left: `${left}px`
      }}
    >
      {statusesList.map((st) => {
        const isSelected = currentStatus === st.value;
        return (
          <button
            key={st.value}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(st.value);
              onClose();
            }}
            className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer ${
              isSelected 
                ? 'bg-white/[0.08] text-white font-bold' 
                : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-1.5 h-1.5 rounded-full ${st.indicatorClass}`} />
              <span>{getTranslation(lang, st.labelKey as any)}</span>
            </div>
            {isSelected && (
              <svg className="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        );
      })}
    </div>,
    document.body
  );
};
