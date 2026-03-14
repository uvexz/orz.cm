import { ImageResponse } from "next/og";

export const runtime = "edge";

const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Orz";
const GITHUB_URL = "https://github.com/oiov/wr.do";

function getMode(searchParams: URLSearchParams) {
  return searchParams.get("mode") === "light" ? "light" : "dark";
}

function getHeading(searchParams: URLSearchParams) {
  const heading = searchParams.get("heading") || SITE_NAME;
  return heading.length > 100 ? `${heading.slice(0, 100)}...` : heading;
}

function getType(searchParams: URLSearchParams) {
  return searchParams.get("type") || "Open Graph";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const heading = getHeading(url.searchParams);
    const type = getType(url.searchParams);
    const mode = getMode(url.searchParams);
    const paint = mode === "dark" ? "#fff" : "#000";
    const background =
      mode === "dark"
        ? "linear-gradient(135deg, #020617 0%, #111827 55%, #1e293b 100%)"
        : "linear-gradient(135deg, #ffffff 0%, #eef2ff 100%)";
    const fontSize = heading.length > 80 ? 60 : 80;
    const githubPath = new URL(GITHUB_URL).pathname.replace(/^\//, "");
    const githubName = githubPath.split("/")[0] || "oiov";

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px",
            color: paint,
            background,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: -1.5,
              color: "#4f46e5",
            }}
          >
            {SITE_NAME}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 600,
                textTransform: "uppercase",
                opacity: 0.72,
              }}
            >
              {type}
            </div>
            <div
              style={{
                display: "flex",
                maxWidth: "92%",
                fontSize,
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: -3,
              }}
            >
              {heading}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <img
                alt="avatar"
                width="64"
                height="64"
                src={`https://github.com/${githubName}.png`}
                style={{ borderRadius: 9999 }}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>
                  {githubName}
                </div>
                <div style={{ display: "flex", opacity: 0.72 }}>
                  Open Source Designer
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
                <path
                  d="M30 44v-8a9.6 9.6 0 0 0-2-7c6 0 12-4 12-11 .16-2.5-.54-4.96-2-7 .56-2.3.56-4.7 0-7 0 0-2 0-6 3-5.28-1-10.72-1-16 0-4-3-6-3-6-3-.6 2.3-.6 4.7 0 7a10.806 10.806 0 0 0-2 7c0 7 6 11 12 11a9.43 9.43 0 0 0-1.7 3.3c-.34 1.2-.44 2.46-.3 3.7v8"
                  stroke={paint}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 36c-9.02 4-10-4-14-4"
                  stroke={paint}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div style={{ display: "flex", opacity: 0.72 }}>
                github.com/{githubPath}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch {
    return new Response("Failed to generate image", {
      status: 500,
    });
  }
}
