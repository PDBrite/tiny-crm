-- Enable Row-Level Security for relevant tables
alter table "public"."leads" enable row level security;
alter table "public"."campaigns" enable row level security;
alter table "public"."district_leads" enable row level security;
alter table "public"."touchpoints" enable row level security;
alter table "public"."district_contacts" enable row level security;

-- Function to get the role from the JWT claims
create or replace function get_jwt_claim(claim_name text)
returns jsonb as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> claim_name, null)::jsonb;
$$ language sql stable;

-- Grant usage on the function to the authenticated role
grant execute on function get_jwt_claim(text) to authenticated;

-- Policy for 'admin' users to access all data
create policy "Allow admin full access"
on "public"."leads" for all
to authenticated
using ( (get_jwt_claim('role'::text)) = '"admin"'::jsonb );

create policy "Allow admin full access"
on "public"."campaigns" for all
to authenticated
using ( (get_jwt_claim('role'::text)) = '"admin"'::jsonb );

create policy "Allow admin full access"
on "public"."district_leads" for all
to authenticated
using ( (get_jwt_claim('role'::text)) = '"admin"'::jsonb );

-- Policy for 'member' users to only access 'Avalern' data
create policy "Allow member Avalern access"
on "public"."leads" for all
to authenticated
using (
  (get_jwt_claim('role'::text)) = '"member"'::jsonb and company = 'Avalern'
);

create policy "Allow member Avalern access"
on "public"."campaigns" for all
to authenticated
using (
  (get_jwt_claim('role'::text)) = '"member"'::jsonb and company = 'Avalern'
);

create policy "Allow member Avalern access"
on "public"."district_leads" for all
to authenticated
using (
  (get_jwt_claim('role'::text)) = '"member"'::jsonb and company = 'Avalern'
);

-- RLS for touchpoints is more complex because it does not have a direct company column.
-- We need to check the company from the related lead or district.

create policy "Allow admin full access to touchpoints"
on "public"."touchpoints" for all
to authenticated
using ( (get_jwt_claim('role'::text)) = '"admin"'::jsonb );

create policy "Allow member access to Avalern touchpoints"
on "public"."touchpoints" for all
to authenticated
using (
  (get_jwt_claim('role'::text)) = '"member"'::jsonb and (
    -- Check company from the associated lead
    (
      lead_id is not null and
      exists (
        select 1 from leads l
        where l.id = touchpoints.lead_id and l.company = 'Avalern'
      )
    ) or
    -- Check company from the associated district contact
    (
      district_contact_id is not null and
      exists (
        select 1 from district_leads dl
        join district_contacts dc on dc.district_lead_id = dl.id
        where dc.id = touchpoints.district_contact_id and dl.company = 'Avalern'
      )
    )
  )
);

-- RLS for district_contacts
create policy "Allow admin full access to district contacts"
on "public"."district_contacts" for all
to authenticated
using ( (get_jwt_claim('role'::text)) = '"admin"'::jsonb );

create policy "Allow member Avalern access to district contacts"
on "public"."district_contacts" for all
to authenticated
using (
  (get_jwt_claim('role'::text)) = '"member"'::jsonb and
  exists (
    select 1 from district_leads dl
    where dl.id = district_contacts.district_lead_id and dl.company = 'Avalern'
  )
);
