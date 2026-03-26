async function getData() {
  const res = await fetch("http://localhost:5000");
  return res.text();
}

export default async function Home() {
  const data = await getData();

  return (
    <div>
      <h1>Frontend Next.js</h1>
      <p>{data}</p>
    </div>
  );
}