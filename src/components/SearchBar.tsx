import React from 'react';

interface Props {
  query: string;
  onChange: (q: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchBar({ query, onChange, inputRef }: Props) {
  return (
    <div className="relative w-full">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" aria-hidden="true">
        🔍
      </span>
      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        aria-label="Marke oder Duftname suchen"
        placeholder="Marke oder Duftname suchen"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full pl-9 pr-3 py-2 rounded-lg border border-input-border bg-input-bg text-input-fg
          placeholder:text-input-placeholder text-sm
          hover:border-input-hover-border
          focus:border-input-focus-border focus:outline-none
          focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1
        "
      />
      {query && (
        <button
          onClick={() => onChange('')}
          aria-label="Suche löschen"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-base rounded p-1"
        >
          ✕
        </button>
      )}
    </div>
  );
}
