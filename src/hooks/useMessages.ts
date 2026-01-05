import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string | null;
  content: string;
  thread_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useMessages(channelId: string | null) {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('channel_id', channelId)
      .eq('is_deleted', false)
      .is('thread_id', null)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }, [channelId]);

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return;

    // Cleanup previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          // Fetch sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', newMessage.sender_id || '')
            .single();

          setMessages(prev => [...prev, { ...newMessage, sender: sender || undefined }]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setMessages(prev => prev.filter(m => m.id !== deleted.id));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async (content: string, threadId?: string) => {
    if (!channelId || !profile) return { error: new Error('Missing channel or profile') };

    const { error } = await supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        sender_id: profile.id,
        content,
        thread_id: threadId || null
      });

    return { error };
  };

  const editMessage = async (messageId: string, content: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ content, is_edited: true })
      .eq('id', messageId);

    return { error };
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', messageId);

    return { error };
  };

  return { messages, loading, sendMessage, editMessage, deleteMessage, refetch: fetchMessages };
}
