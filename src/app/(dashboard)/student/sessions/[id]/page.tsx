import { SessionRoom } from "./session-room";

export default async function SessionRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionRoom id={id} />;
}
