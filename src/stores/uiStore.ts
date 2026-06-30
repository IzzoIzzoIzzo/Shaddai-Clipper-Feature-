import { create } from 'zustand'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'progress'
  title: string
  message?: string
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface UploadItem {
  sourceId: string
  fileName: string
  progress: number
  status: 'uploading' | 'ingesting' | 'ready' | 'failed'
}

interface UIState {
  // Upload
  uploads: Record<string, UploadItem>
  addUpload: (sourceId: string, fileName: string) => void
  updateUploadProgress: (sourceId: string, progress: number) => void
  updateUploadStatus: (sourceId: string, status: UploadItem['status']) => void
  removeUpload: (sourceId: string) => void

  // Selection
  selectedCandidateIds: string[]
  toggleCandidateSelection: (id: string) => void
  selectAllCandidates: (ids: string[]) => void
  clearSelection: () => void

  // Notifications
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>((set) => ({
  // Upload
  uploads: {},
  addUpload: (sourceId, fileName) =>
    set((state) => ({
      uploads: { ...state.uploads, [sourceId]: { sourceId, fileName, progress: 0, status: 'uploading' } },
    })),
  updateUploadProgress: (sourceId, progress) =>
    set((state) => ({
      uploads: state.uploads[sourceId]
        ? { ...state.uploads, [sourceId]: { ...state.uploads[sourceId]!, progress } }
        : state.uploads,
    })),
  updateUploadStatus: (sourceId, status) =>
    set((state) => ({
      uploads: state.uploads[sourceId]
        ? { ...state.uploads, [sourceId]: { ...state.uploads[sourceId]!, status } }
        : state.uploads,
    })),
  removeUpload: (sourceId) =>
    set((state) => {
      const { [sourceId]: _, ...rest } = state.uploads
      return { uploads: rest }
    }),

  // Selection
  selectedCandidateIds: [],
  toggleCandidateSelection: (id) =>
    set((state) => ({
      selectedCandidateIds: state.selectedCandidateIds.includes(id)
        ? state.selectedCandidateIds.filter((i) => i !== id)
        : [...state.selectedCandidateIds, id],
    })),
  selectAllCandidates: (ids) => set({ selectedCandidateIds: ids }),
  clearSelection: () => set({ selectedCandidateIds: [] }),

  // Notifications
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))