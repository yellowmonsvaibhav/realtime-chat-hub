import { useState } from 'react';
import { useChannels, type Channel } from '@/hooks/useChannels';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { type Workspace } from '@/hooks/useWorkspaces';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Hash, Plus, Lock, ChevronDown, LogOut, Settings } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface ChannelSidebarProps {
  workspace: Workspace;
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

export function ChannelSidebar({ workspace, selectedChannel, onSelectChannel }: ChannelSidebarProps) {
  const { channels, createChannel } = useChannels(workspace.id);
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await createChannel(name, description);

    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (data) {
      toast({ title: 'Channel created!' });
      onSelectChannel(data);
      setOpen(false);
      setName('');
      setDescription('');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-full w-60 flex-col border-r border-border bg-sidebar">
      {/* Workspace Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 text-sm font-semibold text-sidebar-foreground hover:text-foreground">
              {workspace.name}
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 border-border bg-popover">
            <DropdownMenuItem className="text-popover-foreground focus:bg-muted">
              <Settings className="mr-2 h-4 w-4" />
              Workspace Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Channels List */}
      <ScrollArea className="flex-1 px-2 py-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">Channels</span>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-card">
              <DialogHeader>
                <DialogTitle className="text-card-foreground">Create Channel</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="channel-name" className="text-card-foreground">Channel Name</Label>
                  <Input
                    id="channel-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="design-team"
                    required
                    className="border-input bg-background text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channel-desc" className="text-card-foreground">Description (optional)</Label>
                  <Textarea
                    id="channel-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this channel about?"
                    className="border-input bg-background text-foreground"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Channel'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-0.5">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel)}
              className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors ${
                selectedChannel?.id === channel.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-muted'
              }`}
            >
              {channel.channel_type === 'private' ? (
                <Lock className="h-4 w-4 shrink-0 opacity-70" />
              ) : (
                <Hash className="h-4 w-4 shrink-0 opacity-70" />
              )}
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* User Profile */}
      {profile && (
        <div className="flex items-center gap-2 border-t border-border p-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {profile.display_name?.charAt(0) || profile.username.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile.display_name || profile.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile.status || 'Online'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
