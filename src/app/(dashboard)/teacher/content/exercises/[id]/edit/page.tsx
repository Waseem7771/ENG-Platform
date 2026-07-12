import { EditExerciseScreen } from "./edit-exercise-screen";

export default async function EditExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditExerciseScreen id={id} />;
}
