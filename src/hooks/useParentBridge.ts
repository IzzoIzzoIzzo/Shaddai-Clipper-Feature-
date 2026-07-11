// ============================================================
// useParentBridge — React hook for two-way iframe communication.
//
// Exposes:
//   notifyBatchComplete(payload)  → fires clipper:batchComplete
//   notifyAssetCreated(payload)   → fires clipper:assetCreated
//
// Also installs a `message` event listener (origin-validated) that
// handles any inbound commands the dashboard may send in the future.
// Unknown message types are silently ignored.
// ============================================================

import { useCallback, useEffect } from 'react'
import {
  sendToParent,
  isAllowedParent,
  type BatchCompletePayload,
  type AssetCreatedPayload,
  type ClipperMessage,
} from '@/lib/parentBridge'

export function useParentBridge() {
  // Install inbound listener once on mount.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Reject messages from un-trusted origins.
      if (!isAllowedParent(event.origin)) return

      const msg = event.data as ClipperMessage
      if (!msg || typeof msg.type !== 'string') return

      // Handle known inbound types. Currently the dashboard only sends signals;
      // add cases here if the protocol is extended (e.g. 'dashboard:ping').
      switch (msg.type) {
        // No inbound types defined yet — fall through silently.
        default:
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  /** Fire when a render batch reaches terminal status (reviewing / completed). */
  const notifyBatchComplete = useCallback((payload: BatchCompletePayload) => {
    sendToParent({ type: 'clipper:batchComplete', payload })
  }, [])

  /** Fire when new assets are available in the gallery (after batch completes). */
  const notifyAssetCreated = useCallback((payload: AssetCreatedPayload) => {
    sendToParent({ type: 'clipper:assetCreated', payload })
  }, [])

  return { notifyBatchComplete, notifyAssetCreated }
}
