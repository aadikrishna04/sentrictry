"use client";

import { useEffect } from "react";

// Suppress React DevTools extension errors
export default function ErrorSuppressor() {
  useEffect(() => {
    // Filter out console errors from React DevTools extension
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const errorMessage = args[0]?.toString() || "";
      if (
        errorMessage.includes("react_devtools") ||
        errorMessage.includes("chrome-extension") ||
        errorMessage.includes("Invalid argument not valid semver")
      ) {
        // Suppress these errors
        return;
      }
      originalError.apply(console, args);
    };

    // Also catch window errors
    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes("react_devtools") ||
        event.message?.includes("chrome-extension") ||
        event.filename?.includes("chrome-extension")
      ) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener("error", handleError);

    return () => {
      console.error = originalError;
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}

