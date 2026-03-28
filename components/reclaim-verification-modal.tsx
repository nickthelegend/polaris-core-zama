"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk"
import type { VerificationOption } from "@/lib/reclaim-types"
import { Loader2, CheckCircle2, XCircle, Smartphone } from "lucide-react"
import QRCode from "qrcode"

interface ReclaimVerificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: VerificationOption
  onSuccess: (algoReward: number) => void
}

export function ReclaimVerificationModal({ open, onOpenChange, provider, onSuccess }: ReclaimVerificationModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "generating" | "waiting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open && status === "idle") {
      handleStartVerification()
    }
  }, [open])

  const handleStartVerification = async () => {
    try {
      setStatus("generating")
      setIsLoading(true)
      setQrCodeUrl(null)
      setErrorMessage(null)

      console.log("[v0] Starting verification for provider:", provider.id)

      // Step 1: Fetch the configuration from backend
      const response = await fetch("/api/generate-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: provider.id }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate verification config")
      }

      const { reclaimProofRequestConfig } = await response.json()

      // Step 2: Initialize the ReclaimProofRequest
      const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(reclaimProofRequestConfig)

      // Step 3: Generate the request URL
      const requestUrl = await reclaimProofRequest.getRequestUrl()

      console.log("[v0] Generated request URL:", requestUrl)

      // Step 4: Generate QR code
      const qrDataUrl = await QRCode.toDataURL(requestUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      setQrCodeUrl(qrDataUrl)
      setStatus("waiting")

      // Step 5: Start listening for proof submissions
      await reclaimProofRequest.startSession({
        onSuccess: (proofs) => {
          console.log("[v0] Successfully received proof:", proofs)
          setStatus("success")
          setIsLoading(false)

          // Call success callback with reward amount
          setTimeout(() => {
            onSuccess(provider.algoReward)
            onOpenChange(false)
            // Reset state for next use
            setTimeout(() => {
              setStatus("idle")
              setQrCodeUrl(null)
            }, 300)
          }, 2000)
        },
        onError: (error) => {
          console.error("[v0] Verification failed:", error)
          setStatus("error")
          setErrorMessage(error.message || "Verification failed. Please try again.")
          setIsLoading(false)
        },
      })
    } catch (error) {
      console.error("[v0] Error initializing Reclaim:", error)
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to initialize verification")
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setStatus("idle")
    setErrorMessage(null)
    handleStartVerification()
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStatus("idle")
      setQrCodeUrl(null)
      setErrorMessage(null)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{provider.icon}</span>
            Verify {provider.name}
          </DialogTitle>
          <DialogDescription>{provider.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          {status === "generating" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating verification request...</p>
            </div>
          )}

          {status === "waiting" && qrCodeUrl && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-2xl border-4 border-primary/20 p-4 bg-white">
                <img src={qrCodeUrl || "/placeholder.svg"} alt="Verification QR Code" className="w-64 h-64" />
              </div>
              <div className="flex items-center gap-2 text-primary">
                <Smartphone className="h-5 w-5" />
                <p className="text-sm font-medium">Scan with your phone to verify</p>
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Open your camera app and scan the QR code to complete verification on your mobile device
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Waiting for verification...</p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <p className="text-lg font-semibold">Verification Successful!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You've earned <span className="font-bold text-primary">{provider.algoReward} ALGO</span>
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-16 w-16 text-destructive" />
              <div className="text-center">
                <p className="text-lg font-semibold">Verification Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              </div>
              <Button onClick={handleRetry} variant="outline" className="rounded-full bg-transparent">
                Try Again
              </Button>
            </div>
          )}
        </div>

        {status === "waiting" && (
          <div className="flex justify-center">
            <Button onClick={handleClose} variant="ghost" className="rounded-full">
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
