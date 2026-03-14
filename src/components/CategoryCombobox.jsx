import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, PlusCircle } from 'lucide-react';

const COLORS = {
  surface: '#FFFFFF',
  surface2: '#F0EDE8',
  border: '#E4E1DC',
  text: '#141210',
  muted: '#8A8480',
  accent: '#C8A96E',
  blue: '#4263EB',
};

export default function CategoryCombobox({ categories, value, onChange, onNewCategory }) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen]             = useState(false);
  const containerRef                = useRef(null);

  useEffect(() => {
    if (value) {
      const match = categories.find(c => c.id === value);
      setInputValue(match ? match.name : '');
    } else {
      setInputValue('');
    }
  }, [value, categories]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = categories.filter(c => c.name.toLowerCase().includes(inputValue.toLowerCase()));
  const showCreate = inputValue.trim().length > 0 &&
    !categories.some(c => c.name.toLowerCase() === inputValue.trim().toLowerCase());

  const handleSelect = (category) => { setInputValue(category.name); onChange(category.id); setOpen(false); };
  const handleCreate = () => {
    const name = inputValue.trim();
    if (name) { onNewCategory(name); setOpen(false); }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); onChange(null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Selecteer of maak categorie aan..."
          style={{ width: '100%', background: COLORS.surface2, border: `1.5px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 36px 10px 12px', fontSize: 13, color: COLORS.text, outline: 'none', boxSizing: 'border-box' }}
        />
        <ChevronDown
          size={15}
          style={{ position: 'absolute', right: 10, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, color: COLORS.muted, pointerEvents: 'none', transition: 'transform 160ms ease' }}
        />
      </div>

      {open && (filtered.length > 0 || showCreate) && (
        <div style={{ position: 'absolute', zIndex: 100, width: '100%', marginTop: 4, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', maxHeight: 200, overflowY: 'auto' }}>
          {filtered.map(category => (
            <button key={category.id} type="button" onClick={() => handleSelect(category)}
              style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, color: COLORS.text, background: 'none', border: 'none', cursor: 'pointer', transition: 'background 120ms ease' }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.surface2}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {category.name}
            </button>
          ))}
          {showCreate && (
            <button type="button" onClick={handleCreate}
              style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, color: COLORS.accent, background: COLORS.accent + '08', border: 'none', borderTop: `1px solid ${COLORS.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.accent + '14'}
              onMouseLeave={e => e.currentTarget.style.background = COLORS.accent + '08'}
            >
              <PlusCircle size={14} />
              Maak "{inputValue.trim()}" aan
            </button>
          )}
        </div>
      )}
    </div>
  );
}
