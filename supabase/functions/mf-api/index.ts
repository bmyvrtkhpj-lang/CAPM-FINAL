const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const API_BASE = "https://api.mfapi.in";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/functions\/v1\/mf-api/, "");

    // Route: /search?q=<query>
    if (path === "/search") {
      const q = url.searchParams.get("q") || "";
      if (!q.trim()) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const apiUrl = `${API_BASE}/mf/search?q=${encodeURIComponent(q)}`;
      const resp = await fetch(apiUrl, { headers: { Accept: "application/json" } });
      if (!resp.ok) throw new Error(`Upstream error ${resp.status}`);
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: /schemes?limit=&offset=  — list all schemes
    if (path === "/schemes") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "250"), 500);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const apiUrl = `${API_BASE}/mf?limit=${limit}&offset=${offset}`;
      const resp = await fetch(apiUrl, { headers: { Accept: "application/json" } });
      if (!resp.ok) throw new Error(`Upstream error ${resp.status}`);
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: /nav/:schemeCode — get full NAV history
    const navMatch = path.match(/^\/nav\/(\d+)$/);
    if (navMatch) {
      const schemeCode = navMatch[1];
      const startDate = url.searchParams.get("startDate");
      const endDate = url.searchParams.get("endDate");
      let apiUrl = `${API_BASE}/mf/${schemeCode}`;
      const params: string[] = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) apiUrl += "?" + params.join("&");

      const resp = await fetch(apiUrl, { headers: { Accept: "application/json" } });
      if (!resp.ok) throw new Error(`Upstream error ${resp.status}`);
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: /nav/:schemeCode/latest — latest NAV
    const navLatestMatch = path.match(/^\/nav\/(\d+)\/latest$/);
    if (navLatestMatch) {
      const schemeCode = navLatestMatch[1];
      const apiUrl = `${API_BASE}/mf/${schemeCode}/latest`;
      const resp = await fetch(apiUrl, { headers: { Accept: "application/json" } });
      if (!resp.ok) throw new Error(`Upstream error ${resp.status}`);
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown route" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
