import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

const TenantContext = createContext(null);

export function TenantProvider({ children, session }) {
  const [tenant, setTenant]           = useState(null);
  const [tenantList, setTenantList]   = useState([]);
  const [needsPicker, setNeedsPicker] = useState(false);
  const [tenantError, setTenantError] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [userRole, setUserRole]       = useState('member');

  useEffect(() => {
    if (!session?.user?.id) { setTenantLoading(false); return; }
    loadTenants(session.user.id);
  }, [session?.user?.id]);

  async function loadTenants(userId) {
    setTenantLoading(true);
    try {
      const { data: memberships, error } = await supabase
        .from('tenant_users')
        .select('tenant_id, role, tenants(id, slug, name, logo_url, primary_color)')
        .eq('user_id', userId);
      if (error) throw error;

      const list = (memberships || []).map(m => ({ ...m.tenants, role: m.role })).filter(t => t.id);
      setTenantList(list);

      if (list.length === 0) {
        setTenantError('Je account is niet gekoppeld aan een organisatie. Neem contact op met je beheerder.');
      } else if (list.length === 1) {
        setTenant(list[0]);
        setUserRole(memberships[0].role);
      } else {
        setNeedsPicker(true);
      }
    } catch (e) {
      setTenantError('Fout bij laden van organisaties: ' + e.message);
    } finally {
      setTenantLoading(false);
    }
  }

  function selectTenant(t) {
    setTenant(t);
    setUserRole(t.role || 'member');
    setNeedsPicker(false);
  }

  return (
    <TenantContext.Provider value={{ tenant, tenantList, needsPicker, tenantError, tenantLoading, selectTenant, userRole }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  return useContext(TenantContext);
}
