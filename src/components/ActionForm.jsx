import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient.js';
import CategoryCombobox from './CategoryCombobox.jsx';
import { useMicrosoftSync } from '../hooks/useMicrosoftSync.js';

const COLORS = {
  surface: '#FFFFFF',
  surface2: '#F0EDE8',
  border: '#E4E1DC',
  text: '#141210',
  muted: '#8A8480',
  blue: '#4263EB',
  danger: '#E5383B',
};

const label = { fontSize: 11, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 };
const input = { width: '100%', background: COLORS.surface2, border: `1.5px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: COLORS.text, outline: 'none', boxSizing: 'border-box' };

export default function ActionForm({ categories, users = [], onSave, onCancel, session, onCategoryCreated }) {
  const { syncToMicrosoftToDo } = useMicrosoftSync();

  const [subject, setSubject]                   = useState('');
  const [categoryId, setCategoryId]             = useState(null);
  const [status, setStatus]                     = useState('Open');
  const [percentDelivery, setPercentDelivery]   = useState(0);
  const [dueDate, setDueDate]                   = useState('');
  const [assignedTo, setAssignedTo]             = useState(session?.user?.email ?? '');
  const [isPrivate, setIsPrivate]               = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [error, setError]                       = useState(null);

  const handleNewCategory = async (name) => {
    const { data, error } = await supabase.from('categories').insert([{ name }]).select().single();
    if (error) { console.error('Failed to create category:', error.message); return; }
    setCategoryId(data.id);
    onCategoryCreated?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) { setError('Onderwerp is verplicht.'); return; }

    setSaving(true);
    setError(null);

    const formData = {
      subject: subject.trim(),
      category_id: categoryId,
      status,
      percent_delivery: percentDelivery,
      due_date: dueDate || null,
      assigned_to_email: assignedTo.trim() || null,
      is_private: isPrivate,
    };

    try {
      await onSave(formData);
      const providerToken = session?.provider_token;
      if (providerToken) {
        try { await syncToMicrosoftToDo(formData, providerToken); }
        catch (syncErr) { console.warn('MS To Do sync failed (non-fatal):', syncErr.message); }
      }
    } catch (err) {
      setError('Opslaan mislukt. Probeer het opnieuw.');
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal-in" style={{ background: COLORS.surface, width: '100%', maxWidth: 520, borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.16)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '20px 20px 0 0', zIndex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, letterSpacing: '-0.01em' }}>Nieuwe actie</div>
          <button
            onClick={onCancel}
            style={{ background: COLORS.surface2, border: 'none', borderRadius: 8, padding: '6px', color: COLORS.muted, cursor: 'pointer', display: 'flex', transition: 'background 140ms ease' }}
            onMouseEnter={e => e.currentTarget.style.background = COLORS.border}
            onMouseLeave={e => e.currentTarget.style.background = COLORS.surface2}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div style={{ background: COLORS.danger + '10', border: `1px solid ${COLORS.danger}30`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: COLORS.danger }}>
              {error}
            </div>
          )}

          {/* Subject */}
          <div>
            <label style={label}>Onderwerp <span style={{ color: COLORS.danger }}>*</span></label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Beschrijf de actie..." required style={input} />
          </div>

          {/* Category */}
          <div>
            <label style={label}>Categorie</label>
            <CategoryCombobox
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              onNewCategory={handleNewCategory}
            />
          </div>

          {/* Status + Progress */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={label}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                style={{ ...input, cursor: 'pointer' }}>
                <option value="Open">Open</option>
                <option value="In Progress">In behandeling</option>
                <option value="Completed">Afgerond</option>
              </select>
            </div>
            <div>
              <label style={label}>Voortgang: <span style={{ color: COLORS.blue, fontWeight: 700 }}>{percentDelivery}%</span></label>
              <input type="range" min="0" max="100" step="5"
                value={percentDelivery} onChange={e => setPercentDelivery(Number(e.target.value))}
                style={{ width: '100%', accentColor: COLORS.blue, marginTop: 6 }} />
            </div>
          </div>

          {/* Due date */}
          <div>
            <label style={label}>Deadline</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={input} />
          </div>

          {/* Assigned to */}
          <div>
            <label style={label}>Toegewezen aan</label>
            {users.length > 0 ? (
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                style={{ ...input, cursor: 'pointer' }}>
                <option value="">— Niet toegewezen —</option>
                {/* Current user first */}
                {session?.user?.email && (
                  <option value={session.user.email}>{session.user.email} (jij)</option>
                )}
                {users
                  .filter(u => u.email !== session?.user?.email)
                  .map(u => (
                    <option key={u.id} value={u.email}>{u.email}</option>
                  ))
                }
              </select>
            ) : (
              <input type="email" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                placeholder="naam@voorbeeld.nl" style={input} />
            )}
          </div>

          {/* Private */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="isPrivate" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: COLORS.blue, cursor: 'pointer' }} />
            <label htmlFor="isPrivate" style={{ fontSize: 13, fontWeight: 500, color: COLORS.text, cursor: 'pointer' }}>
              Privé actie (alleen zichtbaar voor jou)
            </label>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onCancel}
              style={{ flex: 1, padding: '12px', background: 'transparent', border: `1.5px solid ${COLORS.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: COLORS.muted, cursor: 'pointer', transition: 'border-color 140ms ease' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#B0ADA8'}
              onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
            >
              Annuleren
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: saving ? '#8A8480' : COLORS.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 2px 8px rgba(66,99,235,0.28)' }}
            >
              {saving ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={15} />}
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
