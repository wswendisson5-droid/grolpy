process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
async function runTest() {
  const targets = [
    { name: "🚨OFERTAS OFFROAD🚨GP3 #GRUPO VIP", jid: "120363423556237140@g.us" },
    { name: "Vendas Serra dourada 3  (Grupo 2)", jid: "120363419654478484@g.us" }
  ];
  
  const instance = "minhabagg-leads";
  const apiKey = "ae6da6860c03e5e5385edd7689313ae941958d5f10b47923d962e141a106f103";
  const url = `https://143.95.217.174/message/sendText/${instance}`;
  
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    console.log(`\n=== ENVIO ${i+1} ===`);
    console.log(`instanceName: ${instance}`);
    console.log(`groupName: ${target.name}`);
    console.log(`groupJid: ${target.jid}`);
    
    const payload = {
      number: target.jid,
      text: `Teste isolado ${i+1}`,
      delay: 1200,
      linkPreview: false
    };
    
    console.log(`payload: ${JSON.stringify(payload)}`);
    
    const start = Date.now();
    console.log(`início: ${new Date(start).toISOString()}`);
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 65000); // 65s timeout
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": apiKey
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      const end = Date.now();
      const text = await res.text();
      
      console.log(`fim: ${new Date(end).toISOString()} (${((end - start)/1000).toFixed(1)}s)`);
      console.log(`HTTP status: ${res.status}`);
      console.log(`response body: ${text}`);
      
    } catch (err) {
      const end = Date.now();
      console.log(`fim: ${new Date(end).toISOString()} (${((end - start)/1000).toFixed(1)}s)`);
      console.log(`HTTP status: N/A`);
      console.log(`response body: ERROR: ${err.message}`);
    }
  }
}

runTest();
