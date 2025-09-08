import { formatDistanceToNow, isValid, parseISO } from "date-fns"

export function safeFormatDistanceToNow(dateInput: string | Date | null | undefined): string {
  // Handle null, undefined, or empty values
  if (!dateInput || dateInput === "" || dateInput === "null" || dateInput === "undefined") {
    return "Unknown time"
  }

  try {
    let dateObj: Date

    // Handle string inputs
    if (typeof dateInput === "string") {
      // Handle common invalid string patterns
      if (dateInput.toLowerCase() === "invalid date" || dateInput === "NaN") {
        return "Invalid date"
      }

      // Try parsing ISO string first
      dateObj = parseISO(dateInput)

      // If parseISO fails, try regular Date constructor
      if (!isValid(dateObj)) {
        dateObj = new Date(dateInput)
      }
    } else if (dateInput instanceof Date) {
      dateObj = dateInput
    } else {
      // Handle any other type by converting to string first
      dateObj = new Date(String(dateInput))
    }

    // Comprehensive validity check
    if (!dateObj || !isValid(dateObj) || isNaN(dateObj.getTime()) || dateObj.getTime() === 0) {
      return "Invalid date"
    }

    // Check for extreme dates that might cause issues
    const now = new Date()
    const timeDiff = Math.abs(now.getTime() - dateObj.getTime())
    const yearsDiff = Math.abs(now.getFullYear() - dateObj.getFullYear())

    // Reject dates that are too far in the past or future
    if (yearsDiff > 100 || timeDiff > 100 * 365 * 24 * 60 * 60 * 1000) {
      return "Long ago"
    }

    // Additional check for dates before Unix epoch or too far in future
    if (dateObj.getTime() < 0 || dateObj.getFullYear() > 2100) {
      return "Invalid date"
    }

    // Use formatDistanceToNow safely
    const result = formatDistanceToNow(dateObj, { addSuffix: true })

    // Validate the result
    if (!result || result === "Invalid Date" || result.includes("NaN")) {
      return "Unknown time"
    }

    return result
  } catch (error) {
    console.warn("Date formatting error:", error, "for input:", dateInput)
    return "Unknown time"
  }
}

export function safeFormatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput || dateInput === "" || dateInput === "null" || dateInput === "undefined") {
    return "Unknown date"
  }

  try {
    let dateObj: Date

    if (typeof dateInput === "string") {
      if (dateInput.toLowerCase() === "invalid date" || dateInput === "NaN") {
        return "Invalid date"
      }
      dateObj = parseISO(dateInput)
      if (!isValid(dateObj)) {
        dateObj = new Date(dateInput)
      }
    } else if (dateInput instanceof Date) {
      dateObj = dateInput
    } else {
      dateObj = new Date(String(dateInput))
    }

    if (!dateObj || !isValid(dateObj) || isNaN(dateObj.getTime())) {
      return "Invalid date"
    }

    return dateObj.toLocaleDateString()
  } catch (error) {
    console.warn("Date formatting error:", error, "for input:", dateInput)
    return "Unknown date"
  }
}
