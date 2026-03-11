"use client";

import { usePathname, useRouter } from "next/navigation";

export default function UniversalBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (!pathname || pathname === "/") {
    return null;
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <button
      type="button"
      className="universal-back-button"
      onClick={handleBack}
      aria-label="Gaa tilbage"
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 6L9 12L15 18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}