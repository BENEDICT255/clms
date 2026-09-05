import { supabase } from '../supabase/client';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface INotificationRepository {
  getNotificationsForUser(userId: string): Promise<NotificationRecord[]>;
  getUnreadCount(userId: string): Promise<number>;
  markAsRead(notificationId: string): Promise<void>;
}

export class SupabaseNotificationRepository implements INotificationRepository {
  async getNotificationsForUser(userId: string): Promise<NotificationRecord[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not query notifications:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      entityType: row.entity_type,
      entityId: row.entity_id,
      isRead: row.is_read,
      createdAt: row.created_at,
      readAt: row.read_at,
    }));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return 0;
    }
    return count || 0;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
  }
}

export const notificationRepository = new SupabaseNotificationRepository();
