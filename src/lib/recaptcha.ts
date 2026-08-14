"use client";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

function loadScript(): Promise<void> {
  if (window.grecaptcha) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("reCAPTCHA konnte nicht geladen werden."));
    document.head.appendChild(script);
  });
}

// v3 is invisible (score-based, no puzzle) — every unauthenticated write
// endpoint calls this right before submitting, action names things like
// "recommend_club" so Google's dashboard can break scores down per flow.
export async function getRecaptchaToken(action: string): Promise<string> {
  if (!SITE_KEY) {
    throw new Error("reCAPTCHA ist nicht konfiguriert (NEXT_PUBLIC_RECAPTCHA_SITE_KEY fehlt).");
  }
  await loadScript();
  return new Promise((resolve, reject) => {
    window.grecaptcha!.ready(() => {
      window.grecaptcha!.execute(SITE_KEY, { action }).then(resolve).catch(reject);
    });
  });
}
