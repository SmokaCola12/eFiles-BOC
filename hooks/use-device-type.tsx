"use client"

import { useState, useEffect } from "react"

export type DeviceType = "desktop" | "tablet" | "mobile"

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop")

  useEffect(() => {
    const detectDevice = () => {
      try {
        const userAgent = navigator.userAgent.toLowerCase()
        const width = window.innerWidth
        const height = window.innerHeight

        // Check for mobile devices first (most specific)
        const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)

        // Check for tablets
        const isTablet =
          /ipad|android(?!.*mobile)|tablet/i.test(userAgent) ||
          (width >= 768 && width <= 1024) ||
          (height >= 768 && height <= 1024)

        // iPhone specific detection
        const isIPhone = /iphone/i.test(userAgent) || (width <= 428 && height <= 926) // iPhone 14 Pro Max dimensions

        if (isIPhone || (isMobile && width < 768)) {
          setDeviceType("mobile")
        } else if (isTablet && !isMobile) {
          setDeviceType("tablet")
        } else {
          setDeviceType("desktop")
        }
      } catch (error) {
        console.warn("Device detection error:", error)
        // Fallback to desktop if detection fails
        setDeviceType("desktop")
      }
    }

    // Initial detection
    detectDevice()

    // Listen for resize events
    const handleResize = () => {
      try {
        detectDevice()
      } catch (error) {
        console.warn("Device detection error on resize:", error)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return deviceType
}
