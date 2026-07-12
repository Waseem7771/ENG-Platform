export function exerciseHref(id: string, type: string): string {
  return type === "CONVERSATION"
    ? `/student/practice/conversation/${id}`
    : `/student/exercises/${id}`;
}
