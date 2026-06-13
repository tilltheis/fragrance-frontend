import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { type DynamicFragranceData, type Fragrance } from '../types';

interface Props {
  fragrances: Record<number, Fragrance> | undefined;
  onSubmit: (data: DynamicFragranceData) => void;
  onClose: () => void;
}

const inputClass = `
  text-input-fg bg-input-bg border rounded border-input-border
  hover:border-input-hover-border w-full py-2 px-3 text-fg-base leading-tight
  focus:border-input-focus-border focus:outline-none
  focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1
`;

export function AddFragranceModal({ fragrances, onSubmit, onClose }: Props) {
  const [newBrandQuery, setNewBrandQuery] = useState('');
  const [newNameQuery, setNewNameQuery] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleSubmit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const brandQuery = newBrandQuery.trim();
    const nameQuery = newNameQuery.trim();
    if (!brandQuery || !nameQuery) return;
    const allIds = fragrances ? Object.keys(fragrances).map(Number) : [];
    const nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 1;
    onSubmit({ id: nextId, brandQuery, nameQuery });
    setNewBrandQuery('');
    setNewNameQuery('');
    onClose();
  }

  return createPortal(
    <>
      <div className="global-scroll-lock" />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="absolute inset-0 bg-overlay-scrim" aria-hidden="true" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Duft hinzufügen"
          className="relative z-10 bg-card-bg border border-card-border rounded-lg shadow-xl p-6 w-80 text-card-fg"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-fg-base">Duft hinzufügen</h2>
            <button
              onClick={onClose}
              aria-label="Dialog schließen"
              className="text-fg-muted hover:text-fg-base focus-visible:ring-2 focus-visible:ring-focus-ring rounded p-1"
            >
              ✕
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-fg-base text-sm font-bold mb-2" htmlFor="modal-brandQuery">
              Marke
            </label>
            <input
              ref={firstInputRef}
              className={inputClass}
              id="modal-brandQuery"
              type="text"
              value={newBrandQuery}
              onChange={(e) => setNewBrandQuery(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label className="block text-fg-base text-sm font-bold mb-2" htmlFor="modal-nameQuery">
              Name
            </label>
            <input
              className={inputClass}
              id="modal-nameQuery"
              type="text"
              value={newNameQuery}
              onChange={(e) => setNewNameQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className="
                bg-button-primary-fill hover:bg-button-primary-hover active:bg-button-primary-active
                text-button-primary-fg border border-button-primary-border rounded font-bold py-2 px-4
                focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2
                ring-offset-card-bg
              "
              type="button"
              onClick={handleSubmit}
            >
              Duft Hinzufügen
            </button>
            <button
              onClick={onClose}
              className="
                bg-button-ghost-fill hover:bg-button-ghost-hover text-button-ghost-fg
                rounded py-2 px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
              "
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
