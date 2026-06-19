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

    const upstream = await fetch(censusUrl);
    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400'
        }
    });
}
