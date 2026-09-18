import fetch from "node-fetch";
import https from "https";
async function test() {
  const url = "https://143.95.217.174/instance/connectionState/groply-cliente";
  const headers = { "apikey": "ae6da6860c03e5e5385edd7689313ae941958d5f10b47923d962e141a106f103", "Content-Type": "application/json" };
  const agent = new https.Agent({ rejectUnauthorized: false });
  const res = await fetch(url, { headers, agent });
  console.log(res.status, await res.text());
}
test();
