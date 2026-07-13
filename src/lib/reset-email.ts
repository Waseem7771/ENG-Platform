/**
 * Password-reset email content, localized off the recipient's stored locale.
 *
 * This is built OUTSIDE React — better-auth's `sendResetPassword` runs on the
 * server with no `useT()` — so the two small templates live here keyed by
 * locale rather than in the client i18n catalogs (which feed `t()`). Any
 * non-"ar" locale falls back to English. Pure and dependency-free so it can be
 * unit-tested directly.
 */
export function resetEmailContent(
  locale: string,
  url: string,
): { subject: string; text: string } {
  if (locale === "ar") {
    return {
      subject: "إعادة تعيين كلمة مرور SpeakPath",
      text: `لإعادة تعيين كلمة المرور، افتح هذا الرابط:\n${url}\nإذا لم تطلب ذلك، فتجاهل هذه الرسالة.`,
    };
  }
  return {
    subject: "Reset your SpeakPath password",
    text: `Reset your password: ${url}\nIf you didn't ask for this, ignore this email.`,
  };
}
