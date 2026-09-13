-- ==============================================================================
-- CLMS Persona Seed: Supplier, Projects, Supply Chain, and Finance
-- ==============================================================================
-- Governed by AGENTS.md & PRODUCT.md:
-- Creates 4 dedicated operational personas with pure role separation:
-- 1. supplier@heliosclms.com    -> SUPPLIER_USER (Bound to Prime Power T Ltd)
-- 2. projects@heliosclms.com    -> PROJECT_LEAD & PROJECT_ENGINEER
-- 3. supplychain@heliosclms.com -> SCM_OFFICER
-- 4. finance@heliosclms.com     -> FINANCE_OFFICER
-- Default Password for all: Password@123
-- ==============================================================================

DO $$
DECLARE
  v_enc_pw TEXT;
  v_supplier_role_id UUID;
  v_lead_role_id UUID;
  v_eng_role_id UUID;
  v_scm_role_id UUID;
  v_fin_role_id UUID;
  v_prime_supplier_id UUID;

  v_supp_user_id UUID := '11111111-1111-1111-1111-111111111111';
  v_proj_user_id UUID := '22222222-2222-2222-2222-222222222222';
  v_scm_user_id  UUID := '33333333-3333-3333-3333-333333333333';
  v_fin_user_id  UUID := '44444444-4444-4444-4444-444444444444';
