import { useRef, useState } from 'react';
import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';
import { type Taxonomy } from '../taxonomy';
import { normalize } from '../normalizeFragrances';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
  taxonomy: Taxonomy;
}

export function NoteAutocomplete({ state, actions, taxonomy }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = 'note-listbox';

  const query = normalize(inputValue);
  const suggestions = taxonomy.notes
    .filter((n) => !state.notes.includes(n.key) && (query === '' || n.key.includes(query) || normalize(n.label).includes(query)))
    .slice(0, 10);

  function selectNote(key: string) {
    actions.toggleNote(key);
    setInputValue('');
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        selectNote(suggestions[activeIndex].key);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-fg-base mb-2">Noten</p>
      {state.notes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {state.notes.map((key) => {
            const label = taxonomy.notes.find((n) => n.key === key)?.label ?? key;
            return (
              <button
                key={key}
                onClick={() => actions.toggleNote(key)}
                aria-label={`${label} entfernen`}
                onKeyDown={(e) => { if (e.key === 'Delete' || e.key === 'Backspace') actions.toggleNote(key); }}
                className="
                  inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                  bg-filter-pill-bg text-filter-pill-fg border border-filter-pill-border
                  hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
                "
              >
                {label} <span aria-hidden="true">×</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `note-option-${activeIndex}` : undefined}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Note suchen…"
          className="
            w-full px-3 py-2 rounded-lg border border-input-border bg-input-bg text-input-fg text-sm
            placeholder:text-input-placeholder
            hover:border-input-hover-border focus:border-input-focus-border focus:outline-none
            focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1
          "
        />
        {open && suggestions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            className="
              absolute top-full left-0 right-0 mt-1 z-30
              bg-dropdown-bg border border-dropdown-border rounded-lg shadow-lg
              max-h-48 overflow-y-auto
            "
          >
            {suggestions.map((n, i) => (
              <li
                key={n.key}
                id={`note-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={() => selectNote(n.key)}
                className={`
                  px-3 py-2 text-sm cursor-pointer
                  ${i === activeIndex ? 'bg-autocomplete-item-hover' : 'hover:bg-autocomplete-item-hover'}
                  text-dropdown-fg
                `}
              >
                {n.label}
                <span className="ml-1 text-xs text-fg-muted">({n.count})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
