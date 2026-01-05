-- =============================================
-- PHASE 1: PRODUCTION-GRADE CHAT DATABASE SCHEMA
-- =============================================

-- 1. ENUMS
CREATE TYPE public.channel_type AS ENUM ('public', 'private', 'direct');
CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'member');

-- 2. PROFILES TABLE (user metadata)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline',
  status_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. WORKSPACES TABLE
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. WORKSPACE MEMBERS TABLE
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role member_role DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, profile_id)
);

-- 5. CHANNELS TABLE
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  channel_type channel_type DEFAULT 'public' NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, name)
);

-- 6. CHANNEL MEMBERS TABLE
CREATE TABLE public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role member_role DEFAULT 'member' NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notifications_enabled BOOLEAN DEFAULT true NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(channel_id, profile_id)
);

-- 7. MESSAGES TABLE
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  thread_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT false NOT NULL,
  is_deleted BOOLEAN DEFAULT false NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 8. REACTIONS TABLE
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(message_id, profile_id, emoji)
);

-- 9. READ RECEIPTS TABLE
CREATE TABLE public.read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(channel_id, profile_id)
);

-- 10. TYPING INDICATORS TABLE (for realtime)
CREATE TABLE public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(channel_id, profile_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_channel_members_channel_id ON public.channel_members(channel_id);
CREATE INDEX idx_channel_members_profile_id ON public.channel_members(profile_id);
CREATE INDEX idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_profile_id ON public.workspace_members(profile_id);
CREATE INDEX idx_reactions_message_id ON public.reactions(message_id);
CREATE INDEX idx_read_receipts_channel_id ON public.read_receipts(channel_id);
CREATE INDEX idx_typing_indicators_channel_id ON public.typing_indicators(channel_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Helper function to get profile ID from auth.uid()
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Helper function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id
    AND profile_id = public.get_my_profile_id()
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Helper function to check channel membership
CREATE OR REPLACE FUNCTION public.is_channel_member(_channel_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = _channel_id
    AND profile_id = public.get_my_profile_id()
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- PROFILES POLICIES
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- WORKSPACES POLICIES
CREATE POLICY "Members can view workspaces" ON public.workspaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(id));

CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can update workspaces" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = public.get_my_profile_id());

-- WORKSPACE MEMBERS POLICIES
CREATE POLICY "Members can view workspace members" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can join workspaces" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.get_my_profile_id());

CREATE POLICY "Members can leave workspaces" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- CHANNELS POLICIES
CREATE POLICY "Members can view channels" ON public.channels
  FOR SELECT TO authenticated
  USING (
    channel_type = 'public' AND public.is_workspace_member(workspace_id)
    OR public.is_channel_member(id)
  );

CREATE POLICY "Members can create channels" ON public.channels
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Channel admins can update channels" ON public.channels
  FOR UPDATE TO authenticated
  USING (created_by = public.get_my_profile_id());

-- CHANNEL MEMBERS POLICIES
CREATE POLICY "Channel members can view members" ON public.channel_members
  FOR SELECT TO authenticated
  USING (public.is_channel_member(channel_id));

CREATE POLICY "Members can join public channels" ON public.channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = public.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id
      AND (c.channel_type = 'public' AND public.is_workspace_member(c.workspace_id))
    )
  );

CREATE POLICY "Members can leave channels" ON public.channel_members
  FOR DELETE TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- MESSAGES POLICIES
CREATE POLICY "Channel members can view messages" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_channel_member(channel_id));

CREATE POLICY "Channel members can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_channel_member(channel_id)
    AND sender_id = public.get_my_profile_id()
  );

CREATE POLICY "Senders can update own messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = public.get_my_profile_id());

CREATE POLICY "Senders can delete own messages" ON public.messages
  FOR DELETE TO authenticated
  USING (sender_id = public.get_my_profile_id());

-- REACTIONS POLICIES
CREATE POLICY "Channel members can view reactions" ON public.reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
      AND public.is_channel_member(m.channel_id)
    )
  );

CREATE POLICY "Channel members can add reactions" ON public.reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = public.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
      AND public.is_channel_member(m.channel_id)
    )
  );

CREATE POLICY "Users can remove own reactions" ON public.reactions
  FOR DELETE TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- READ RECEIPTS POLICIES
CREATE POLICY "Users can view own read receipts" ON public.read_receipts
  FOR SELECT TO authenticated
  USING (profile_id = public.get_my_profile_id());

CREATE POLICY "Users can update own read receipts" ON public.read_receipts
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.get_my_profile_id());

CREATE POLICY "Users can upsert own read receipts" ON public.read_receipts
  FOR UPDATE TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- TYPING INDICATORS POLICIES
CREATE POLICY "Channel members can view typing" ON public.typing_indicators
  FOR SELECT TO authenticated
  USING (public.is_channel_member(channel_id));

CREATE POLICY "Users can update own typing" ON public.typing_indicators
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = public.get_my_profile_id()
    AND public.is_channel_member(channel_id)
  );

CREATE POLICY "Users can delete own typing" ON public.typing_indicators
  FOR DELETE TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- =============================================
-- ENABLE REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;