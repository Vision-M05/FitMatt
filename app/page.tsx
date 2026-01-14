import { createClient } from '@/utils/supabase/server';
import ProgramImporter from '@/components/ProgramImporter';
import WorkoutPlayer from '@/components/WorkoutPlayer';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-slate-50 font-sans">
      {/* The WorkoutPlayer handles the entire UI header/layout itself now */}
      <WorkoutPlayer />
    </main>
  );
}
