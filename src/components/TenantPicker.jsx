import React from 'react';
import { useTenantContext } from '../context/TenantContext.jsx';

export default function TenantPicker() {
  const { tenantList, selectTenant } = useTenantContext();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0C0D10' }}>
      <div style={{ width: '100%', maxWidth: 520, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#C8A96E', letterSpacing: '0.12em', marginBottom: 6 }}>LEAGL</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Kies je organisatie</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Je bent lid van meerdere organisaties. Kies welke je wil openen.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tenantList.map(t => (
            <button key={t.id}
              onClick={() => selectTenant(t)}
              style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#FFFFFF', border: '2px solid #E4E1DC', borderRadius: 14, padding: '18px 22px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 140ms, box-shadow 140ms', boxShadow: 'none', width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.primary_color || '#C8A96E'; e.currentTarget.style.boxShadow = `0 0 0 3px ${(t.primary_color || '#C8A96E')}30`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4E1DC'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 46, height: 46, borderRadius: 12, background: (t.primary_color || '#C8A96E') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {t.logo_url
                  ? <img src={t.logo_url} alt={t.name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                  : <span style={{ fontSize: 20, fontWeight: 800, color: t.primary_color || '#C8A96E' }}>{t.name[0]}</span>
                }
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#141210' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#8A8480', marginTop: 2 }}>{t.slug}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
