import { useState } from 'react';
import { useWorkspaces, type Workspace } from '@/hooks/useWorkspaces';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceSidebarProps {
  selectedWorkspace: Workspace | null;
  onSelectWorkspace: (workspace: Workspace) => void;
}

export function WorkspaceSidebar({ selectedWorkspace, onSelectWorkspace }: WorkspaceSidebarProps) {
  const { workspaces, createWorkspace } = useWorkspaces();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { data, error } = await createWorkspace(name, slug);

    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (data) {
      toast({ title: 'Workspace created!' });
      onSelectWorkspace(data);
      setOpen(false);
      setName('');
    }
  };

  return (
    <div className="flex h-full w-16 flex-col items-center border-r border-border bg-sidebar py-3">
      <ScrollArea className="flex-1 w-full">
        <div className="flex flex-col items-center gap-2 px-2">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => onSelectWorkspace(workspace)}
              className={`flex h-10 w-10 items-center justify-center text-sm font-semibold transition-all ${
                selectedWorkspace?.id === workspace.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
              title={workspace.name}
            >
              {workspace.icon_url ? (
                <img src={workspace.icon_url} alt="" className="h-full w-full object-cover" />
              ) : (
                workspace.name.charAt(0).toUpperCase()
              )}
            </button>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="mt-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Plus className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Create Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name" className="text-card-foreground">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Team"
                required
                className="border-input bg-background text-foreground"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Workspace'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
