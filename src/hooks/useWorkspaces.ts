import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  owner_id: string | null;
  created_at: string;
}

export function useWorkspaces() {
  const { profile } = useProfile();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('workspaces')
      .select(`
        *,
        workspace_members!inner(profile_id)
      `)
      .eq('workspace_members.profile_id', profile.id);

    if (error) {
      console.error('Error fetching workspaces:', error);
    } else {
      setWorkspaces(data || []);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const createWorkspace = async (name: string, slug: string, description?: string) => {
    if (!profile) return { error: new Error('No profile') };

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({ name, slug, description, owner_id: profile.id })
      .select()
      .single();

    if (workspaceError) return { error: workspaceError };

    // Add creator as owner member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: workspace.id, profile_id: profile.id, role: 'owner' });

    if (memberError) return { error: memberError };

    // Create default general channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        workspace_id: workspace.id,
        name: 'general',
        description: 'General discussion',
        channel_type: 'public',
        created_by: profile.id
      })
      .select()
      .single();

    if (channelError) return { error: channelError };

    // Add creator to general channel
    await supabase
      .from('channel_members')
      .insert({ channel_id: channel.id, profile_id: profile.id, role: 'owner' });

    await fetchWorkspaces();
    return { data: workspace, error: null };
  };

  return { workspaces, loading, createWorkspace, refetch: fetchWorkspaces };
}
