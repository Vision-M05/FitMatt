-- Ajout de la colonne exercises pour stocker le détail (sets, reps, poids)
-- Nécessaire pour le calcul du Volume (Tonnage) dans les Analytics

alter table workout_logs 
add column if not exists exercises jsonb default '[]'::jsonb;

-- Commentaire pour documentation
comment on column workout_logs.exercises is 'JSON array containing executed exercises: [{name, sets, reps, weight}]';
