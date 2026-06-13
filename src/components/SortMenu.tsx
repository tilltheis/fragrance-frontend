import { useEffect, useRef, useState } from 'react';
import { type BrowseState, type SortKey } from '../types';
import { type SearchStateActions } from '../useSearchState';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Neu hinzugefügt' },
  { key: 'ratingDesc', label: 'Meine Bewertung: absteigend' },
  { key: 'testedDesc', label: 'Zuletzt getestet' },
  { key: 'editedDesc', label: 'Zuletzt bearbeitet' },
  { key: 'brandAsc', label: 'Marke A–Z' },
  { key: 'nameAsc', label: 'Name A–Z' },
];

const SORT_LABELS: Record<SortKey, string> = Object.fromEntries(
  SORT_OPTIONS.map(({ key, label }) => [key, label]),
) as Record<SortKey, string>;

export function SortMenu({ state, actions }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="
          flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-lg border border-button-secondary-border
          bg-button-secondary-fill hover:bg-button-secondary-hover text-button-secondary-fg text-sm font-medium
          focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
        "
      >
        <span>↕ {SORT_LABELS[state.sortKey]}</span>
        <span className="text-xs text-fg-muted">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="
            absolute right-0 top-full mt-1 z-20 min-w-56
            bg-dropdown-bg border border-dropdown-border rounded-lg shadow-lg py-1
          "
        >
          <div className="px-3 py-2 border-b border-border-subtle">
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${!state.query ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                checked={state.rankByMatch}
                onChange={() => actions.toggleRankByMatch()}
                className="rounded accent-brand-primary"
              />
              <span className="font-medium text-fg-base">Beste Übereinstimmung</span>
            </label>
            <p className="text-xs text-fg-muted mt-0.5 ml-6">Suchrelevanz als erste Sortierung</p>
          </div>

          <ul role="listbox" aria-label="Sortierung">
            {SORT_OPTIONS.map(({ key, label }) => (
              <li key={key}>
                <button
                  role="option"
                  aria-selected={state.sortKey === key}
                  onClick={() => {
                    actions.setSortKey(key);
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className={`
                    w-full text-left px-4 py-2 text-sm hover:bg-dropdown-hover
                    ${state.sortKey === key ? 'text-brand-primary font-medium' : 'text-dropdown-fg'}
                  `}
                >
                  {state.sortKey === key && <span className="mr-1.5">✓</span>}
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
