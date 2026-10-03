import Link from "next/link";

export default function AccountCreatedPage() {
  return (
    <main
      id="main-content"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "16px",
        background: "var(--bg-page)",
        fontFamily: "var(--font-inter), sans-serif",
        color: "var(--text-primary)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 460,
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          borderRadius: 7,
          padding: 28,
          display: "grid",
          gap: 14,
          boxShadow: "none",

          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 400,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
        >
          Din konto er blevet oprettet🎉
        </h1>

        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6 }}>
          Du kan nu logge ind igen på din nye konto.
        </p>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <Link
            href="/login"
            style={{
              border: "1px solid var(--border)",
              background: "var(--accent)",
              color: "#ffffff",
              borderRadius: 7,
              padding: "12px 18px",
              fontWeight: 500,
              fontSize: 14,
              textDecoration: "none",
              fontFamily: "var(--font-inter), sans-serif",
              boxShadow: "none",
            }}
          >
            Log ind
          </Link>
        </div>
      </section>
    </main>
  );
}
