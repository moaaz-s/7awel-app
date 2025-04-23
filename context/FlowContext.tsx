"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { FlowState } from "@/types"

interface FlowContextType {
  // Flow state
  getFlowState: (flowId: string) => FlowState
  setFlowState: (flowId: string, state: FlowState) => void
  updateFlowState: (flowId: string, updates: Partial<FlowState>) => void
  clearFlowState: (flowId: string) => void
  clearAllFlowStates: () => void
}

const FlowContext = createContext<FlowContextType | undefined>(undefined)

export function FlowProvider({ children }: { children: ReactNode }) {
  // State to store flow data
  const [flowStates, setFlowStates] = useState<Record<string, FlowState>>({})

  // Get flow state
  const getFlowState = useCallback(
    (flowId: string): FlowState => {
      return flowStates[flowId] || {}
    },
    [flowStates],
  )

  // Set flow state
  const setFlowState = useCallback((flowId: string, state: FlowState) => {
    setFlowStates((prev) => ({
      ...prev,
      [flowId]: state,
    }))
  }, [])

  // Update flow state (partial update)
  const updateFlowState = useCallback((flowId: string, updates: Partial<FlowState>) => {
    setFlowStates((prev) => ({
      ...prev,
      [flowId]: {
        ...prev[flowId],
        ...updates,
      },
    }))
  }, [])

  // Clear flow state
  const clearFlowState = useCallback((flowId: string) => {
    setFlowStates((prev) => {
      const newState = { ...prev }
      delete newState[flowId]
      return newState
    })
  }, [])

  // Clear all flow states
  const clearAllFlowStates = useCallback(() => {
    setFlowStates({})
  }, [])

  // Context value
  const value = {
    getFlowState,
    setFlowState,
    updateFlowState,
    clearFlowState,
    clearAllFlowStates,
  }

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
}

// Custom hook to use the flow context
export function useFlow(): FlowContextType {
  const context = useContext(FlowContext)

  if (context === undefined) {
    throw new Error("useFlow must be used within a FlowProvider")
  }

  return context
}

// Custom hook for a specific flow
export function useFlowState(flowId: string) {
  const { getFlowState, updateFlowState, clearFlowState } = useFlow()

  const state = getFlowState(flowId)

  const updateState = useCallback(
    (updates: Partial<FlowState>) => {
      updateFlowState(flowId, updates)
    },
    [flowId, updateFlowState],
  )

  const clearState = useCallback(() => {
    clearFlowState(flowId)
  }, [flowId, clearFlowState])

  return { state, updateState, clearState }
}
