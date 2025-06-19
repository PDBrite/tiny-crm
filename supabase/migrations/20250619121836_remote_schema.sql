alter table "public"."campaigns" alter column "status" drop default;

alter type "public"."campaign_status_type" rename to "campaign_status_type__old_version_to_be_dropped";

create type "public"."campaign_status_type" as enum ('active', 'queued', 'completed', 'paused');

create table "public"."app_users" (
    "id" uuid not null default uuid_generate_v4(),
    "email" text not null,
    "password_hash" text not null,
    "first_name" text not null,
    "last_name" text not null,
    "role" text not null default 'member'::text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid,
    "last_login_at" timestamp with time zone
);


create table "public"."user_company_access" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "company" text not null,
    "created_at" timestamp with time zone default now(),
    "created_by" uuid
);


alter table "public"."campaigns" alter column status type "public"."campaign_status_type" using status::text::"public"."campaign_status_type";

alter table "public"."campaigns" alter column "status" set default 'active'::campaign_status_type;

drop type "public"."campaign_status_type__old_version_to_be_dropped";

CREATE UNIQUE INDEX app_users_email_key ON public.app_users USING btree (email);

CREATE UNIQUE INDEX app_users_pkey ON public.app_users USING btree (id);

CREATE INDEX idx_app_users_email ON public.app_users USING btree (email);

CREATE INDEX idx_app_users_is_active ON public.app_users USING btree (is_active);

CREATE INDEX idx_app_users_role ON public.app_users USING btree (role);

CREATE INDEX idx_user_company_access_company ON public.user_company_access USING btree (company);

CREATE INDEX idx_user_company_access_user_id ON public.user_company_access USING btree (user_id);

CREATE UNIQUE INDEX user_company_access_pkey ON public.user_company_access USING btree (id);

CREATE UNIQUE INDEX user_company_access_user_id_company_key ON public.user_company_access USING btree (user_id, company);

alter table "public"."app_users" add constraint "app_users_pkey" PRIMARY KEY using index "app_users_pkey";

alter table "public"."user_company_access" add constraint "user_company_access_pkey" PRIMARY KEY using index "user_company_access_pkey";

alter table "public"."app_users" add constraint "app_users_created_by_fkey" FOREIGN KEY (created_by) REFERENCES app_users(id) not valid;

alter table "public"."app_users" validate constraint "app_users_created_by_fkey";

alter table "public"."app_users" add constraint "app_users_email_key" UNIQUE using index "app_users_email_key";

alter table "public"."app_users" add constraint "app_users_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text]))) not valid;

alter table "public"."app_users" validate constraint "app_users_role_check";

alter table "public"."user_company_access" add constraint "user_company_access_company_check" CHECK ((company = ANY (ARRAY['CraftyCode'::text, 'Avalern'::text]))) not valid;

alter table "public"."user_company_access" validate constraint "user_company_access_company_check";

alter table "public"."user_company_access" add constraint "user_company_access_created_by_fkey" FOREIGN KEY (created_by) REFERENCES app_users(id) not valid;

alter table "public"."user_company_access" validate constraint "user_company_access_created_by_fkey";

alter table "public"."user_company_access" add constraint "user_company_access_user_id_company_key" UNIQUE using index "user_company_access_user_id_company_key";

alter table "public"."user_company_access" add constraint "user_company_access_user_id_fkey" FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE not valid;

alter table "public"."user_company_access" validate constraint "user_company_access_user_id_fkey";

grant delete on table "public"."app_users" to "anon";

grant insert on table "public"."app_users" to "anon";

grant references on table "public"."app_users" to "anon";

grant select on table "public"."app_users" to "anon";

grant trigger on table "public"."app_users" to "anon";

grant truncate on table "public"."app_users" to "anon";

grant update on table "public"."app_users" to "anon";

grant delete on table "public"."app_users" to "authenticated";

grant insert on table "public"."app_users" to "authenticated";

grant references on table "public"."app_users" to "authenticated";

grant select on table "public"."app_users" to "authenticated";

grant trigger on table "public"."app_users" to "authenticated";

grant truncate on table "public"."app_users" to "authenticated";

grant update on table "public"."app_users" to "authenticated";

grant delete on table "public"."app_users" to "service_role";

grant insert on table "public"."app_users" to "service_role";

grant references on table "public"."app_users" to "service_role";

grant select on table "public"."app_users" to "service_role";

grant trigger on table "public"."app_users" to "service_role";

grant truncate on table "public"."app_users" to "service_role";

grant update on table "public"."app_users" to "service_role";

grant delete on table "public"."user_company_access" to "anon";

grant insert on table "public"."user_company_access" to "anon";

grant references on table "public"."user_company_access" to "anon";

grant select on table "public"."user_company_access" to "anon";

grant trigger on table "public"."user_company_access" to "anon";

grant truncate on table "public"."user_company_access" to "anon";

grant update on table "public"."user_company_access" to "anon";

grant delete on table "public"."user_company_access" to "authenticated";

grant insert on table "public"."user_company_access" to "authenticated";

grant references on table "public"."user_company_access" to "authenticated";

grant select on table "public"."user_company_access" to "authenticated";

grant trigger on table "public"."user_company_access" to "authenticated";

grant truncate on table "public"."user_company_access" to "authenticated";

grant update on table "public"."user_company_access" to "authenticated";

grant delete on table "public"."user_company_access" to "service_role";

grant insert on table "public"."user_company_access" to "service_role";

grant references on table "public"."user_company_access" to "service_role";

grant select on table "public"."user_company_access" to "service_role";

grant trigger on table "public"."user_company_access" to "service_role";

grant truncate on table "public"."user_company_access" to "service_role";

grant update on table "public"."user_company_access" to "service_role";

CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


