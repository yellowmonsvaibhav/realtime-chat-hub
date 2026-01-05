import { useState } from 'react';
import { type Message } from '@/hooks/useMessages';
import { useReactions } from '@/hooks/useReactions';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreHorizontal, Smile, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀'];

interface MessageItemProps {
  message: Message;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
}

export function MessageItem({ message, onEdit, onDelete }: MessageItemProps) {
  const { profile } = useProfile();
  const { groupedReactions, toggleReaction } = useReactions(message.id);
  const [showActions, setShowActions] = useState(false);

  const isOwnMessage = profile?.id === message.sender_id;
  const sender = message.sender;
  const displayName = sender?.display_name || sender?.username || 'Unknown';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="group relative flex gap-3 px-4 py-2 hover:bg-muted/50"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={sender?.avatar_url || undefined} />
        <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-foreground">{displayName}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
          {message.is_edited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>

        <p className="text-foreground whitespace-pre-wrap break-words">{message.content}</p>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(groupedReactions).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-sm border transition-colors ${
                  data.userIds.includes(profile?.id || '')
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-muted border-border text-muted-foreground hover:border-primary'
                }`}
              >
                <span>{emoji}</span>
                <span className="text-xs">{data.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="absolute right-4 top-1 flex items-center gap-0.5 bg-card border border-border shadow-sm">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 border-border bg-popover" align="end">
              <div className="flex gap-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(emoji)}
                    className="p-1 text-lg hover:bg-muted"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <MessageSquare className="h-4 w-4" />
          </Button>

          {isOwnMessage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-border bg-popover">
                <DropdownMenuItem onClick={() => onEdit(message)} className="text-popover-foreground focus:bg-muted">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
