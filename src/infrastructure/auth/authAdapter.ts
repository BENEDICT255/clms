import { supabase } from '../supabase/client';
import { UserProfile, RoleCode, CapabilityCode } from '@/domain/identity/types';
import { AuthenticationError } from '@/shared/errors/ApplicationError';

export interface AuthSession {
  accessToken: string;
  user: UserProfile;
}

export interface IAuthService {
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  getCurrentSession(): Promise<AuthSession | null>;
  getCurrentUserProfile(): Promise<UserProfile | null>;
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;
}

export class SupabaseAuthService implements IAuthService {
  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      throw new AuthenticationError(error?.message || 'Invalid email or password');
    }

    const profile = await this.fetchUserProfile(data.user.id, data.user.email || email);
    return {
      accessToken: data.session.access_token,
      user: profile,
    };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error.message);
    }
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session || !data.session.user) {
      return null;
    }

    const profile = await this.fetchUserProfile(
      data.session.user.id,
      data.session.user.email || ''
    );

    return {
      accessToken: data.session.access_token,
      user: profile,
    };
  }

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const session = await this.getCurrentSession();
    return session ? session.user : null;
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session && session.user) {
        try {
          const profile = await this.fetchUserProfile(session.user.id, session.user.email || '');
          callback({
            accessToken: session.access_token,
            user: profile,
          });
        } catch {
          callback(null);
        }
      } else {
        callback(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  private async fetchUserProfile(userId: string, email: string): Promise<UserProfile> {
    try {
      // 1. Fetch user base profile
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, supplier_id, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.warn('Could not fetch user profile from public.users:', userError.message);
      }

      if (userRow) {
        // 2. Fetch assigned roles
        const { data: assignments, error: roleError } = await supabase
          .from('user_role_assignments')
          .select('role_id, roles(code)')
          .eq('user_id', userId);

        if (roleError) {
          console.warn('Could not fetch user_role_assignments:', roleError.message);
        }

        const roles: RoleCode[] = [];
        const roleIds: string[] = [];

        if (Array.isArray(assignments)) {
          assignments.forEach((a: unknown) => {
            const assignment = a as { role_id?: string; roles?: { code?: string } | null };
            if (assignment.roles?.code) {
              roles.push(assignment.roles.code as RoleCode);
            }
            if (assignment.role_id) {
              roleIds.push(assignment.role_id);
            }
          });
        }

        // 3. Resolve capabilities
        const capabilitiesSet = new Set<CapabilityCode>();

        // If SYSTEM_ADMIN is assigned, grant all platform capabilities
        if (roles.includes('SYSTEM_ADMIN')) {
          const { data: allCaps } = await supabase.from('capabilities').select('code');
          if (Array.isArray(allCaps)) {
            allCaps.forEach((c: unknown) => {
              const cap = c as { code?: string };
              if (cap.code) capabilitiesSet.add(cap.code as CapabilityCode);
            });
          }
        } else if (roleIds.length > 0) {
          const { data: roleCaps } = await supabase
            .from('role_capabilities')
            .select('capabilities(code)')
            .in('role_id', roleIds);

          if (Array.isArray(roleCaps)) {
            roleCaps.forEach((rc: unknown) => {
              const roleCap = rc as { capabilities?: { code?: string } | null };
              if (roleCap.capabilities?.code) {
                capabilitiesSet.add(roleCap.capabilities.code as CapabilityCode);
              }
            });
          }
        }

        // Ensure at least explorer.view if active
        if (capabilitiesSet.size === 0) {
          capabilitiesSet.add('explorer.view');
        }

        return {
          id: userRow.id,
          email: userRow.email,
          fullName: userRow.full_name || email.split('@')[0],
          supplierId: userRow.supplier_id,
          isActive: userRow.is_active ?? true,
          roles,
          capabilities: Array.from(capabilitiesSet),
        };
      }
    } catch (e) {
      console.warn('Could not fetch user profile from database, using authenticated session defaults:', e);
    }

    // Default fallback profile for newly authenticated users awaiting role assignment
    return {
      id: userId,
      email,
      fullName: email.split('@')[0] || 'User',
      supplierId: null,
      isActive: true,
      roles: [],
      capabilities: ['explorer.view'],
    };
  }
}

export const authService = new SupabaseAuthService();
