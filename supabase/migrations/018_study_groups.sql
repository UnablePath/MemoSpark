-- Create study_groups table
CREATE TABLE
  study_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
  );

-- Create study_group_members table
CREATE TABLE
  study_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    group_id UUID REFERENCES study_groups (id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- member, admin
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, user_id)
  );

-- Create study_group_invitations table
CREATE TABLE
  study_group_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    group_id UUID REFERENCES study_groups (id) ON DELETE CASCADE,
    inviter_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    invitee_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

-- Create study_group_resources table
CREATE TABLE
  study_group_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    group_id UUID REFERENCES study_groups (id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- file, link, note
    title TEXT NOT NULL,
    content TEXT,
    url TEXT,
    file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

-- Create study_group_schedule table
CREATE TABLE
  study_group_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    group_id UUID REFERENCES study_groups (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

-- Create study_group_achievements table
CREATE TABLE
  study_group_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    group_id UUID REFERENCES study_groups (id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements (id) ON DELETE CASCADE,
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    awarded_by UUID REFERENCES auth.users (id) ON DELETE CASCADE
  );

-- RLS for study_groups
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members to view group" ON study_groups FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        study_group_members
      WHERE
        study_group_members.group_id = study_groups.id
        AND study_group_members.user_id = auth.uid ()
    )
  );

CREATE POLICY "Allow creator to manage group" ON study_groups FOR ALL USING (created_by = auth.uid ())
WITH
  CHECK (created_by = auth.uid ());

-- RLS for study_group_members
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members to view other members" ON study_group_members FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        study_group_members AS sgm
      WHERE
        sgm.group_id = study_group_members.group_id
        AND sgm.user_id = auth.uid ()
    )
  );

CREATE POLICY "Allow admin to manage members" ON study_group_members FOR ALL USING (
  EXISTS (
    SELECT
      1
    FROM
      study_group_members AS sgm
    WHERE
      sgm.group_id = study_group_members.group_id
      AND sgm.user_id = auth.uid ()
      AND sgm.role = 'admin'
  )
)
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        study_group_members AS sgm
      WHERE
        sgm.group_id = study_group_members.group_id
        AND sgm.user_id = auth.uid ()
        AND sgm.role = 'admin'
    )
  );

-- RLS for other tables...
-- (Similar policies for invitations, resources, schedule, achievements)
-- For brevity, only showing a few examples. Full implementation would secure all tables.
-- RLS for study_group_invitations
ALTER TABLE study_group_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow inviter/invitee to manage invitations" ON study_group_invitations
FOR ALL USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- RLS for study_group_resources
ALTER TABLE study_group_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow members to access resources" ON study_group_resources
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM study_group_members
    WHERE study_group_members.group_id = study_group_resources.group_id
    AND study_group_members.user_id = auth.uid()
  )
);

-- RLS for study_group_schedule
ALTER TABLE study_group_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow members to access schedule" ON study_group_schedule
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM study_group_members
    WHERE study_group_members.group_id = study_group_schedule.group_id
    AND study_group_members.user_id = auth.uid()
  )
);

-- RLS for study_group_achievements
ALTER TABLE study_group_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow members to access achievements" ON study_group_achievements
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM study_group_members
    WHERE study_group_members.group_id = study_group_achievements.group_id
    AND study_group_members.user_id = auth.uid()
  )
); 