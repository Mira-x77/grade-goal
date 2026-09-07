/**
 * Notification Service
 * Fetches admin-sent notifications from Supabase and tracks read state.
 */

import { supabase } from '@/integrations/supabase/client';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  target: string;
  icon: string | null;
  image_url: string | null;
  action_url: string | null;
  created_at: string;
  expires_at: string | null;
  is_read: boolean;
}

function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    ),
  ]);
}

/**
 * Fetch notifications for a given grading system.
 * Returns notifications targeted at 'all' or the user's specific system.
 */
export async function fetchNotifications(
  userId: string | null,
  gradingSystem: string
): Promise<AppNotification[]> {
  try {
    // Map grading system to notification target
    const systemTarget =
      gradingSystem === 'nigerian_university' ? 'nigerian'
      : gradingSystem === 'french' ? 'french'
      : 'apc';

    const { data: notifications, error } = await withTimeout(
      supabase
        .from('admin_notifications')
        .select('*')
        .or(`target.eq.all,target.eq.${systemTarget}`)
        .order('created_at', { ascending: false })
        .limit(50)
    );

    if (error) throw error;
    if (!notifications || notifications.length === 0) return [];

    // If user is logged in, fetch their read records
    let readIds = new Set<string>();
    if (userId) {
      const { data: reads } = await withTimeout(
        supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', userId)
      );
      readIds = new Set((reads ?? []).map((r: any) => r.notification_id));
    } else {
      // Guest: use localStorage
      try {
        const stored = localStorage.getItem('gostudy_notif_reads');
        const arr: string[] = stored ? JSON.parse(stored) : [];
        readIds = new Set(arr);
      } catch {}
    }

    return notifications.map((n: any) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      target: n.target,
      icon: n.icon,
      image_url: n.image_url,
      action_url: n.action_url,
      created_at: n.created_at,
      expires_at: n.expires_at,
      is_read: readIds.has(n.id),
    }));
  } catch (err) {
    console.warn('Failed to fetch notifications:', err);
    return [];
  }
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(
  userId: string | null,
  notificationId: string
): Promise<void> {
  if (userId) {
    await supabase
      .from('notification_reads')
      .upsert({ user_id: userId, notification_id: notificationId })
      .then(() => {});
  } else {
    // Guest: persist in localStorage
    try {
      const stored = localStorage.getItem('gostudy_notif_reads');
      const arr: string[] = stored ? JSON.parse(stored) : [];
      if (!arr.includes(notificationId)) {
        arr.push(notificationId);
        localStorage.setItem('gostudy_notif_reads', JSON.stringify(arr));
      }
    } catch {}
  }
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(
  userId: string | null,
  notificationIds: string[]
): Promise<void> {
  if (notificationIds.length === 0) return;

  if (userId) {
    const rows = notificationIds.map(id => ({ user_id: userId, notification_id: id }));
    await supabase.from('notification_reads').upsert(rows).then(() => {});
  } else {
    try {
      localStorage.setItem('gostudy_notif_reads', JSON.stringify(notificationIds));
    } catch {}
  }
}
