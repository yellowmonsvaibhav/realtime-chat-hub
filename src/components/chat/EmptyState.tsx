import { Hash } from 'lucide-react';

interface EmptyStateProps {
  type: 'workspace' | 'channel';
}

export function EmptyState({ type }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center bg-background p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center bg-muted">
        <Hash className="h-8 w-8 text-muted-foreground" />
      </div>
      {type === 'workspace' ? (
        <>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Welcome to TeamSync</h2>
          <p className="max-w-md text-muted-foreground">
            Create or select a workspace from the sidebar to get started. Workspaces help you organize your team's conversations.
          </p>
        </>
      ) : (
        <>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Select a channel</h2>
          <p className="max-w-md text-muted-foreground">
            Choose a channel from the sidebar to start chatting with your team.
          </p>
        </>
      )}
    </div>
  );
}
