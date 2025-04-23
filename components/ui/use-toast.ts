type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export const toast = (props: ToastProps) => {
  // In a real implementation, this would show a toast notification
  console.log("Toast:", props)
}
