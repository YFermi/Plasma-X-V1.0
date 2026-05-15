import handler from './api/nist-proxy.js';

async function test() {
  const req = new Request('http://localhost/api/nist-proxy?element=Fe&wavelengthMin=400&wavelengthMax=450&maxLines=5000');
  const res = await handler(req);
  const json = await res.json();
  console.log("Count returned by proxy:", json.count);
}
test();
