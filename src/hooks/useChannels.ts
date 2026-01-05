import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  channel_type: 'public' | 'private' | 'direct';
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
}

export function useChannels(workspaceId: string | null) {
  const { profile } = useProfile();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    if (!workspaceId || !profile) {
      setChannels([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_archived', false)
      .order('name');

    if (error) {
      console.error('Error fetching channels:', error);
    } else {
      setChannels(data || []);
    }
    setLoading(false);
  }, [workspaceId, profile]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const createChannel = async (name: string, description?: string, channelType: 'public' | 'private' = 'public') => {
    if (!workspaceId || !profile) return { error: new Error('Missing workspace or profile') };

    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        workspace_id: workspaceId,
        name: name.toLowerCase().replace(/\s+/g, '-'),
        description,
        channel_type: channelType,
        created_by: profile.id
      })
      .select()
      .single();

    if (channelError) return { error: channelError };

    // Add creator as member
    await supabase
      .from('channel_members')
      .insert({ channel_id: channel.id, profile_id: profile.id, role: 'owner' });

    await fetchChannels();
    return { data: channel, error: null };
  };

  const joinChannel = async (channelId: string) => {
    if (!profile) return { error: new Error('No profile') };

    const { error } = await supabase
      .from('channel_members')
      .insert({ channel_id: channelId, profile_id: profile.id });

    return { error };
  };

  return { channels, loading, createChannel, joinChannel, refetch: fetchChannels };
}
