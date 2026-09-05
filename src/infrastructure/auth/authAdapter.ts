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
      // Query profile with roles and capabilities
      interface RoleCapabilityRow {
        capabilities?: {
          code: string;
        } | null;
      }

      interface RoleRow {
        code: string;
        role_capabilities?: RoleCapabilityRow[] | null;
      }

      interface UserRoleAssignmentRow {
        roles?: RoleRow | null;
      }

      interface UserProfileRow {
        id: string;
        email: string;
        full_name: string;
        supplier_id: string | null;
        is_active: boolean;
        user_role_assignments?: UserRoleAssignmentRow[] | null;
      }

      const { data: userRow } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          supplier_id,
          is_active,
          user_role_assignments (
            roles (
              code,
              role_capabilities (
                capabilities (
                  code
                )
              )
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (userRow) {
        const typedUserRow = userRow as unknown as UserProfileRow;
        const roles: RoleCode[] = [];
        const capabilitiesSet = new Set<CapabilityCode>();

        if (Array.isArray(typedUserRow.user_role_assignments)) {
          typedUserRow.user_role_assignments.forEach((ura) => {
            if (ura.roles) {
              roles.push(ura.roles.code as RoleCode);
              if (Array.isArray(ura.roles.role_capabilities)) {
                ura.roles.role_capabilities.forEach((rc) => {
                  if (rc.capabilities?.code) {
                    capabilitiesSet.add(rc.capabilities.code as CapabilityCode);
                  }
                });
              }
            }
          });
        }

        return {
          id: typedUserRow.id,
          email: typedUserRow.email,
          fullName: typedUserRow.full_name,
          supplierId: typedUserRow.supplier_id,
          isActive: typedUserRow.is_active,
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
