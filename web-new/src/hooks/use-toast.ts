import { useState, useCallback, useRef, useEffect } from "react"

export function useToast(duration = 3000) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState("")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(
    (msg: string) => {
      setMessage(msg)
      setVisible(true)
      if (timer.current != null) clearTimeout(timer.current)
      timer.current = setTimeout(() => setVisible(false), duration)
    },
    [duration]
  )

  // prevent setState after unmount
  useEffect(() => () => {
    if (timer.current != null) clearTimeout(timer.current)
  }, [])

  return { visible, message, show }
}
