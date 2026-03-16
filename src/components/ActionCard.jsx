import React, { useState, useEffect } from 'react';
import { Calendar, User, Lock, Trash2, Pencil, ChevronRight, CheckCircle2, Clock, Circle, AlertTriangle } from 'lucide-react';

const STATUS_SEQUENCE = ['Open', 'In Progress', 'Completed'];

const STATUS_CONFIG = {
  'Open':        { color: '#4263EB', bg: 'rgba(66,99,235,0.08)',  border: 'rgba(66,99,235,0.20)',  label: 'Open' },
  'In Progress': { color: '#D97706', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.20)',  label: 'In behandeling' },
  'Completed':   { color: '#2D9E5A', bg: 'rgba(45,158,90,0.08)',  border: 'rgba(45,158,90,0.20)',  label: 'Afgerond' },
};

const COLORS = {
  surface: '#FFFFFF',
  surface2: '#F0EDE8',
  border: '#E4E1DC',
  text: '#141210',
  muted: '#8A8480',
  accent: '#C8A96E',
  danger: '#E5383B',
};

const getDaysUntilDeadline = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dl = new Date(dateStr); dl.setHours(0, 0, 0, 0);
  return Math.ceil((dl - today) / 86400000);
};

export default function ActionCard({ action, categories, onStatusChange, onProgressChange, onDelete, onEdit }) {
  const [localProgress, setLocalProgress] = useState(action.percent_delivery ?? 0);

  useEffect(() => {
    setLocalProgress(action.percent_delivery ?? 0);
  }, [action.percent_delivery]);

  const cfg = STATUS_CONFIG[action.status] || STATUS_CONFIG['Open'];
  const categoryName = categories.find(c => c.id === action.category_id)?.name ?? '—';
  const currentIndex = STATUS_SEQUENCE.indexOf(action.status);
  const nextStatus   = STATUS_SEQUENCE[currentIndex + 1] ?? null;

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const stepProgress = (delta) => {
    const next = Math.min(100, Math.max(0, localProgress + delta));
    setLocalProgress(next);
    onProgressChange(action.id, next);
  };

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow 160ms ease' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
    >
      {/* Header */}
      <div style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 6, padding: '3px 9px', letterSpacing: 0.4 }}>
          {cfg.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {action.is_private && <Lock size={14} style={{ color: COLORS.muted }} title="Privé actie" />}
          <button
            onClick={() => onEdit(action)}
            style={{ background: 'none', border: 'none', padding: '4px', borderRadius: 6, color: COLORS.muted, cursor: 'pointer', display: 'flex', transition: 'color 140ms ease' }}
            onMouseEnter={e => e.currentTarget.style.color = '#4263EB'}
            onMouseLeave={e => e.currentTarget.style.color = COLORS.muted}
            title="Bewerk actie"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(action.id)}
            style={{ background: 'none', border: 'none', padding: '4px', borderRadius: 6, color: COLORS.muted, cursor: 'pointer', display: 'flex', transition: 'color 140ms ease' }}
            onMouseEnter={e => e.currentTarget.style.color = COLORS.danger}
            onMouseLeave={e => e.currentTarget.style.color = COLORS.muted}
            title="Verwijder actie"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, lineHeight: 1.4, marginBottom: 10 }}>
          {action.subject}
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 12, fontSize: 12, color: COLORS.muted }}>
          <span style={{ background: COLORS.accent + '18', color: COLORS.accent, border: `1px solid ${COLORS.accent}33`, borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 11 }}>
            {categoryName}
          </span>
          {action.due_date && (() => {
            const days = getDaysUntilDeadline(action.due_date);
            const isOverdue = days < 0;
            const isDueSoon = days >= 0 && days <= 3;
            const deadlineColor = isOverdue ? '#E5383B' : isDueSoon ? '#D97706' : COLORS.muted;
            return (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: deadlineColor, fontWeight: (isOverdue || isDueSoon) ? 600 : 400 }}>
                <Calendar size={12} /> {formatDate(action.due_date)}
                {isOverdue && <AlertTriangle size={12} title={`${Math.abs(days)} dag(en) verlopen`} />}
                {isDueSoon && !isOverdue && <AlertTriangle size={12} title={`Verloopt over ${days} dag(en)`} />}
              </span>
            );
          })()}
          {action.needs_reassignment ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#D97706', fontWeight: 600 }}>
              ⚠ Eigenaar ontbreekt
            </span>
          ) : action.assigned_to_email ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={12} /> {action.assigned_to_email}
            </span>
          ) : null}
          {action.status === 'Completed' && action.completed_at && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#2D9E5A' }}>
              <CheckCircle2 size={12} /> Afgerond {formatDate(action.completed_at)}
            </span>
          )}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 500 }}>Voortgang</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{localProgress}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => stepProgress(-10)}
              disabled={localProgress <= 0}
              style={{ flex: 'none', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 16, fontWeight: 700, color: localProgress <= 0 ? COLORS.border : COLORS.text, cursor: localProgress <= 0 ? 'default' : 'pointer' }}
            >−</button>
            <div style={{ flex: 1, height: 6, background: COLORS.surface2, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${localProgress}%`, background: cfg.color, borderRadius: 99, transition: 'width 300ms ease' }} />
            </div>
            <button
              onClick={() => stepProgress(10)}
              disabled={localProgress >= 100}
              style={{ flex: 'none', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 16, fontWeight: 700, color: localProgress >= 100 ? COLORS.border : COLORS.text, cursor: localProgress >= 100 ? 'default' : 'pointer' }}
            >+</button>
          </div>
        </div>

        {/* Status advance button */}
        {nextStatus && (
          <button
            onClick={() => onStatusChange(action.id, nextStatus)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', background: cfg.color, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: `0 2px 8px ${cfg.color}44` }}
          >
            Markeer als {STATUS_CONFIG[nextStatus]?.label || nextStatus}
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
