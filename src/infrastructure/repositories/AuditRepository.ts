import { supabase } from '../supabase/client';

export interface AuditEventRecord {
  id: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  action: string;
  preState?: Record<string, unknown>;
  postState?: Record<string, unknown>;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface IAuditRepository {
  recordEvent(event: Omit<AuditEventRecord, 'id' | 'createdAt'>): Promise<void>;
  getEventsForEntity(entityType: string, entityId: string): Promise<AuditEventRecord[]>;
}

export class SupabaseAuditRepository implements IAuditRepository {
  async recordEvent(event: Omit<AuditEventRecord, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await supabase.from('audit_events').insert({
      entity_type: event.entityType,
      entity_id: event.entityId,
      actor_id: event.actorId,
      action: event.action,
      pre_state: event.preState,
      post_state: event.postState,
      correlation_id: event.correlationId,
      metadata: event.metadata,
    });

    if (error) {
      console.error('Failed to write immutable audit log event:', error.message);
    }
  }

  async getEventsForEntity(entityType: string, entityId: string): Promise<AuditEventRecord[]> {
    const { data, error } = await supabase
      .from('audit_events')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not query audit log:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      actorId: row.actor_id,
      action: row.action,
      preState: row.pre_state,
      postState: row.post_state,
      correlationId: row.correlation_id,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  }
}

export const auditRepository = new SupabaseAuditRepository();
