import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownViewerProps {
  text: string;
}

// Simple but visually stunning syntax highlighter for code blocks
function highlightCode(code: string, lang: string): React.ReactNode {
  const language = lang ? lang.toLowerCase() : 'text';
  
  if (language === 'text') {
    return <code>{code}</code>;
  }

  // Common syntax rules
  const rules = {
    comments: /(\/\/.*|#.*|\/\*[\s\S]*?\*\/)/g,
    strings: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g,
    numbers: /\b(\d+(?:\.\d+)?)\b/g,
    keywords: /\b(const|let|var|function|class|return|if|else|for|while|do|switch|case|break|continue|import|export|from|default|extends|new|this|typeof|instanceof|def|elif|try|except|finally|with|as|lambda|in|is|not|and|or|select|insert|update|delete|where|join|on|group|by|order|having|limit|create|table|drop|alter|index|into|values|set|null|true|false|boolean|string|number|any|void|unknown|interface|type|public|private|protected|static|async|await|stdout|stdin|echo|exit|function|param|get|set|let|declare|module|namespace)\b/g,
    builtins: /\b(console|log|error|warn|info|dir|print|len|range|open|list|dict|set|tuple|int|str|float|type|id|map|filter|zip|sum|min|max|abs|round|JSON|stringify|parse|Object|Array|Math|Date|String|Number|Boolean|RegExp|Promise|process|global|window|document|localStorage|sessionStorage|fetch|Headers|Request|Response|app|BrowserWindow|ipcMain|ipcRenderer|contextBridge|shell|dialog)\b/g,
    operators: /([+\-*/%&|^!~=<>:?]+)/g
  };

  // Split code into tokens
  const textParts = code.split(/(\s+)/);
  
  return (
    <code>
      {textParts.map((part, index) => {
        if (/^\s+$/.test(part)) {
          return part;
        }

        // Apply rules in order
        let className = 'text-slate-300';
        
        if (rules.comments.test(part)) {
          className = 'text-slate-500 italic';
          rules.comments.lastIndex = 0;
        } else if (rules.strings.test(part)) {
          className = 'text-emerald-400';
          rules.strings.lastIndex = 0;
        } else if (rules.keywords.test(part)) {
          className = 'text-fuchsia-400 font-bold';
          rules.keywords.lastIndex = 0;
        } else if (rules.builtins.test(part)) {
          className = 'text-cyan-400';
          rules.builtins.lastIndex = 0;
        } else if (rules.numbers.test(part)) {
          className = 'text-amber-400';
          rules.numbers.lastIndex = 0;
        } else if (rules.operators.test(part)) {
          className = 'text-sky-400';
          rules.operators.lastIndex = 0;
        }

        return (
          <span key={index} className={className}>
            {part}
          </span>
        );
      })}
    </code>
  );
}

const CodeBlock: React.FC<{ codeText: string; codeBlockLang: string }> = ({ codeText, codeBlockLang }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden font-mono text-xs shadow-md group/code relative">
      <div className="px-4 py-1.5 border-b border-white/5 bg-white/5 flex items-center justify-between text-[10px] text-slate-400 uppercase select-none">
        <span>{codeBlockLang || 'text'}</span>
        <button 
          onClick={handleCopy}
          className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-[9px] font-semibold"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[11px] leading-relaxed text-slate-300">
        {highlightCode(codeText, codeBlockLang)}
      </pre>
    </div>
  );
};

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  
  let inList = false;
  let listItems: string[] = [];
  let isNumberedList = false;

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushList = (key: number) => {
    if (listItems.length === 0) return;
    const ListTag = isNumberedList ? 'ol' : 'ul';
    const listClass = isNumberedList 
      ? 'list-decimal pl-6 my-2 text-xs text-slate-300 space-y-1' 
      : 'list-disc pl-6 my-2 text-xs text-slate-300 space-y-1';

    elements.push(
      <ListTag key={`list-${key}`} className={listClass}>
        {listItems.map((item, idx) => (
          <li key={idx}>{parseInlineStyles(item)}</li>
        ))}
      </ListTag>
    );
    listItems = [];
    inList = false;
  };

  const flushTable = (key: number) => {
    if (tableHeaders.length === 0 && tableRows.length === 0) return;
    elements.push(
      <div key={`table-container-${key}`} className="overflow-x-auto my-3 rounded-lg border border-white/5 bg-slate-950/20 backdrop-blur-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {tableHeaders.map((h, idx) => (
                <th key={idx} className="p-2.5 font-bold text-slate-200">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-white/5 hover:bg-white/[0.02]">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-2.5 text-slate-300">{parseInlineStyles(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableHeaders = [];
    tableRows = [];
    inTable = false;
  };

  // Helper to parse bold, italics, inline code, and links
  const parseInlineStyles = (txt: string): React.ReactNode[] => {
    // Regex matches
    // Bold: **text** or __text__
    // Italic: *text* or _text_
    // Inline code: `code`
    // Links: [text](url)
    
    const parts: React.ReactNode[] = [];
    let currentText = txt;
    let keyIdx = 0;

    while (currentText) {
      const boldMatch = currentText.match(/^([\s\S]*?)\*\*(.+?)\*\*([\s\S]*)$/) || currentText.match(/^([\s\S]*?)__(.+?)__([\s\S]*)$/);
      const italicMatch = currentText.match(/^([\s\S]*?)\*(.+?)\*([\s\S]*)$/) || currentText.match(/^([\s\S]*?)_(.+?)_([\s\S]*)$/);
      const codeMatch = currentText.match(/^([\s\S]*?)`(.+?)`([\s\S]*)$/);
      const linkMatch = currentText.match(/^([\s\S]*?)\[(.+?)\]\((.+?)\)([\s\S]*)$/);

      // Find which match occurs first
      const matches = [
        { type: 'bold', index: boldMatch ? boldMatch[1].length : Infinity, match: boldMatch },
        { type: 'italic', index: italicMatch ? italicMatch[1].length : Infinity, match: italicMatch },
        { type: 'code', index: codeMatch ? codeMatch[1].length : Infinity, match: codeMatch },
        { type: 'link', index: linkMatch ? linkMatch[1].length : Infinity, match: linkMatch }
      ].sort((a, b) => a.index - b.index);

      const firstMatch = matches[0];

      if (firstMatch && firstMatch.index !== Infinity && firstMatch.match) {
        const preText = firstMatch.match[1];
        if (preText) {
          parts.push(<span key={`text-${keyIdx++}`}>{preText}</span>);
        }

        if (firstMatch.type === 'bold') {
          parts.push(<strong key={`bold-${keyIdx++}`} className="font-extrabold text-white">{firstMatch.match[2]}</strong>);
          currentText = firstMatch.match[3];
        } else if (firstMatch.type === 'italic') {
          parts.push(<em key={`italic-${keyIdx++}`} className="italic text-slate-200">{firstMatch.match[2]}</em>);
          currentText = firstMatch.match[3];
        } else if (firstMatch.type === 'code') {
          parts.push(<code key={`code-${keyIdx++}`} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-teal-400">{firstMatch.match[2]}</code>);
          currentText = firstMatch.match[3];
        } else if (firstMatch.type === 'link') {
          parts.push(<a key={`link-${keyIdx++}`} href={firstMatch.match[3]} target="_blank" rel="noopener noreferrer" className="text-[#3bd2ff] hover:text-[#ff52df] underline transition-colors">{firstMatch.match[2]}</a>);
          currentText = firstMatch.match[4];
        }
      } else {
        parts.push(<span key={`text-${keyIdx++}`}>{currentText}</span>);
        break;
      }
    }

    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block boundary
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        const codeText = codeBlockLines.join('\n');
        elements.push(
          <CodeBlock key={`codeblock-${i}`} codeText={codeText} codeBlockLang={codeBlockLang} />
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBlockLang = trimmed.substring(3).trim();
        flushList(i);
        flushTable(i);
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 2. Headings
    if (trimmed.startsWith('#')) {
      flushList(i);
      flushTable(i);
      const match = trimmed.match(/^(#+)\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];
        const headingContent = parseInlineStyles(headingText);

        if (level === 1) {
          elements.push(<h1 key={i} className="text-base font-bold text-white border-b border-white/15 pb-1 mt-4 mb-2">{headingContent}</h1>);
        } else if (level === 2) {
          elements.push(<h2 key={i} className="text-sm font-semibold text-slate-100 mt-3 mb-2">{headingContent}</h2>);
        } else {
          elements.push(<h3 key={i} className="text-xs font-semibold text-slate-300 mt-3 mb-1.5">{headingContent}</h3>);
        }
      }
      continue;
    }

    // 3. Blockquotes
    if (trimmed.startsWith('>')) {
      flushList(i);
      flushTable(i);
      const quoteText = line.substring(line.indexOf('>') + 1).trim();
      elements.push(
        <blockquote key={i} className="my-2 pl-4 border-l-2 border-[#ff52df] text-xs italic text-slate-400">
          {parseInlineStyles(quoteText)}
        </blockquote>
      );
      continue;
    }

    // 4. Checklist Checkboxes
    if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
      flushList(i);
      flushTable(i);
      const checked = trimmed.startsWith('- [x]');
      const itemText = trimmed.substring(5).trim();
      elements.push(
        <div key={i} className="flex items-center gap-2 my-1 text-xs select-none">
          <input
            type="checkbox"
            checked={checked}
            disabled
            className="w-3.5 h-3.5 rounded border-white/10 bg-slate-900 text-emerald-500"
          />
          <span className={checked ? 'line-through text-slate-500' : 'text-slate-200'}>
            {parseInlineStyles(itemText)}
          </span>
        </div>
      );
      continue;
    }

    // 5. Lists (unordered/bullet)
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      if (!inList || isNumberedList) {
        flushList(i);
        inList = true;
        isNumberedList = false;
      }
      listItems.push(bulletMatch[1]);
      continue;
    }

    // 6. Lists (numbered)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (!inList || !isNumberedList) {
        flushList(i);
        inList = true;
        isNumberedList = true;
      }
      listItems.push(numMatch[2]);
      continue;
    }

    // 7. Table Rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList(i);
      const cells = trimmed
        .split('|')
        .map(c => c.trim())
        .slice(1, -1); // Remove empty ends
      
      // Check if it's separator row like |---|---|
      const isSeparator = cells.every(c => /^:-*|-*:?|-*$/.test(c));
      
      if (isSeparator) {
        // Ignore separator rows
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    }

    // Fallback if table ended
    if (inTable && (!trimmed.startsWith('|') || !trimmed.endsWith('|'))) {
      flushTable(i);
    }

    // 8. Plain Paragraphs
    if (trimmed === '') {
      flushList(i);
      flushTable(i);
      elements.push(<div key={i} className="h-2" />);
    } else {
      flushList(i);
      flushTable(i);
      elements.push(
        <p key={i} className="text-[12px] text-slate-300 leading-relaxed my-1.5 font-sans">
          {parseInlineStyles(line)}
        </p>
      );
    }
  }

  // Flush remaining blocks
  flushList(lines.length);
  flushTable(lines.length);

  return <div className="space-y-0.5 select-text">{elements}</div>;
};
