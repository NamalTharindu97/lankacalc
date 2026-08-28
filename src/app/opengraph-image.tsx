import { ImageResponse } from "next/og";

import { siteDescription, siteName } from "@/lib/site";

export const alt = `${siteName} - ${siteDescription}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ alignItems: "stretch", background: "#f4f1e8", color: "#17231c", display: "flex", height: "100%", padding: "64px", width: "100%" }}>
      <div style={{ border: "2px solid #17231c", display: "flex", flex: 1, position: "relative" }}>
        <div style={{ alignItems: "center", background: "#cf4b2c", color: "#fffaf0", display: "flex", fontSize: 54, fontWeight: 800, height: 116, justifyContent: "center", left: 52, position: "absolute", top: 52, width: 116 }}>LC</div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "52px", width: "72%" }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800, letterSpacing: "-3px" }}>{siteName}</div>
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, marginTop: 20 }}>Useful numbers. Visible workings.</div>
        </div>
        <div style={{ alignItems: "center", borderLeft: "2px solid #17231c", display: "flex", flex: 1, justifyContent: "center", padding: "48px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, width: "100%" }}>
            {["INPUTS", "FORMULA", "RESULT"].map((label, index) => <div key={label} style={{ alignItems: "center", borderBottom: "2px solid #17231c", display: "flex", fontSize: 18, fontWeight: 700, justifyContent: "space-between", paddingBottom: 12 }}><span>{label}</span><span style={{ color: index === 2 ? "#cf4b2c" : "#547261", fontSize: 24 }}>{index === 0 ? "12.5" : index === 1 ? "x / 100" : "100"}</span></div>)}
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
