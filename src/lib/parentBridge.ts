// ============================================================
// parentBridge.ts — safe postMessage bridge to the SHADDAI parent dashboard.
//
// HTTP is the source of truth for assets; postMessage is used only as a
// "please refetch /api/clips/v1/gallery" signal. The parent window polls
// or reacts to these events and re-queries the HTTP endpoint.
//
// Security model:
//   - isAllowedParent() enforces an origin allowlist before accepting any
//     inbound message (see useParentBridge hook).
//   - sendToParent() uses the document.referrer origin (not '*') so the
//     message is only delivered to the expected parent.
//   - If not framed (window.parent === window), all calls are no-ops.
// ============================================================

/** Origins that are permitted to embed this clipper and exchange messages. */
const ALLOWED_ORIGINS: ReadonlyArray<string> = [
  'http://localhost:3000',
  'http://localhost:8099',
]

/** Regex for Render.com preview / production URLs (*.onrender.com). */
const ONRENDER_RE = /^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/

/**
 * Returns true if `origin` is on the allow-list.
 * Called before processing any inbound postMessage.
 */
export function isAllowedParent(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (ONRENDER_RE.test(origin)) return true
  return false
}

/**
 * Derive the target origin for outbound messages.
 * Uses the document.referrer when available (most reliable when framed);
 * falls back to '*' only if referrer is absent (should not happen in practice
 * — prefer a concrete origin over '*' so the message isn't broadcast).
 */
function targetOrigin(): string {
  try {
    const ref = document.referrer
    if (ref) {
      const url = new URL(ref)
      // Only use the referrer origin if it's on our allowlist.
      if (isAllowedParent(url.origin)) return url.origin
    }
  } catch {
    // ignore malformed referrer
  }
  // Last resort: restrict to same origin rather than wildcard.
  return window.location.origin
}

/**
 * Post `msg` to window.parent.
 * No-op when not framed (avoids self-messaging on top-level pages).
 */
export function sendToParent(msg: ClipperMessage): void {
  if (window.parent === window) return // not framed
  try {
    window.parent.postMessage(msg, targetOrigin())
  } catch {
    // Cross-origin access to window.parent itself can throw in some
    // sandboxed iframe configurations — swallow silently.
  }
}

// ── message shape ─────────────────────────────────────────────────────────────

export interface BatchCompletePayload {
  batchId: string
  sourceId: string
}

export interface AssetCreatedPayload {
  batchId: string
  sourceId: string
  clipCount: number
}

export type ClipperMessage =
  | { type: 'clipper:batchComplete'; payload: BatchCompletePayload }
  | { type: 'clipper:assetCreated'; payload: AssetCreatedPayload }
