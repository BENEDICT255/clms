export type RoleCode =
  | 'PROJECT_ENGINEER'
  | 'PROJECT_LEAD'
  | 'HEAD_OF_PROJECTS'
  | 'SUPPLIER_USER'
  | 'SCM_OFFICER'
  | 'FINANCE_OFFICER'
  | 'EXECUTIVE_MANAGEMENT'
  | 'SYSTEM_ADMIN';

export type CapabilityCode =
  | 'package.import'
  | 'package.confirm'
  | 'explorer.view'
  | 'certificate.create'
  | 'certificate.approve.lead'
  | 'certificate.approve.hop'
  | 'certificate.issue'
  | 'certificate.void'
  | 'invoice.create'
  | 'invoice.submit'
  | 'invoice.review.sc'
  | 'invoice.approve.sc'
  | 'invoice.return.sc'
  | 'finance.process'
  | 'payment.post'
  | 'payment.reverse'
  | 'report.view.executive'
  | 'config.manage'
  | 'audit.view.all';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  supplierId: string | null;
  isActive: boolean;
  roles: RoleCode[];
  capabilities: CapabilityCode[];
}

/**
 * Pure authorization check: determines if a user possesses the designated commercial capability.
 */
export function hasCapability(
  user: UserProfile | null | undefined,
  requiredCapability: CapabilityCode
): boolean {
  if (!user || !user.isActive) return false;
  return user.capabilities.includes(requiredCapability);
}

/**
 * Checks whether user is an internal staff member (not bound to any supplier organization).
 */
export function isInternalStaff(user: UserProfile | null | undefined): boolean {
  if (!user || !user.isActive) return false;
  return user.supplierId === null;
}
