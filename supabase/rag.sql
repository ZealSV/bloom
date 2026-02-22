-- Bloom RAG infrastructure
-- Run this in Supabase SQL Editor (same project/environment as your app).

begin;

-- pgvector support
create extension if not exists vector;

-- Link uploaded documents to a teaching session (optional but preferred scope)
do $$
declare
  sessions_id_type text;
  documents_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
  into sessions_id_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'sessions'
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped;

  select format_type(a.atttypid, a.atttypmod)
  into documents_id_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'documents'
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped;

  if sessions_id_type is null then
    raise exception 'public.sessions(id) not found';
  end if;

  if documents_id_type is null then
    raise exception 'public.documents(id) not found';
  end if;

  execute format(
    'create table if not exists public.session_documents (
      session_id %s not null references public.sessions(id) on delete cascade,
      document_id %s not null references public.documents(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (session_id, document_id)
    )',
    sessions_id_type,
    documents_id_type
  );
end $$;

create index if not exists session_documents_session_id_idx
  on public.session_documents (session_id);
create index if not exists session_documents_document_id_idx
  on public.session_documents (document_id);

-- Retrieval performance indexes
create index if not exists chunks_user_id_idx on public.chunks (user_id);
create index if not exists chunks_document_id_idx on public.chunks (document_id);
do $$
begin
  begin
    execute '
      create index if not exists chunks_embedding_ivfflat_idx
      on public.chunks
      using ivfflat (embedding vector_cosine_ops)
      with (lists = 100)
    ';
  exception
    when sqlstate '54000' then
      raise notice 'Insufficient maintenance_work_mem for lists=100. Falling back to lists=20.';
      begin
        execute '
          create index if not exists chunks_embedding_ivfflat_idx
          on public.chunks
          using ivfflat (embedding vector_cosine_ops)
          with (lists = 20)
        ';
      exception
        when sqlstate '54000' then
          raise notice 'Insufficient maintenance_work_mem for lists=20. Falling back to lists=5.';
          begin
            execute '
              create index if not exists chunks_embedding_ivfflat_idx
              on public.chunks
              using ivfflat (embedding vector_cosine_ops)
              with (lists = 5)
            ';
          exception
            when sqlstate '54000' then
              raise notice 'Insufficient maintenance_work_mem for lists=5. Falling back to lists=1.';
              begin
                execute '
                  create index if not exists chunks_embedding_ivfflat_idx
                  on public.chunks
                  using ivfflat (embedding vector_cosine_ops)
                  with (lists = 1)
                ';
              exception
                when sqlstate '54000' then
                  raise notice 'Unable to create ivfflat index under current memory limits. Continuing without vector index.';
              end;
          end;
      end;
  end;
end $$;

-- Scoped vector search function
create or replace function public.match_chunks_scoped(
  query_embedding vector(1536),
  match_count int default 8,
  match_threshold float default 0.2,
  p_user_id uuid default null,
  p_document_ids text[] default null
)
returns table (
  id bigint,
  document_id text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.document_id::text as document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  where
    (p_user_id is null or c.user_id = p_user_id)
    and (p_document_ids is null or c.document_id::text = any(p_document_ids))
    and (1 - (c.embedding <=> query_embedding)) >= match_threshold
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_chunks_scoped(vector, int, float, uuid, text[])
  to authenticated, service_role;

-- RLS for session_documents
alter table public.session_documents enable row level security;

drop policy if exists "session_documents_select_own" on public.session_documents;
drop policy if exists "session_documents_insert_own" on public.session_documents;
drop policy if exists "session_documents_delete_own" on public.session_documents;

create policy "session_documents_select_own"
  on public.session_documents
  for select
  using (
    exists (
      select 1
      from public.sessions s
      where s.id = session_documents.session_id
        and s.user_id = auth.uid()
    )
  );

create policy "session_documents_insert_own"
  on public.session_documents
  for insert
  with check (
    exists (
      select 1
      from public.sessions s
      where s.id = session_documents.session_id
        and s.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.documents d
      where d.id = session_documents.document_id
        and d.user_id = auth.uid()
    )
  );

create policy "session_documents_delete_own"
  on public.session_documents
  for delete
  using (
    exists (
      select 1
      from public.sessions s
      where s.id = session_documents.session_id
        and s.user_id = auth.uid()
    )
  );

commit;
