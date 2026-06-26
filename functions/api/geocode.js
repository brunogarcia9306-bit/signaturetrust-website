export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const address = url.searchParams.get('address');

    if (!address) {
        return new Response(JSON.stringify({ error: 'Missing address' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const censusUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;

    let upstream, text;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        upstream = await fetch(censusUrl, { signal: controller.signal });
        clearTimeout(timer);
        text = await upstream.text();
    } catch (err) {
        const msg = err.name === 'AbortError' ? 'Census geocoder timeout' : `Census fetch failed: ${err.message}`;
        return new Response(JSON.stringify({ error: msg }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        return new Response(JSON.stringify({ error: 'Census geocoder returned invalid response', raw: text.slice(0, 200) }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400'
        }
    });
}