BEGIN
  -- 1. Compute encrypted password hash for Password@123
  BEGIN
    v_enc_pw := extensions.crypt('Password@123', extensions.gen_salt('bf'));
  EXCEPTION WHEN OTHERS THEN
    v_enc_pw := crypt('Password@123', gen_salt('bf'));
  END;

  -- 2. Lookup role IDs
  SELECT id INTO v_supplier_role_id FROM public.roles WHERE code = 'SUPPLIER_USER';
  SELECT id INTO v_lead_role_id     FROM public.roles WHERE code = 'PROJECT_LEAD';
  SELECT id INTO v_eng_role_id      FROM public.roles WHERE code = 'PROJECT_ENGINEER';
  SELECT id INTO v_scm_role_id      FROM public.roles WHERE code = 'SCM_OFFICER';
  SELECT id INTO v_fin_role_id      FROM public.roles WHERE code = 'FINANCE_OFFICER';

  -- 3. Lookup Prime Power T Ltd supplier ID
  SELECT id INTO v_prime_supplier_id FROM public.suppliers WHERE vendor_code = 'S4.P01007' LIMIT 1;
  IF v_prime_supplier_id IS NULL THEN
    SELECT id INTO v_prime_supplier_id FROM public.suppliers LIMIT 1;
  END IF;

  -- ---------------------------------------------------------------------------
  -- PERSONA 1: SUPPLIER USER (supplier@heliosclms.com)
  -- ---------------------------------------------------------------------------
  DELETE FROM auth.identities WHERE user_id = v_supp_user_id OR provider_id = v_supp_user_id::text OR provider_id = 'supplier@heliosclms.com';
  DELETE FROM auth.users WHERE email = 'supplier@heliosclms.com' AND id <> v_supp_user_id;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_supp_user_id,
    'authenticated',
    'authenticated',
    'supplier@heliosclms.com',
    v_enc_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Prime Power Commercial Rep"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email = EXCLUDED.email,
    email_confirmed_at = now(),
    updated_at = now();

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_supp_user_id,
    v_supp_user_id,
    jsonb_build_object('sub', v_supp_user_id::text, 'email', 'supplier@heliosclms.com'),
    'email',
    v_supp_user_id::text,
    now(),
    now(),
    now()
  );

  INSERT INTO public.users (id, email, full_name, supplier_id, is_active)
  VALUES (
    v_supp_user_id,
    'supplier@heliosclms.com',
    'Prime Power Commercial Rep',
    v_prime_supplier_id,
    true
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    supplier_id = EXCLUDED.supplier_id,
    is_active = true;

  INSERT INTO public.user_role_assignments (user_id, role_id)
  VALUES (v_supp_user_id, v_supplier_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- PERSONA 2: PROJECTS LEAD & ENGINEER (projects@heliosclms.com)
  -- ---------------------------------------------------------------------------
  DELETE FROM auth.identities WHERE user_id = v_proj_user_id OR provider_id = v_proj_user_id::text OR provider_id = 'projects@heliosclms.com';
  DELETE FROM auth.users WHERE email = 'projects@heliosclms.com' AND id <> v_proj_user_id;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_proj_user_id,
    'authenticated',
    'authenticated',
    'projects@heliosclms.com',
    v_enc_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Helios Project Lead"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email = EXCLUDED.email,
    email_confirmed_at = now(),
    updated_at = now();

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_proj_user_id,
    v_proj_user_id,
    jsonb_build_object('sub', v_proj_user_id::text, 'email', 'projects@heliosclms.com'),
    'email',
    v_proj_user_id::text,
    now(),
    now(),
    now()
  );

  INSERT INTO public.users (id, email, full_name, supplier_id, is_active)
  VALUES (
    v_proj_user_id,
    'projects@heliosclms.com',
    'Helios Project Lead',
    NULL,
    true
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    supplier_id = NULL,
    is_active = true;

  INSERT INTO public.user_role_assignments (user_id, role_id)
  VALUES 
    (v_proj_user_id, v_lead_role_id),
    (v_proj_user_id, v_eng_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- PERSONA 3: SUPPLY CHAIN SPECIALIST (supplychain@heliosclms.com)
  -- ---------------------------------------------------------------------------
  DELETE FROM auth.identities WHERE user_id = v_scm_user_id OR provider_id = v_scm_user_id::text OR provider_id = 'supplychain@heliosclms.com';
  DELETE FROM auth.users WHERE email = 'supplychain@heliosclms.com' AND id <> v_scm_user_id;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_scm_user_id,
    'authenticated',
    'authenticated',
    'supplychain@heliosclms.com',
    v_enc_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Helios Supply Chain Specialist"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email = EXCLUDED.email,
    email_confirmed_at = now(),
    updated_at = now();

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_scm_user_id,
    v_scm_user_id,
    jsonb_build_object('sub', v_scm_user_id::text, 'email', 'supplychain@heliosclms.com'),
    'email',
    v_scm_user_id::text,
    now(),
    now(),
    now()
  );

  INSERT INTO public.users (id, email, full_name, supplier_id, is_active)
  VALUES (
    v_scm_user_id,
    'supplychain@heliosclms.com',
    'Helios Supply Chain Specialist',
    NULL,
    true
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    supplier_id = NULL,
    is_active = true;

  INSERT INTO public.user_role_assignments (user_id, role_id)
  VALUES (v_scm_user_id, v_scm_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- PERSONA 4: FINANCE OFFICER (finance@heliosclms.com)
  -- ---------------------------------------------------------------------------
  DELETE FROM auth.identities WHERE user_id = v_fin_user_id OR provider_id = v_fin_user_id::text OR provider_id = 'finance@heliosclms.com';
  DELETE FROM auth.users WHERE email = 'finance@heliosclms.com' AND id <> v_fin_user_id;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_fin_user_id,
    'authenticated',
    'authenticated',
    'finance@heliosclms.com',
    v_enc_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Helios Finance Officer"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email = EXCLUDED.email,
    email_confirmed_at = now(),
    updated_at = now();

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_fin_user_id,
    v_fin_user_id,
    jsonb_build_object('sub', v_fin_user_id::text, 'email', 'finance@heliosclms.com'),
    'email',
    v_fin_user_id::text,
    now(),
    now(),
    now()
  );

  INSERT INTO public.users (id, email, full_name, supplier_id, is_active)
  VALUES (
    v_fin_user_id,
    'finance@heliosclms.com',
    'Helios Finance Officer',
    NULL,
    true
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    supplier_id = NULL,
    is_active = true;

  INSERT INTO public.user_role_assignments (user_id, role_id)
  VALUES (v_fin_user_id, v_fin_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

END $$;
