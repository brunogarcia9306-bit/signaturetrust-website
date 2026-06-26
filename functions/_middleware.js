export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  if (host === "www.signaturetrustfl.com") {
    url.hostname = "signaturetrustfl.com";
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
