import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export interface Reaction {
  id: string;
  message_id: string;
  profile_id: string;
  emoji: string;
}

export function useReactions(messageId: string) {
  const { profile } = useProfile();
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const fetchReactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('reactions')
      .select('*')
      .eq('message_id', messageId);

    if (error) {
      console.error('Error fetching reactions:', error);
    } else {
      setReactions(data || []);
    }
  }, [messageId]);

  useEffect(() => {
    fetchReactions();

    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => fetchReactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, fetchReactions]);

  const toggleReaction = async (emoji: string) => {
    if (!profile) return;

    const existing = reactions.find(r => r.emoji === emoji && r.profile_id === profile.id);

    if (existing) {
      await supabase
        .from('reactions')
        .delete()
        .eq('id', existing.id);
    } else {
      await supabase
        .from('reactions')
        .insert({ message_id: messageId, profile_id: profile.id, emoji });
    }
  };

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { count: 0, userIds: [] };
    }
    acc[r.emoji].count++;
    acc[r.emoji].userIds.push(r.profile_id);
    return acc;
  }, {} as Record<string, { count: number; userIds: string[] }>);

  return { reactions, groupedReactions, toggleReaction };
}
