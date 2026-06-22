import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';
import { NoteItem } from '../types';

export const NotesView: React.FC = () => {
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    settings
  } = useStore();

  const lang = settings.language;
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Set first note as default on first opening
  useEffect(() => {
    if (notes.length > 0 && !selectedNote) {
      setSelectedNote(notes[0]);
    }
  }, [notes, selectedNote]);

  // Load active selected note to variables
  useEffect(() => {
    if (selectedNote) {
      setEditedTitle(selectedNote.title);
      setEditedContent(selectedNote.content);
      setTagsList(selectedNote.tags || []);
      setTagsInput('');
    } else {
      setEditedTitle('');
      setEditedContent('');
      setTagsList([]);
      setTagsInput('');
    }
  }, [selectedNote]);

  // Fast auto saving helper triggered by typing
  const triggerAutoSaveSync = (title: string, content: string, tags: string[]) => {
    if (!selectedNote) return;
    updateNote(selectedNote.id, title, content, tags);
    setSaveStatus(getTranslation(lang, 'noteSaved'));
    setTimeout(() => {
      setSaveStatus(null);
    }, 1500);
  };

  const handleCreateNewNote = () => {
    const rawNote = addNote(
      getTranslation(lang, 'untitledScratchpad'),
      'Start writing down thoughts...',
      ['general']
    );
    setSelectedNote(rawNote);
  };

  const handleDeleteNoteObj = (id: string) => {
    deleteNote(id);
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const clean = tagsInput.trim().toLowerCase();
      if (clean && !tagsList.includes(clean)) {
        const up = [...tagsList, clean];
        setTagsList(up);
        if (selectedNote) {
          triggerAutoSaveSync(editedTitle, editedContent, up);
        }
      }
      setTagsInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    const up = tagsList.filter((_, i) => i !== index);
    setTagsList(up);
    if (selectedNote) {
      triggerAutoSaveSync(editedTitle, editedContent, up);
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden select-none">
      
      {/* Sidebar List panel */}
      <div className="w-80 border-r border-white/5 bg-white/[0.01] flex flex-col h-full shrink-0">
        
        {/* List Title actions */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-900/30">
          <h3 className="text-xs font-semibold uppercase text-slate-400 font-display flex items-center gap-1.5">
            <Icons.Notebook className="w-4 h-4 text-amber-400" />
            <span>{getTranslation(lang, 'notes')}</span>
          </h3>
          
          <button
            onClick={handleCreateNewNote}
            className="p-1.5 rounded-lg border border-white/10 btn-secondary transition-all cursor-pointer"
            title="Create quick note"
          >
            <Icons.Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Notes Items panel list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.map((n) => {
            const isSel = selectedNote?.id === n.id;
            return (
              <div
                key={n.id}
                onClick={() => setSelectedNote(n)}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  isSel 
                    ? 'bg-white/[0.08] border-white/10 shadow-md text-white' 
                    : 'border-transparent hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="text-xs font-semibold truncate flex-1">{n.title || getTranslation(lang, 'untitledScratchpad')}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteNoteObj(n.id); }}
                    className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-white/5 transition-all"
                  >
                    <Icons.Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {/* Short preview */}
                <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed font-sans">{n.content}</p>
                {/* date */}
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-[8px] font-mono text-slate-500">
                    {new Date(n.updatedDate).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
                      month: 'short', day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            );
          })}

          {notes.length === 0 && (
            <div className="text-center py-10 italic text-[11px] text-slate-500">
              {getTranslation(lang, 'noNotesFound')}
            </div>
          )}
        </div>
      </div>

      {/* Main Focus editor pad (Notion sheet look) */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-950/40 relative">
        {selectedNote ? (
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Auto saving state indicator top */}
            <div className="h-5 flex items-center justify-between text-[10px] font-mono select-none">
              <span className="text-slate-500">{getTranslation(lang, 'scratchMode')}</span>
              {saveStatus && (
                <span className="accent-text flex items-center gap-1 accent-bg-10 px-2 py-0.5 rounded border accent-border-10">
                  <Icons.CloudCheck className="w-3.5 h-3.5" />
                  <span>{saveStatus}</span>
                </span>
              )}
            </div>

            {/* Note Title Input */}
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => {
                setEditedTitle(e.target.value);
                triggerAutoSaveSync(e.target.value, editedContent, tagsList);
              }}
              className="w-full py-2 text-2xl font-display font-medium text-white border-b border-transparent bg-transparent focus:outline-none focus:border-white/5 placeholder-slate-600"
              placeholder={getTranslation(lang, 'noteTitlePlaceholder')}
            />

            <div className="border-b border-white/[0.03]" />

            {/* Notion-Inspired raw writing pane */}
            <textarea
              rows={16}
              value={editedContent}
              onChange={(e) => {
                setEditedContent(e.target.value);
                triggerAutoSaveSync(editedTitle, e.target.value, tagsList);
              }}
              className="w-full bg-transparent text-xs text-slate-200 outline-none border-none placeholder-slate-600 leading-relaxed font-sans scroll-smooth resize-none"
              placeholder={getTranslation(lang, 'notesPlaceholder')}
            />

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-14 text-center mt-20">
            <Icons.StickyNote className="w-10 h-10 text-slate-600 mb-2 animate-bounce" />
            <h3 className="text-sm font-semibold text-slate-400">{getTranslation(lang, 'noNoteActive')}</h3>
            <p className="text-[11px] text-slate-500 mt-1 mb-4">{getTranslation(lang, 'selectOrCreateNoteDesc')}</p>
            <button
              onClick={handleCreateNewNote}
              className="py-1 px-3.5 rounded bg-amber-400 text-slate-950 text-xs font-semibold transform active:scale-95 transition-transform cursor-pointer"
            >
              {getTranslation(lang, 'addNoteBtn')}
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
