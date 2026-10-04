import { ImageResponse } from "next/og";

export const alt = "EmbedBot – AI-kundeservice til din webshop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, background: "#fcfcfa", color: "#20211f" }}>
      <div style={{ fontSize: 32, marginBottom: 50 }}>EmbedBot</div>
      <div style={{ fontSize: 66, lineHeight: 1.15 }}>Giv kunderne svar.</div>
      <div style={{ fontSize: 66, lineHeight: 1.15, color: "#6b6258" }}>Giv jer selv mere tid.</div>
      <div style={{ fontSize: 26, marginTop: 50 }}>AI-kundeservice til din webshop · embedbot.dk</div>
    </div>, size,
  );
}
