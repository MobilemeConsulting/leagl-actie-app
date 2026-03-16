import React from 'react';
import { Trash2, RefreshCw, Lock, Pencil, AlertTriangle } from 'lucide-react';

const COLORS = {
  surface: '#FFFFFF',
  surface2: '#F0EDE8',
  border: '#E4E1DC',
  text: '#141210',
  textSecondary: '#5A5856',
  muted: '#8A8480',
  accent: '#C8A96E',
  blue: '#4263EB',
  success: '#2D9E5A',
  warning: '#D97706',
  danger: '#E5383B',
};

const STATUS_COLOR = {
  'Open':        { color: COLORS.blue,    bg: 'rgba(66,99,235,0.08)',  border: 'rgba(66,99,235,0.20)'  },
  'In Progress': { color: COLORS.warning, bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.20)'  },
  'Completed':   { color: COLORS.success, bg: 'rgba(45,158,90,0.08)',  border: 'rgba(45,158,90,0.20)'  },
};

export default function ActionTable({ actions, categories, onStatusChange, onProgressChange, onDelete, onEdit }) {
  const hasCompleted = actions.some(a => a.status === 'Completed');

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name ?? '—';

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const th = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` };

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 40 }}>#</th>
              <th style={th}>Onderwerp</th>
              <th style={th}>Categorie</th>
              <th style={th}>Status</th>
              <th style={th}>% Afg.</th>
              <th style={th}>Deadline</th>
              <th style={th}>Toegewezen aan</th>
              <th style={{ ...th, textAlign: 'center' }}>Privé</th>
              <th style={{ ...th, textAlign: 'center' }}>Sync</th>
              {hasCompleted && <th style={th}>Afgerond op</th>}
              <th style={{ ...th, textAlign: 'center' }}>Acties</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action, index) => (
              <ActionTableRow
                key={action.id}
                action={action}
                index={index + 1}
                categoryName={getCategoryName(action.category_id)}
                hasCompleted={hasCompleted}
                formatDate={formatDate}
                onStatusChange={onStatusChange}
                onProgressChange={onProgressChange}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const getDaysUntilDeadline = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dl = new Date(dateStr); dl.setHours(0, 0, 0, 0);
  return Math.ceil((dl - today) / 86400000);
};

function ActionTableRow({ action, index, categoryName, hasCompleted, formatDate, onStatusChange, onProgressChange, onDelete, onEdit }) {
  const [localProgress, setLocalProgress] = React.useState(action.percent_delivery ?? 0);
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    setLocalProgress(action.percent_delivery ?? 0);
  }, [action.percent_delivery]);

  const statusCfg = STATUS_COLOR[action.status] || STATUS_COLOR['Open'];

  const stepProgress = (delta) => {
    const next = Math.min(100, Math.max(0, localProgress + delta));
    setLocalProgress(next);
    onProgressChange(action.id, next);
  };

  const td = { padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`, verticalAlign: 'middle' };

  return (
    <tr
      style={{ background: hovered ? COLORS.surface2 : COLORS.surface, transition: 'background 120ms ease' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* # */}
      <td style={{ ...td, color: COLORS.muted, fontFamily: 'monospace', fontSize: 12, width: 40 }}>{index}</td>

      {/* Subject */}
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, maxWidth: 280 }}>
          {action.is_private && <Lock size={13} style={{ color: COLORS.muted, marginTop: 2, flexShrink: 0 }} />}
          <span style={{ fontWeight: 500, color: COLORS.text, wordBreak: 'break-word', lineHeight: 1.4 }}>{action.subject}</span>
        </div>
      </td>

      {/* Category */}
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 11, background: COLORS.accent + '18', color: COLORS.accent, border: `1px solid ${COLORS.accent}33`, borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
          {categoryName}
        </span>
      </td>

      {/* Status dropdown */}
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <select
          value={action.status}
          onChange={e => onStatusChange(action.id, e.target.value)}
          style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color, borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
        >
          <option value="Open">Open</option>
          <option value="In Progress">In behandeling</option>
          <option value="Completed">Afgerond</option>
        </select>
      </td>

      {/* Progress */}
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <button
            onClick={() => stepProgress(-10)}
            disabled={localProgress <= 0}
            style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 5, fontSize: 14, fontWeight: 700, color: localProgress <= 0 ? COLORS.border : COLORS.text, cursor: localProgress <= 0 ? 'default' : 'pointer', flexShrink: 0 }}
          >−</button>
          <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, width: 34, textAlign: 'center' }}>{localProgress}%</span>
          <button
            onClick={() => stepProgress(10)}
            disabled={localProgress >= 100}
            style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 5, fontSize: 14, fontWeight: 700, color: localProgress >= 100 ? COLORS.border : COLORS.text, cursor: localProgress >= 100 ? 'default' : 'pointer', flexShrink: 0 }}
          >+</button>
          <div style={{ width: 44, height: 4, background: COLORS.surface2, borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ height: '100%', width: `${localProgress}%`, background: COLORS.blue, borderRadius: 99, transition: 'width 200ms ease' }} />
          </div>
        </div>
      </td>

      {/* Due date */}
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        {(() => {
          const days = getDaysUntilDeadline(action.due_date);
          const isOverdue = days !== null && days < 0;
          const isDueSoon = days !== null && days >= 0 && days <= 3;
          const color = isOverdue ? COLORS.danger : isDueSoon ? COLORS.warning : COLORS.textSecondary;
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color, fontWeight: (isOverdue || isDueSoon) ? 600 : 400 }}>
              {formatDate(action.due_date)}
              {isOverdue && <AlertTriangle size={13} title={`${Math.abs(days)} dag(en) verlopen`} />}
              {isDueSoon && !isOverdue && <AlertTriangle size={13} title={`Verloopt over ${days} dag(en)`} />}
            </span>
          );
        })()}
      </td>

      {/* Assigned to */}
      <td style={{ ...td, maxWidth: 180 }}>
        {action.needs_reassignment ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#D97706', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 6, padding: '3px 8px' }}
            title="Gebruiker verwijderd — wijs opnieuw toe via bewerken">
            ⚠ Eigenaar ontbreekt
          </span>
        ) : (
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: COLORS.textSecondary }} title={action.assigned_to_email}>
            {action.assigned_to_email || '—'}
          </span>
        )}
      </td>

      {/* Private */}
      <td style={{ ...td, textAlign: 'center' }}>
        {action.is_private ? <Lock size={14} style={{ color: COLORS.muted }} /> : <span style={{ color: COLORS.border }}>—</span>}
      </td>

      {/* Sync */}
      <td style={{ ...td, textAlign: 'center' }}>
        {action.outlook_task_id ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: COLORS.success, fontWeight: 600 }} title={`ID: ${action.outlook_task_id}`}>
            <RefreshCw size={12} /> Sync
          </span>
        ) : (
          <span style={{ color: COLORS.border, fontSize: 12 }}>—</span>
        )}
      </td>

      {/* Completed at */}
      {hasCompleted && (
        <td style={{ ...td, whiteSpace: 'nowrap', color: COLORS.textSecondary }}>
          {action.completed_at ? formatDate(action.completed_at) : '—'}
        </td>
      )}

      {/* Edit + Delete */}
      <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
        <button
          onClick={() => onEdit(action)}
          style={{ background: 'none', border: 'none', padding: '5px', borderRadius: 6, color: COLORS.muted, cursor: 'pointer', display: 'inline-flex', transition: 'color 140ms ease', marginRight: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = COLORS.blue}
          onMouseLeave={e => e.currentTarget.style.color = COLORS.muted}
          title="Bewerk actie"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={() => onDelete(action.id)}
          style={{ background: 'none', border: 'none', padding: '5px', borderRadius: 6, color: COLORS.muted, cursor: 'pointer', display: 'inline-flex', transition: 'color 140ms ease' }}
          onMouseEnter={e => e.currentTarget.style.color = COLORS.danger}
          onMouseLeave={e => e.currentTarget.style.color = COLORS.muted}
          title="Verwijder actie"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
}
