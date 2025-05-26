"use client"

import { useEffect, useRef } from "react"
import QRCode from "qrcode"

interface QRCodeDisplayProps {
  value: string
  size?: number
  className?: string
}

export function QRCodeDisplay({ value, size = 256, className = "" }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!value) {
      console.warn('[QRCodeDisplay] No value provided, skipping QR render');
      return;
    }
    try {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 0,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        }
      )
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  }, [value, size])

  return (
    <div className={`bg-white p-4 rounded-2xl border mx-auto flex items-center justify-center ${className}`}>
      <canvas ref={canvasRef} width={size} height={size} className="max-w-full h-auto" />
    </div>
  )
}
