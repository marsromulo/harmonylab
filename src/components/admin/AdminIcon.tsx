export function AdminIcon({ name }: { name: string }) {
  if (name === "bag") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 8h12l-1 13H7L6 8Z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0" />
        <path d="M17 11a4 4 0 0 1 0 8" />
      </svg>
    );
  }

  if (name === "discount") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 13 13 20a2 2 0 0 1-3 0l-6-6a2 2 0 0 1 0-3l7-7h7a2 2 0 0 1 2 2v7Z" />
        <circle cx="15.5" cy="8.5" r="1.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
