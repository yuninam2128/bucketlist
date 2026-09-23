-- =====================================================================
-- 우리의 버킷리스트 — Supabase 초기 설정
-- Supabase 대시보드 → SQL Editor → New query 에 전체 붙여넣고 Run (한 번만)
-- =====================================================================

-- ---------- 테이블 ----------

-- 커플: 사귄 날 + 짝꿍 초대코드
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  start_date date,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

-- 프로필: 로그인한 사람 1명 = 1행 (가입하면 트리거로 자동 생성)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  couple_id uuid references public.couples on delete set null,
  nickname text not null default '',
  avatar_path text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples on delete cascade,
  title text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table public.bucket_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples on delete cascade,
  category_id uuid not null references public.categories on delete cascade,
  title text not null,
  done boolean not null default false,
  date date,
  author_id uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

-- 추억: 버킷리스트를 완료하며 남긴 사진들 (Storage 경로)
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples on delete cascade,
  item_id uuid references public.bucket_items on delete cascade,
  date date not null,
  photos text[] not null default '{}',
  sticker_path text,
  created_at timestamptz not null default now()
);

-- 추억에 남긴 각자 한마디 (한 사람당 하나)
create table public.memory_notes (
  memory_id uuid not null references public.memories on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  text text not null,
  updated_at timestamptz not null default now(),
  primary key (memory_id, author_id)
);

create index on public.profiles (couple_id);
create index on public.categories (couple_id);
create index on public.bucket_items (couple_id);
create index on public.memories (couple_id);

-- ---------- 도우미 함수 ----------

-- 지금 로그인한 사람의 커플 id (권한 규칙에서 사용)
create or replace function public.my_couple_id() returns uuid
language sql stable security definer set search_path = public as $$
  select couple_id from profiles where id = auth.uid()
$$;

-- 가입하면 빈 프로필 자동 생성
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이 SQL을 돌리기 전에 이미 가입한 계정도 프로필 만들어두기
insert into public.profiles (id) select id from auth.users on conflict do nothing;

-- 처음 시작하는 사람: 커플 만들기 (초대코드 발급 + 기본 카테고리 하나)
create or replace function public.create_couple(p_nickname text, p_start_date date)
returns public.couples
language plpgsql security definer set search_path = public as $$
declare c couples;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  if (select couple_id from profiles where id = auth.uid()) is not null then
    raise exception 'ALREADY_IN_COUPLE';
  end if;
  insert into couples (start_date) values (p_start_date) returning * into c;
  insert into profiles (id, couple_id, nickname) values (auth.uid(), c.id, p_nickname)
    on conflict (id) do update set couple_id = c.id, nickname = p_nickname;
  insert into categories (couple_id, title, color) values (c.id, '해보고 싶은 것', '#daccc0');
  return c;
end $$;

-- 짝꿍: 초대코드로 들어가기 (커플당 최대 2명)
create or replace function public.join_couple(p_code text, p_nickname text)
returns public.couples
language plpgsql security definer set search_path = public as $$
declare c couples;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  select * into c from couples where invite_code = upper(trim(p_code));
  if not found then raise exception 'INVALID_CODE'; end if;
  if (select count(*) from profiles where couple_id = c.id and id <> auth.uid()) >= 2 then
    raise exception 'COUPLE_FULL';
  end if;
  insert into profiles (id, couple_id, nickname) values (auth.uid(), c.id, p_nickname)
    on conflict (id) do update set couple_id = c.id, nickname = p_nickname;
  return c;
end $$;

-- ---------- 권한 규칙 (RLS): 우리 커플 데이터만 ----------

alter table public.couples enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.bucket_items enable row level security;
alter table public.memories enable row level security;
alter table public.memory_notes enable row level security;

create policy "couple: read" on public.couples
  for select using (id = public.my_couple_id());
create policy "couple: update" on public.couples
  for update using (id = public.my_couple_id());

create policy "profiles: read me and partner" on public.profiles
  for select using (id = auth.uid() or couple_id = public.my_couple_id());
create policy "profiles: update me" on public.profiles
  for update using (id = auth.uid());
-- 커플 연결은 함수로만 (프로필에서 couple_id 직접 못 바꾸게)
revoke update on public.profiles from authenticated;
grant update (nickname, avatar_path) on public.profiles to authenticated;

create policy "categories: couple" on public.categories
  for all using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy "items: couple" on public.bucket_items
  for all using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy "memories: couple" on public.memories
  for all using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

create policy "notes: read couple" on public.memory_notes
  for select using (
    exists (select 1 from public.memories m where m.id = memory_id and m.couple_id = public.my_couple_id())
  );
create policy "notes: write mine" on public.memory_notes
  for all using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.memories m where m.id = memory_id and m.couple_id = public.my_couple_id())
  );

-- ---------- 사진 저장소 (비공개, 커플 폴더별) ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- 경로 규칙: {couple_id}/... — 우리 커플 폴더만 읽고 쓰기
create policy "photos: read couple" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "photos: upload couple" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "photos: update couple" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "photos: delete couple" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);
