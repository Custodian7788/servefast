export const config = {
  matcher: "/((?!_vercel|favicon.svg|robots.txt).*)",
};

const COOKIE = "sf_open";
const DAYS = 100; // how long one unlock lasts

function password() {
  return process.env.SITE_PASSWORD || "SF8";
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
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet" />
<style>
  html,body{height:100%}
  body{margin:0;display:flex;flex-direction:column;background:#FFE9C4;
       font:400 13px "IBM Plex Sans",ui-sans-serif,system-ui,sans-serif;color:#4B4B4B}
  main{flex:1;display:flex;align-items:center;justify-content:center}
  input{width:5ch;padding:6px 8px;text-align:center;letter-spacing:.08em;font:inherit;background:#fff;
        border:2px solid ${wrong ? "#C0392B" : "#4B4B4B"};border-radius:4px;outline:none;color:#4B4B4B}
</style></head>
<body>
  <main>
    <form method="POST" action="/__unlock">
      <input type="text" name="p" maxlength="12" autofocus autocomplete="off" autocapitalize="characters" spellcheck="false" />
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
          "set-cookie": `${COOKIE}=${good}; Path=/; Max-Age=${DAYS * 24 * 60 * 60}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return gate(true);
  }

  const cookie = request.headers.get("cookie") || "";
  if (cookie.split(";").some((c) => c.trim() === `${COOKIE}=${good}`)) return;

  return gate(false);
}
