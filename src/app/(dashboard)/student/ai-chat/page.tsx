import { redirect } from "next/navigation";

export default function AiChatRedirect() {
  redirect("/student/practice?type=CONVERSATION");
}
