export const config = {
  matcher: "/((?!_vercel|favicon.svg).*)",
};

export default function middleware(request) {
  const user = process.env.SITE_USER || "servefast";
  const pass = process.env.SITE_PASSWORD || "letmein";

  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const i = decoded.indexOf(":");
    if (decoded.slice(0, i) === user && decoded.slice(i + 1) === pass) {
      return;
    }
  }

  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Servefast"' },
  });
}
