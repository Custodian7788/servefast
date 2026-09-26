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
<style>
  html,body{height:100%}
  body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;
       background:#FBF5E9;font:600 26px ui-sans-serif,system-ui,sans-serif;color:#332E2A;
       letter-spacing:-.005em}
  .marks{display:flex;flex-direction:column;gap:14px}
  .row{display:flex;align-items:flex-end;gap:0}
  .o{color:#E4762F}
  .g{color:#7FB539}
  input{width:220px;padding:7px 10px;font:400 13px ui-sans-serif,system-ui,sans-serif;background:#fff;
        border:2px solid ${wrong ? "#C0392B" : "#332E2A"};border-radius:4px;outline:none;color:#332E2A}
</style></head>
<body>
  <div class="marks">
    <div class="row">serve<span class="o">fast</span>
      <svg width="15" height="15" viewBox="0 0 52 52" fill="none">
        <mask id="m1"><rect x="-10" y="-10" width="72" height="72" fill="#fff"/>
          <ellipse cx="34.75" cy="19.25" rx="12" ry="10" fill="#000"/></mask>
        <rect x="9.25" y="19.25" width="25.5" height="25.5" stroke="#332E2A" stroke-width="13" mask="url(#m1)"/>
        <ellipse cx="34.75" cy="19.25" rx="9" ry="7" fill="#E4762F"/>
      </svg>
    </div>
    <div class="row">was<span class="g">orbi</span>
      <svg width="15" height="15" viewBox="0 0 52 52" fill="none">
        <mask id="m2"><rect x="-10" y="-10" width="72" height="72" fill="#fff"/>
          <ellipse cx="17.25" cy="19.25" rx="12" ry="10" fill="#000"/></mask>
        <rect x="17.25" y="19.25" width="25.5" height="25.5" stroke="#332E2A" stroke-width="13" mask="url(#m2)"/>
        <ellipse cx="17.25" cy="19.25" rx="9" ry="7" fill="#7FB539"/>
      </svg>
    </div>
  </div>
  <form method="POST" action="/__unlock">
    <input type="password" name="p" autofocus autocomplete="current-password" />
  </form>
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
