-- =============================================
-- Push Notifications System
-- =============================================

-- 1. User devices table for storing push tokens
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, expo_push_token)
);

-- Enable RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Users can manage their own devices
CREATE POLICY "Users can view own devices" ON user_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON user_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON user_devices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON user_devices
    FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_token ON user_devices(expo_push_token);

-- 2. Notifications table for storing all notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('tour', 'promo', 'system', 'reminder')),
    icon TEXT DEFAULT 'notifications-outline',
    target TEXT NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'user', 'segment')),
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    deep_link TEXT,
    data JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Admin can manage all notifications
CREATE POLICY "Admin can manage notifications" ON notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Users can view notifications targeted to them or all users
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (
        target = 'all' 
        OR (target = 'user' AND target_user_id = auth.uid())
    );

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 3. User notification status (read/unread tracking)
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, notification_id)
);

-- Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can manage their own notification status
CREATE POLICY "Users can view own notification status" ON user_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification status" ON user_notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification status" ON user_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id ON user_notifications(notification_id);

-- 4. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_user_devices_updated_at ON user_devices;
CREATE TRIGGER trigger_user_devices_updated_at
    BEFORE UPDATE ON user_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
