import { generate } from "otplib";

const STEP_SECONDS = 30;

/** Current TOTP code for the secret shown on the enrollment screen. */
export async function currentTotp(secret: string): Promise<string> {
  return generate({ secret });
}

/**
 * TOTP code that will stay valid long enough to be submitted: if the current 30-second window
 * is about to end, waits for the next one. A code is also rejected if reused, so tests that
 * need two consecutive valid codes should call this twice with a window change in between.
 */
export async function freshTotp(secret: string, minSecondsLeft = 5): Promise<string> {
  const secondsLeft = STEP_SECONDS - (Math.floor(Date.now() / 1000) % STEP_SECONDS);
  if (secondsLeft < minSecondsLeft) await new Promise((resolve) => setTimeout(resolve, secondsLeft * 1000 + 250));
  return currentTotp(secret);
}

/** Waits until the next TOTP window starts, so the next code differs from the previous one. */
export async function nextTotpWindow(): Promise<void> {
  const secondsLeft = STEP_SECONDS - (Math.floor(Date.now() / 1000) % STEP_SECONDS);
  await new Promise((resolve) => setTimeout(resolve, secondsLeft * 1000 + 250));
}
