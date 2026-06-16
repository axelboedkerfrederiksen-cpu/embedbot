import Link from "next/link";

export default function AccountCreatedPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "16px",
        background:
          "radial-gradient(circle at 12% 18%, rgba(246, 243, 237, 0.92) 0%, rgba(246, 243, 237, 0) 24%), radial-gradient(circle at 88% 14%, rgba(246, 243, 237, 0.9) 0%, rgba(246, 243, 237, 0) 22%), linear-gradient(180deg, #ffffff 0%, #fcfaf6 55%, #f8f4ee 100%)",
        fontFamily: '"Poppins", sans-serif',
        color: "#111111",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 460,
          background: "rgba(255,255,255,0.94)",
          border: "1px solid rgba(17,17,17,0.08)",
          borderRadius: 24,
          padding: 28,
          display: "grid",
          gap: 14,
          boxShadow: "0 20px 50px rgba(17,17,17,0.08)",
          backdropFilter: "blur(10px)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 700,
            color: "#111111",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
        >
          Din konto er blevet oprettet🎉
        </h1>

        <p style={{ margin: 0, color: "#6b6258", fontSize: 15, lineHeight: 1.6 }}>
          Du kan nu logge ind igen på din nye konto.
        </p>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <Link
            href="/login"
            style={{
              border: "1px solid rgba(17,17,17,0.08)",
              background: "#ffffff",
              color: "#111111",
              borderRadius: 999,
              padding: "12px 18px",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              fontFamily: '"Poppins", sans-serif',
              boxShadow: "0 12px 28px rgba(17,17,17,0.08)",
            }}
          >
            Log ind
          </Link>
        </div>
      </section>
    </main>
  );
}
