import { ExercisePlayerScreen } from "./exercise-player-screen";

export default async function ExercisePlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExercisePlayerScreen id={id} />;
}
