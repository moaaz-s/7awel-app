"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { ChevronLeftIcon, ScanLineIcon, ImageIcon } from "@/components/icons"

export default function ScanPage() {
  const [flashlight, setFlashlight] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const { t, isRTL } = useLanguage()
  const router = useRouter()
  const scannerRef = useRef<any>(null); // Ref to hold the web scanner instance
  const isInitializingRef = useRef<boolean>(false); // Ref to prevent double init

  // Use the appropriate direction icon based on RTL
  const BackIcon = isRTL ? <ChevronLeftIcon className="h-5 w-5 rotate-180" /> : <ChevronLeftIcon className="h-5 w-5" />

  useEffect(() => {
    setIsScanning(true)
    let didCancel = false; // Flag to prevent state updates after unmount

    const startScanner = async () => {
      // Prevent running if already initializing or scanner exists
      if (isInitializingRef.current || scannerRef.current) {
        console.log("[ScanPage Effect] Skipping duplicate startScanner call.");
        return;
      }
      isInitializingRef.current = true;

      const { loadPlatform } = await import("@/platform");
      const p = await loadPlatform();

      try {
        const scanResult = await p.scanQRCode('web-qr-reader');

        if (didCancel) return; // Component unmounted

        if (scanResult && typeof scanResult === 'object' && 'scanner' in scanResult && 'result' in scanResult) {
          // Web platform
          console.log("[ScanPage Effect] Web scanner initialized.");
          scannerRef.current = scanResult.scanner;
          scanResult.result.then(content => {
            if (content && !didCancel) {
              console.log("[ScanPage Effect] Web scan successful, navigating...");
              router.push(`/send?qr=${encodeURIComponent(content)}`);
            }
          }).finally(() => {
             if (!didCancel) setIsScanning(false);
          });
        } else if (typeof scanResult === 'string') {
          // Capacitor platform (or others returning just string)
          console.log("[ScanPage Effect] Scan successful (Capacitor?), navigating...");
          router.push(`/send?qr=${encodeURIComponent(scanResult)}`);
          setIsScanning(false);
        } else {
          // Scan likely cancelled or failed
          console.log("[ScanPage Effect] Scan finished without result.");
          setIsScanning(false);
          isInitializingRef.current = false; // Reset lock on completion/failure
        }
      } catch (error) {
        console.error("[ScanPage Effect] Error starting scanner:", error);
        if (!didCancel) setIsScanning(false);
        isInitializingRef.current = false; // Reset lock on error
      }
    };

    startScanner();

    // Cleanup function
    return () => {
      console.log("--- ScanPage useEffect cleanup triggered! ---"); // Direct log
      isInitializingRef.current = false; // Ensure lock is reset on unmount
      didCancel = true;
      console.log("[ScanPage Cleanup] Running cleanup...");

      // --- Web Cleanup --- 
      if (scannerRef.current) {
        console.log("[ScanPage Cleanup] Stopping web scanner (ref)...", scannerRef.current);
        scannerRef.current.stop().then(() => {
          console.log("[ScanPage Cleanup] Web scanner stopped.");
          return scannerRef.current.clear();
        }).then(() => {
          console.log("[ScanPage Cleanup] Web scanner cleared.");
          scannerRef.current = null;
        }).catch((err: any) => {
          console.error("[ScanPage Cleanup] Error stopping/clearing web scanner:", err);
          scannerRef.current = null; // Ensure ref is cleared even on error
        });
      } else {
         console.log("[ScanPage Cleanup] No web scanner ref found to clean up.");
      }

      // --- Capacitor Cleanup (and potentially other platforms) ---
       import("@/platform").then(({ loadPlatform }) =>
         loadPlatform().then(async (p) => {
           if (p.cancelQRCodeScan) {
             console.log("[ScanPage Cleanup] Calling p.cancelQRCodeScan() for Capacitor/others...");
             await p.cancelQRCodeScan()
             console.log("[ScanPage Cleanup] p.cancelQRCodeScan() finished.");
           } else {
             console.log("[ScanPage Cleanup] p.cancelQRCodeScan not found on platform module.");
           }
         })
       ).catch(err => console.error("[ScanPage Cleanup] Error loading platform for cancel call:", err));
    }
  }, []) // Empty dependency array ensures this runs once on mount and cleanup on unmount

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <header className="flex items-center p-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2 text-white">
          {BackIcon}
        </Button>
        <h1 className="text-lg font-medium text-white">{t("qr.scanToPay")}</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative">
        {/* Camera viewfinder */}
        <div className="w-full h-full absolute inset-0 flex items-center justify-center overflow-hidden">
          
          <div className="relative w-full max-w-sm aspect-square">
            {/* Corners for QR code scanning area */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-white z-20"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-white z-20"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-white z-20"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-white z-20"></div>

            {/* Scan line animation */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-violet-500 animate-scan z-30"></div>

            {/* Container for web camera feed - Positioned absolutely behind overlay */}
            <div id="web-qr-reader" className="absolute inset-0 w-full h-full z-10"></div>
          </div>
        </div>

        {/* Instruction text */}
        <div className="absolute top-1/4 left-0 right-0 text-center">
          <p className="text-white text-sm">{t("qr.positionQr")}</p>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8">
          <Button
            variant="outline"
            size="icon"
            className={`h-12 w-12 rounded-full ${
              flashlight ? "bg-white text-black" : "bg-black/50 text-white border-white/30"
            }`}
            onClick={() => {
              setFlashlight((prev) => {
                const next = !prev
                import("@/platform").then(({ loadPlatform }) =>
                  loadPlatform().then((p) => p.toggleFlashlight && p.toggleFlashlight(next))
                )
                return next
              })
            }}
          >
            <ScanLineIcon className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/50 text-white border-white/30"
          >
            <ImageIcon className="h-6 w-6" />
          </Button>
        </div>

        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
            {t("qr.scanning")}
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0;
          }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  )
}
