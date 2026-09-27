// Reads emails captured by Mailpit (local Supabase) through its HTTP API.
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitSummary = { ID: string; Subject: string; Created: string };
type MailpitMessage = { ID: string; Subject: string; Text: string; HTML: string };

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${MAILPIT_URL}${path}`);
  if (!response.ok) throw new Error(`Mailpit ${path} responded ${response.status}`);
  return (await response.json()) as T;
}

/** Latest email sent to `to`, waiting up to `timeoutMs` for it to arrive. */
export async function latestEmail(
  to: string,
  { subjectIncludes, timeoutMs = 15_000 }: { subjectIncludes?: string; timeoutMs?: number } = {},
): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { messages } = await getJson<{ messages: MailpitSummary[] }>(
      `/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    );
    const match = messages.find((m) => !subjectIncludes || m.Subject.includes(subjectIncludes));
    if (match) return getJson<MailpitMessage>(`/api/v1/message/${match.ID}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email to ${to}${subjectIncludes ? ` with "${subjectIncludes}"` : ""} within ${timeoutMs} ms`);
}

/** Number of emails sent to `to`. */
export async function countEmails(to: string): Promise<number> {
  const { messages } = await getJson<{ messages: MailpitSummary[] }>(
    `/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
  );
  return messages.length;
}

/** First link in the email whose URL contains `pathIncludes`. */
export function extractLink(message: MailpitMessage, pathIncludes: string): string {
  const links = [...message.Text.matchAll(/https?:\/\/[^\s"<>]+/g)].map((m) => m[0]);
  const link = links.find((l) => l.includes(pathIncludes));
  if (!link) throw new Error(`No link containing "${pathIncludes}" in "${message.Subject}"`);
  return link;
}

/** Deletes every captured email. */
export async function clearMailbox(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
}
