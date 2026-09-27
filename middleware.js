export const config = {
  matcher: "/((?!_vercel|favicon.svg|robots.txt).*)",
};

const COOKIE = "sf_open";

function password() {
  return process.env.SITE_PASSWORD || "Wasabi";
}

// A short token so the cookie never carries the password itself.
async function token() {
  const data = new TextEncoder().encode(`servefast:${password()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function gate(wrong) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Servefast</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet" />
<style>
  html,body{height:100%}
  body{margin:0;display:flex;flex-direction:column;background:#FBF5E9;
       font:400 13px "Space Grotesk",ui-sans-serif,system-ui,sans-serif;color:#4B4B4B}
  header{height:32px;display:flex;align-items:center;padding:0 12px;
         background:#FFE9C4;border-bottom:1px solid #F2DCB4}
  .logo{display:inline-flex;align-items:baseline;gap:4px;font-weight:700;font-size:24px;
        line-height:1;letter-spacing:-.005em}
  .o{color:#E4762F}
  main{flex:1;display:flex;align-items:center;justify-content:center}
  input{width:220px;padding:7px 10px;font:inherit;background:#fff;
        border:2px solid ${wrong ? "#C0392B" : "#4B4B4B"};border-radius:4px;outline:none;color:#4B4B4B}
</style></head>
<body>
  <header>
    <span class="logo"><span>serve<span class="o">fast</span></span>
      <svg width="17" height="17" viewBox="10.75 12.25 38.5 39" fill="none">
        <mask id="m1"><rect x="-10" y="-10" width="72" height="72" fill="#fff"/>
          <circle cx="34.75" cy="19.25" r="11" fill="#000"/></mask>
        <rect x="9.25" y="19.25" width="25.5" height="25.5" stroke="#4B4B4B" stroke-width="13" mask="url(#m1)"/>
        <circle cx="34.75" cy="19.25" r="8" fill="#E4762F"/>
      </svg>
    </span>
  </header>
  <main>
    <form method="POST" action="/__unlock">
      <input type="password" name="p" autofocus autocomplete="current-password" />
    </form>
  </main>
</body></html>`;
  return new Response(html, {
    status: wrong ? 401 : 200,
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow" },
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const good = await token();

  if (url.pathname === "/__unlock" && request.method === "POST") {
    const body = await request.formData();
    if (body.get("p") === password()) {
      return new Response(null, {
        status: 303,
        headers: {
          location: "/",
          "set-cookie": `${COOKIE}=${good}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return gate(true);
  }

  const cookie = request.headers.get("cookie") || "";
  if (cookie.split(";").some((c) => c.trim() === `${COOKIE}=${good}`)) return;

  return gate(false);
}
