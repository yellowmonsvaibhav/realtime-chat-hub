import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

interface TypingUser {
  profile_id: string;
  username: string;
}

export function useTypingIndicator(channelId: string | null) {
  const { profile } = useProfile();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`typing:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `channel_id=eq.${channelId}`
        },
        async () => {
          // Refetch typing users
          const { data } = await supabase
            .from('typing_indicators')
            .select(`
              profile_id,
              profiles!inner(username)
            `)
            .eq('channel_id', channelId)
            .neq('profile_id', profile?.id || '');

          if (data) {
            setTypingUsers(data.map((t: any) => ({
              profile_id: t.profile_id,
              username: t.profiles.username
            })));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, profile?.id]);

  const startTyping = useCallback(async () => {
    if (!channelId || !profile) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Upsert typing indicator
    await supabase
      .from('typing_indicators')
      .upsert({
        channel_id: channelId,
        profile_id: profile.id,
        started_at: new Date().toISOString()
      }, { onConflict: 'channel_id,profile_id' });

    // Auto-remove after 3 seconds
    typingTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('channel_id', channelId)
        .eq('profile_id', profile.id);
    }, 3000);
  }, [channelId, profile]);

  const stopTyping = useCallback(async () => {
    if (!channelId || !profile) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await supabase
      .from('typing_indicators')
      .delete()
      .eq('channel_id', channelId)
      .eq('profile_id', profile.id);
  }, [channelId, profile]);

  return { typingUsers, startTyping, stopTyping };
}
