async function test() {
  const res = await fetch('http://localhost:3000/api/ospek/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scannedId: 'test-id-123',
      photoBase64: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    })
  });
  const data = await res.json();
  console.log(data);
}
test();
