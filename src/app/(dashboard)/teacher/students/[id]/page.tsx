import { StudentDetailScreen } from "./student-detail-screen";

export default async function TeacherStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentDetailScreen id={id} />;
}
