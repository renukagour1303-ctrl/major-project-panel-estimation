async function test() {
  const query = '[out:json][timeout:10];way["building"](around:50,19.8762,75.3433);out geom;';

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter'
  ];

  for (const ep of endpoints) {
    console.log(`\n=== Testing ${ep} ===`);
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'SolarCalculator/1.0 (https://sungroves.com; contact@sungroves.com)',
          'Accept': 'application/json'
        },
        body: `data=${encodeURIComponent(query)}`
      });

      console.log('Status:', res.status, 'Content-Type:', res.headers.get('content-type'));
      const text = await res.text();
      console.log('First 300 chars:', text.substring(0, 300));
      if (res.ok) {
        const json = JSON.parse(text);
        console.log('Elements found:', json.elements?.length);
      }
    } catch(e) {
      console.error('Fetch error:', e.message);
    }
  }
}
test().catch(console.error);
