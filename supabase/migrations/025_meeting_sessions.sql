-- =============================================
-- Meeting Sessions (Community Bulusma)
-- =============================================

-- Enums
DO $$ BEGIN
  CREATE TYPE meeting_status AS ENUM ('draft', 'active', 'ended', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE meeting_role AS ENUM ('host', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE meeting_participant_status AS ENUM ('joined', 'left', 'removed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Sessions
CREATE TABLE IF NOT EXISTS meeting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  destination_text TEXT NOT NULL,
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  scheduled_at TIMESTAMPTZ,
  status meeting_status NOT NULL DEFAULT 'draft',
  max_participants INTEGER NOT NULL DEFAULT 3 CHECK (max_participants > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES meeting_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role meeting_role NOT NULL DEFAULT 'member',
  status meeting_participant_status NOT NULL DEFAULT 'joined',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Invites
CREATE TABLE IF NOT EXISTS meeting_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES meeting_sessions(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_host_id ON meeting_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_status ON meeting_sessions(status);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_session_id ON meeting_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invites_session_id ON meeting_invites(session_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invites_code ON meeting_invites(code);

-- Updated at triggers
DROP TRIGGER IF EXISTS trigger_meeting_sessions_updated_at ON meeting_sessions;
CREATE TRIGGER trigger_meeting_sessions_updated_at
  BEFORE UPDATE ON meeting_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_meeting_participants_updated_at ON meeting_participants;
CREATE TRIGGER trigger_meeting_participants_updated_at
  BEFORE UPDATE ON meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper: check membership
CREATE OR REPLACE FUNCTION public.is_meeting_member(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM meeting_sessions ms
    WHERE ms.id = p_session_id AND ms.host_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM meeting_participants mp
    WHERE mp.session_id = p_session_id AND mp.user_id = p_user_id AND mp.status = 'joined'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE meeting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_invites ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Members can view their sessions"
  ON meeting_sessions FOR SELECT
  USING (is_meeting_member(id, auth.uid()));

CREATE POLICY "Hosts can create sessions"
  ON meeting_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update sessions"
  ON meeting_sessions FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can delete sessions"
  ON meeting_sessions FOR DELETE
  USING (auth.uid() = host_id);

-- Participants policies
CREATE POLICY "Members can view participants"
  ON meeting_participants FOR SELECT
  USING (is_meeting_member(session_id, auth.uid()));

CREATE POLICY "Users can join sessions"
  ON meeting_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update participant status"
  ON meeting_participants FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM meeting_sessions ms
      WHERE ms.id = session_id AND ms.host_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM meeting_sessions ms
      WHERE ms.id = session_id AND ms.host_id = auth.uid()
    )
  );

-- Invites policies (host only)
CREATE POLICY "Hosts can view invites"
  ON meeting_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meeting_sessions ms
      WHERE ms.id = session_id AND ms.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can create invites"
  ON meeting_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meeting_sessions ms
      WHERE ms.id = session_id AND ms.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update invites"
  ON meeting_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meeting_sessions ms
      WHERE ms.id = session_id AND ms.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meeting_sessions ms
      WHERE ms.id = session_id AND ms.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can delete invites"
  ON meeting_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM meeting_sessions ms
      WHERE ms.id = session_id AND ms.host_id = auth.uid()
    )
  );

-- RPC: create session with invite
CREATE OR REPLACE FUNCTION public.create_meeting_session(
  p_title TEXT,
  p_description TEXT,
  p_destination_text TEXT,
  p_invite_code TEXT,
  p_destination_lat DECIMAL DEFAULT NULL,
  p_destination_lng DECIMAL DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (session_id UUID) AS $$
DECLARE
  v_session_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM meeting_sessions
    WHERE host_id = auth.uid() AND status IN ('draft', 'active')
  ) THEN
    RAISE EXCEPTION 'Host already has an active session';
  END IF;

  INSERT INTO meeting_sessions (
    host_id,
    title,
    description,
    destination_text,
    destination_lat,
    destination_lng,
    scheduled_at,
    status,
    max_participants
  ) VALUES (
    auth.uid(),
    p_title,
    p_description,
    p_destination_text,
    p_destination_lat,
    p_destination_lng,
    p_scheduled_at,
    'draft',
    3
  )
  RETURNING id INTO v_session_id;

  INSERT INTO meeting_participants (session_id, user_id, role, status)
  VALUES (v_session_id, auth.uid(), 'host', 'joined');

  INSERT INTO meeting_invites (session_id, code, created_by)
  VALUES (v_session_id, p_invite_code, auth.uid());

  RETURN QUERY SELECT v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: join by invite code
CREATE OR REPLACE FUNCTION public.join_meeting_session(p_invite_code TEXT)
RETURNS TABLE (session_id UUID) AS $$
DECLARE
  v_session_id UUID;
  v_status meeting_status;
  v_max_participants INTEGER;
  v_joined_count INTEGER;
  v_participant_status meeting_participant_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT mi.session_id
  INTO v_session_id
  FROM meeting_invites mi
  WHERE mi.code = p_invite_code
    AND mi.revoked_at IS NULL
    AND (mi.expires_at IS NULL OR mi.expires_at > NOW())
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite';
  END IF;

  SELECT status, max_participants
  INTO v_status, v_max_participants
  FROM meeting_sessions
  WHERE id = v_session_id;

  IF v_status IN ('ended', 'cancelled') THEN
    RAISE EXCEPTION 'Session is not available';
  END IF;

  SELECT status
  INTO v_participant_status
  FROM meeting_participants
  WHERE session_id = v_session_id AND user_id = auth.uid()
  LIMIT 1;

  IF v_participant_status IS NOT NULL THEN
    IF v_participant_status != 'joined' THEN
      UPDATE meeting_participants
      SET status = 'joined', joined_at = NOW()
      WHERE session_id = v_session_id AND user_id = auth.uid();
    END IF;
    RETURN QUERY SELECT v_session_id;
  END IF;

  SELECT COUNT(*) INTO v_joined_count
  FROM meeting_participants
  WHERE session_id = v_session_id AND status = 'joined';

  IF v_joined_count >= v_max_participants THEN
    RAISE EXCEPTION 'Session is full';
  END IF;

  INSERT INTO meeting_participants (session_id, user_id, role, status)
  VALUES (v_session_id, auth.uid(), 'member', 'joined');

  RETURN QUERY SELECT v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON meeting_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meeting_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meeting_invites TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_meeting_session(
  TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, TIMESTAMPTZ
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_meeting_session(TEXT) TO authenticated;
