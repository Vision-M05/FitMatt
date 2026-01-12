-- Ajout des colonnes pour le tracking de la fatigue et de l'intensité (RPE)
-- RPE (Rate of Perceived Exertion) : 1-10
-- Fatigue : 1-5 (Ressenti global)

alter table workout_logs 
add column if not exists rpe integer check (rpe >= 1 and rpe <= 10),
add column if not exists fatigue_score integer check (fatigue_score >= 1 and fatigue_score <= 10);

comment on column workout_logs.rpe is 'Rate of Perceived Exertion (1-10)';
comment on column workout_logs.fatigue_score is 'Post-workout fatigue self-assessment (1-10)';
