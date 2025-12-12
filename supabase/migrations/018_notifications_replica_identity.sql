-- Migration: Enable REPLICA IDENTITY FULL and Realtime for notifications table
-- This is required for Supabase Realtime to include old values in UPDATE events
-- Without this, payload.old will be empty in realtime subscriptions

-- Enable REPLICA IDENTITY FULL on notifications table
-- This allows realtime subscriptions to receive both old and new values on UPDATE
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Also enable for user_notifications table for consistency
ALTER TABLE user_notifications REPLICA IDENTITY FULL;

-- Enable Realtime for notifications table
-- This is required for postgres_changes to work
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable Realtime for user_notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
