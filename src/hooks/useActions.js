import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';

/**
 * Custom hook that wraps Supabase Actions queries.
 * Provides loading, error, and CRUD helpers.
 *
 * Usage:
 *   const { actions, loading, error, reload, createAction, updateAction, deleteAction } = useActions();
 */
export function useActions() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all actions ordered by creation date, newest first
  const loadActions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('Actions')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setActions(data ?? []);
    }

    setLoading(false);
  }, []);

  // Load on first mount
  useEffect(() => {
    loadActions();
  }, [loadActions]);

  /**
   * Insert a new action row.
   * Returns the inserted row or throws on error.
   */
  const createAction = async (actionData) => {
    const { data, error: insertError } = await supabase
      .from('Actions')
      .insert([actionData])
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    // Prepend to local state for immediate feedback
    setActions((prev) => [data, ...prev]);
    return data;
  };

  /**
   * Update specific fields of an action by id.
   * Applies an optimistic local update before confirming with Supabase.
   */
  const updateAction = async (id, updates) => {
    // Optimistic update — change locally first for snappy UI
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));

    const { error: updateError } = await supabase
      .from('Actions')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      // Revert optimistic update on failure
      await loadActions();
      throw new Error(updateError.message);
    }
  };

  /**
   * Delete an action by id.
   * Removes from local state immediately and confirms with Supabase.
   */
  const deleteAction = async (id) => {
    setActions((prev) => prev.filter((a) => a.id !== id));

    const { error: deleteError } = await supabase
      .from('Actions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      // Revert optimistic delete on failure
      await loadActions();
      throw new Error(deleteError.message);
    }
  };

  return {
    actions,
    loading,
    error,
    reload: loadActions,
    createAction,
    updateAction,
    deleteAction,
  };
}
