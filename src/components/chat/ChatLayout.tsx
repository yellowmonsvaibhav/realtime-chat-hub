import { useState, useEffect } from 'react';
import { useWorkspaces, type Workspace } from '@/hooks/useWorkspaces';
import { useChannels, type Channel } from '@/hooks/useChannels';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { ChannelSidebar } from './ChannelSidebar';
import { ChatView } from './ChatView';
import { EmptyState } from './EmptyState';
import { Loader2 } from 'lucide-react';

export function ChatLayout() {
  const { workspaces, loading: workspacesLoading } = useWorkspaces();
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const { channels, loading: channelsLoading } = useChannels(selectedWorkspace?.id || null);

  // Auto-select first workspace
  useEffect(() => {
    if (!selectedWorkspace && workspaces.length > 0) {
      setSelectedWorkspace(workspaces[0]);
    }
  }, [workspaces, selectedWorkspace]);

  // Auto-select first channel when workspace changes
  useEffect(() => {
    if (channels.length > 0 && (!selectedChannel || selectedChannel.workspace_id !== selectedWorkspace?.id)) {
      setSelectedChannel(channels[0]);
    } else if (channels.length === 0) {
      setSelectedChannel(null);
    }
  }, [channels, selectedWorkspace?.id]);

  const handleSelectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setSelectedChannel(null);
  };

  if (workspacesLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Workspace sidebar */}
      <WorkspaceSidebar
        selectedWorkspace={selectedWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
      />

      {/* Channel sidebar or empty state */}
      {selectedWorkspace ? (
        <ChannelSidebar
          workspace={selectedWorkspace}
          selectedChannel={selectedChannel}
          onSelectChannel={setSelectedChannel}
        />
      ) : null}

      {/* Chat area */}
      {!selectedWorkspace ? (
        <EmptyState type="workspace" />
      ) : !selectedChannel ? (
        <EmptyState type="channel" />
      ) : (
        <ChatView channel={selectedChannel} />
      )}
    </div>
  );
}
