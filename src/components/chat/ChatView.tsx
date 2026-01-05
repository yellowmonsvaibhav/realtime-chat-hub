import { type Channel } from '@/hooks/useChannels';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Hash, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatViewProps {
  channel: Channel;
}

export function ChatView({ channel }: ChatViewProps) {
  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Channel Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          {channel.channel_type === 'private' ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Hash className="h-5 w-5 text-muted-foreground" />
          )}
          <h2 className="font-semibold text-foreground">{channel.name}</h2>
          {channel.description && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm text-muted-foreground truncate max-w-md">
                {channel.description}
              </span>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Users className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <MessageList channelId={channel.id} />

      {/* Input */}
      <MessageInput channelId={channel.id} channelName={channel.name} />
    </div>
  );
}
