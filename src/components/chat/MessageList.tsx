import { useEffect, useRef } from 'react';
import { useMessages, type Message } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { MessageItem } from './MessageItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const { messages, loading, editMessage, deleteMessage } = useMessages(channelId);
  const { typingUsers } = useTypingIndicator(channelId);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleEdit = async (message: Message) => {
    const newContent = prompt('Edit message:', message.content);
    if (newContent && newContent !== message.content) {
      const { error } = await editMessage(message.id, newContent);
      if (error) {
        toast({ title: 'Error editing message', description: error.message, variant: 'destructive' });
      }
    }
  };

  const handleDelete = async (messageId: string) => {
    if (confirm('Delete this message?')) {
      const { error } = await deleteMessage(messageId);
      if (error) {
        toast({ title: 'Error deleting message', description: error.message, variant: 'destructive' });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="flex flex-col py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">Be the first to send a message!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            <span className="italic">
              {typingUsers.length === 1
                ? `${typingUsers[0].username} is typing...`
                : typingUsers.length === 2
                ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
                : 'Several people are typing...'}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
