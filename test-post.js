async function test() {
  const res = await fetch('http://localhost:3000/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test Karya',
      description: 'Ini test',
      tags: ['test'],
      aspectRatio: 'square',
      photoBase64: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    })
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}
test();
