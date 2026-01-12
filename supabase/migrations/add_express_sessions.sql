-- Table pour stocker les sessions Express optimisées par l'IA
-- Chaque utilisateur peut avoir une version Express de chaque session
create table public.express_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  session_key text not null, -- ex: "c1s0" pour Cycle 1, Session 0
  original_session jsonb not null, -- La session originale pour référence
  express_session jsonb not null, -- La version Express optimisée par l'IA
  optimization_notes text, -- Résumé des optimisations appliquées
  estimated_duration int, -- Durée estimée en minutes
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Contrainte: une seule version Express par session par utilisateur
  unique(user_id, session_key)
);

-- RLS pour Express Sessions
alter table public.express_sessions enable row level security;
create policy "Users can CRUD own express sessions." on public.express_sessions for all using (auth.uid() = user_id);

-- Index pour recherche rapide
create index idx_express_sessions_user_key on public.express_sessions(user_id, session_key);
