import { describe, it, expect } from 'vitest';
import { hasCapability, isInternalStaff, UserProfile } from '@/domain/identity/types';

describe('Identity & Capability Domain Logic', () => {
  const activeUser: UserProfile = {
    id: 'usr-1',
    email: 'lead@heliostowers.com',
    fullName: 'Project Lead',
    supplierId: null,
    isActive: true,
    roles: ['PROJECT_LEAD'],
    capabilities: ['package.import', 'certificate.create', 'certificate.approve.lead'],
  };

  const supplierUser: UserProfile = {
    id: 'usr-2',
    email: 'vendor@primepower.co.tz',
    fullName: 'Prime Power Agent',
    supplierId: 'supp-99',
    isActive: true,
    roles: ['SUPPLIER_USER'],
    capabilities: ['explorer.view', 'invoice.create', 'invoice.submit'],
  };

  const inactiveUser: UserProfile = {
    ...activeUser,
    id: 'usr-3',
    isActive: false,
  };

  it('correctly validates granted capabilities', () => {
    expect(hasCapability(activeUser, 'package.import')).toBe(true);
    expect(hasCapability(activeUser, 'certificate.approve.lead')).toBe(true);
    expect(hasCapability(activeUser, 'payment.post')).toBe(false);
  });

  it('strictly blocks all capabilities for inactive users', () => {
    expect(hasCapability(inactiveUser, 'package.import')).toBe(false);
    expect(hasCapability(inactiveUser, 'certificate.approve.lead')).toBe(false);
  });

  it('correctly distinguishes internal staff from supplier tenant users', () => {
    expect(isInternalStaff(activeUser)).toBe(true);
    expect(isInternalStaff(supplierUser)).toBe(false);
    expect(isInternalStaff(null)).toBe(false);
  });
});
