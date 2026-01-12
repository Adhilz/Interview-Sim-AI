import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (origin.endsWith('.lovableproject.com')) return true;
  if (origin.endsWith('.lovable.app')) return true;
  if (origin.startsWith('http://localhost:')) return true;
  return false;
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : 'https://lovable.app';
  return {
    "Access-Control-Allow-Origin": allowedOrigin!,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
};

const verifyAuth = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid authentication token');
  }
  
  return user;
};

// Verify auth from query params (for WebSocket connections)
const verifyAuthFromQueryParams = async (url: URL) => {
  const token = url.searchParams.get('token');
  if (!token) {
    throw new Error('Missing authentication token');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid authentication token');
  }
  
  return user;
};

const DID_HTTP_API_URL = "https://api.d-id.com";
const DID_WS_API_URL = "wss://ws-api.d-id.com";

// Rate limiting: track per-user connections and message rates
const userConnections = new Map<string, number>();
const userMessageTimestamps = new Map<string, number[]>();
const MAX_CONNECTIONS_PER_USER = 3;
const MAX_MESSAGES_PER_MINUTE = 100;
const MAX_MESSAGE_SIZE = 65536; // 64KB

// Only allow custom avatar URLs that are publicly reachable (avoid storage URLs that D-ID can't fetch reliably)
const getAvatarUrl = (customUrl?: string): string | undefined => {
  if (customUrl && !customUrl.includes("supabase.co/storage")) {
    return customUrl;
  }
  return undefined;
};

const upgradeToWebSocketProxy = (req: Request, didApiKey: string, userId: string) => {
  // Check connection limit per user
  const currentConns = userConnections.get(userId) || 0;
  if (currentConns >= MAX_CONNECTIONS_PER_USER) {
    console.warn(`[D-ID WS PROXY] User ${userId} exceeded max connections (${MAX_CONNECTIONS_PER_USER})`);
    return new Response('Too many connections', { status: 429 });
  }
  
  userConnections.set(userId, currentConns + 1);
  console.log(`[D-ID WS PROXY] User ${userId} connections: ${currentConns + 1}`);

  const { socket: client, response } = Deno.upgradeWebSocket(req);

  let didWs: WebSocket | null = null;

  const safeClose = (ws: WebSocket | null, code = 1000, reason = "") => {
    try {
      ws?.close(code, reason);
    } catch {
      // ignore
    }
  };

  const connectDid = () => {
    const wsUrl = `${DID_WS_API_URL}?authorization=Basic%20${encodeURIComponent(didApiKey)}`;
    console.log("[D-ID WS PROXY] Connecting to D-ID WS:", DID_WS_API_URL);

    didWs = new WebSocket(wsUrl);

    didWs.onopen = () => {
      console.log("[D-ID WS PROXY] D-ID WS connected");
    };

    didWs.onmessage = (event) => {
      try {
        // D-ID sends JSON string frames
        client.send(typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data));
      } catch (err) {
        console.error("[D-ID WS PROXY] Forward to client failed", err);
      }
    };

    didWs.onerror = (err) => {
      console.error("[D-ID WS PROXY] D-ID WS error", err);
      safeClose(client, 1011, "D-ID WS error");
    };

    didWs.onclose = () => {
      console.log("[D-ID WS PROXY] D-ID WS closed");
      safeClose(client, 1000, "D-ID WS closed");
    };
  };

  client.onopen = () => {
    console.log("[D-ID WS PROXY] Client WS opened");
    connectDid();
  };

  client.onmessage = (event) => {
    try {
      if (!didWs || didWs.readyState !== WebSocket.OPEN) {
        console.warn("[D-ID WS PROXY] D-ID WS not ready yet; dropping message");
        return;
      }

      const raw = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data);
      
      // Check message size limit
      if (raw.length > MAX_MESSAGE_SIZE) {
        console.warn(`[D-ID WS PROXY] Message too large from user ${userId}: ${raw.length} bytes`);
        client.close(1009, 'Message too large');
        return;
      }
      
      // Check rate limit
      const now = Date.now();
      const timestamps = userMessageTimestamps.get(userId) || [];
      timestamps.push(now);
      
      // Remove timestamps older than 1 minute
      const oneMinuteAgo = now - 60000;
      while (timestamps.length > 0 && timestamps[0] < oneMinuteAgo) {
        timestamps.shift();
      }
      userMessageTimestamps.set(userId, timestamps);
      
      if (timestamps.length > MAX_MESSAGES_PER_MINUTE) {
        console.warn(`[D-ID WS PROXY] Rate limit exceeded for user ${userId}`);
        client.close(1008, 'Rate limit exceeded');
        return;
      }

      // Minimal validation: only proxy known message types.
      const parsed = JSON.parse(raw);
      const allowed = new Set(["init-stream", "sdp", "ice", "stream-audio", "stream-text", "delete-stream"]);
      if (!parsed?.type || !allowed.has(parsed.type)) {
        console.warn("[D-ID WS PROXY] Blocked message type:", parsed?.type);
        return;
      }

      // Ensure no auth fields are passed through
      if (parsed?.payload?.authorization) delete parsed.payload.authorization;

      didWs.send(JSON.stringify(parsed));
    } catch (err) {
      console.error("[D-ID WS PROXY] Client message error", err);
    }
  };

  client.onerror = (err) => {
    console.error("[D-ID WS PROXY] Client WS error", err);
    safeClose(didWs, 1000, "client ws error");
  };

  client.onclose = () => {
    console.log("[D-ID WS PROXY] Client WS closed");
    // Decrement user connection count
    const conns = userConnections.get(userId) || 1;
    if (conns <= 1) {
      userConnections.delete(userId);
    } else {
      userConnections.set(userId, conns - 1);
    }
    safeClose(didWs, 1000, "client ws closed");
  };

  return response;
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const DID_API_KEY = Deno.env.get("DID_API_KEY");
  if (!DID_API_KEY) {
    return new Response(JSON.stringify({ error: "D-ID API key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // WebSocket proxy mode (for real-time PCM chunk streaming) - requires auth via query param
  if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
    try {
      const url = new URL(req.url);
      const user = await verifyAuthFromQueryParams(url);
      console.log(`[D-ID WS PROXY] Authenticated user: ${user.id}`);
      return upgradeToWebSocketProxy(req, DID_API_KEY, user.id);
    } catch (authError) {
      console.error("[D-ID WS PROXY] Auth failed:", authError);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
  }

  // HTTP mode (kept for backward-compat + stream creation if needed)
  try {
    // Verify authentication before processing any requests
    const user = await verifyAuth(req);
    console.log(`[D-ID Stream] Authenticated user: ${user.id}`);

    const body = await req.json();
    const { action, streamId, sessionId, sdpAnswer, iceCandidate, avatarUrl, text, cookies } = body;
    console.log(`[D-ID Stream] Action: ${action}, streamId: ${streamId}, sessionId: ${sessionId}, hasCookies: ${!!cookies}`);

    switch (action) {
      case "create": {
        // Always use D-ID's reliable default presenter - custom URLs often fail due to CORS/access issues
        const sourceUrl = "https://create-images-results.d-id.com/DefaultPresenters/Emma_f/image.png";

        const createResponse = await fetch(`${DID_HTTP_API_URL}/talks/streams`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${DID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_url: sourceUrl,
            driver_url: "bank://lively/driver-06",
            stream_warmup: true,
            config: {
              stitch: true,
              fluent: true,
            },
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error("[D-ID Stream] Create error:", errorText);
          return new Response(JSON.stringify({ error: errorText }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const streamData = await createResponse.json();
        
        // D-ID returns session_id in cookies - extract from Set-Cookie header
        // The cookies contain the actual session identifier needed for subsequent calls
        const setCookieHeader = createResponse.headers.get("set-cookie");
        let sessionIdValue = streamData.session_id;
        let cookieString = "";
        
        // Extract session cookies from Set-Cookie header for use in subsequent requests
        if (setCookieHeader) {
          // Parse all cookies from the header
          const cookies = setCookieHeader.split(/,(?=[^;]+=[^;]+)/).map(c => c.trim());
          const sessionCookies: string[] = [];
          
          for (const cookie of cookies) {
            // Extract just the cookie name=value part (before any attributes like Path, Secure, etc.)
            const cookiePart = cookie.split(";")[0].trim();
            if (cookiePart) {
              sessionCookies.push(cookiePart);
            }
          }
          
          cookieString = sessionCookies.join("; ");
          console.log("[D-ID Stream] Captured session cookies:", cookieString.substring(0, 100) + "...");
        }
        
        // If session_id from JSON is invalid, use stream ID as fallback
        if (!sessionIdValue || typeof sessionIdValue !== 'string' || sessionIdValue.includes('AWSALB')) {
          sessionIdValue = streamData.id;
          console.log("[D-ID Stream] Using stream ID as session:", sessionIdValue);
        }
        
        console.log("[D-ID Stream] Create response:", JSON.stringify({
          id: streamData.id,
          session_id: sessionIdValue,
          has_offer: !!streamData.offer,
          has_ice_servers: !!streamData.ice_servers,
          has_cookies: !!cookieString,
        }));

        return new Response(
          JSON.stringify({
            streamId: streamData.id,
            sdpOffer: streamData.offer,
            iceServers: streamData.ice_servers,
            sessionId: sessionIdValue,
            cookies: cookieString, // Pass cookies to client for subsequent requests
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "sdp": {
        if (!streamId || !sessionId || !sdpAnswer) {
          throw new Error("streamId, sessionId, and sdpAnswer required for SDP action");
        }

        const sdpHeaders: Record<string, string> = {
          Authorization: `Basic ${DID_API_KEY}`,
          "Content-Type": "application/json",
        };
        
        // Include cookies if provided for session continuity
        if (cookies) {
          sdpHeaders["Cookie"] = cookies;
        }

        const sdpResponse = await fetch(`${DID_HTTP_API_URL}/talks/streams/${streamId}/sdp`, {
          method: "POST",
          headers: sdpHeaders,
          body: JSON.stringify({
            answer: sdpAnswer,
            session_id: sessionId,
          }),
        });

        if (!sdpResponse.ok) {
          const errorText = await sdpResponse.text();
          console.error("[D-ID Stream] SDP error:", errorText);
          throw new Error(`Failed to send SDP answer: ${sdpResponse.status}`);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "ice": {
        if (!streamId || !sessionId || !iceCandidate) {
          throw new Error("streamId, sessionId, and iceCandidate required for ICE action");
        }

        const iceHeaders: Record<string, string> = {
          Authorization: `Basic ${DID_API_KEY}`,
          "Content-Type": "application/json",
        };
        
        if (cookies) {
          iceHeaders["Cookie"] = cookies;
        }

        const iceResponse = await fetch(`${DID_HTTP_API_URL}/talks/streams/${streamId}/ice`, {
          method: "POST",
          headers: iceHeaders,
          body: JSON.stringify({
            candidate: iceCandidate.candidate,
            sdpMid: iceCandidate.sdpMid,
            sdpMLineIndex: iceCandidate.sdpMLineIndex,
            session_id: sessionId,
          }),
        });

        if (!iceResponse.ok) {
          const errorText = await iceResponse.text();
          console.error("[D-ID Stream] ICE error:", errorText);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "talk": {
        if (!streamId || !sessionId || !text) {
          throw new Error("streamId, sessionId, and text required for talk action");
        }

        const talkHeaders: Record<string, string> = {
          Authorization: `Basic ${DID_API_KEY}`,
          "Content-Type": "application/json",
        };
        
        if (cookies) {
          talkHeaders["Cookie"] = cookies;
        }

        const talkResponse = await fetch(`${DID_HTTP_API_URL}/talks/streams/${streamId}`, {
          method: "POST",
          headers: talkHeaders,
          body: JSON.stringify({
            script: {
              type: "text",
              input: text,
              provider: {
                type: "microsoft",
                voice_id: "en-US-JennyNeural",
              },
            },
            driver_url: "bank://lively/driver-06",
            config: {
              stitch: true,
              fluent: true,
            },
            session_id: sessionId,
          }),
        });

        if (!talkResponse.ok) {
          const errorText = await talkResponse.text();
          console.error("[D-ID Stream] Talk error:", errorText);
          
          // Handle 402 (insufficient credits) gracefully - don't crash the app
          if (talkResponse.status === 402) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: "insufficient_credits",
              message: "D-ID credits exhausted. Avatar lip-sync disabled."
            }), {
              status: 200, // Return 200 so frontend doesn't crash
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          throw new Error(`Talk request failed: ${talkResponse.status}`);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "destroy": {
        if (!streamId || !sessionId) {
          throw new Error("streamId and sessionId required for destroy action");
        }

        const destroyHeaders: Record<string, string> = {
          Authorization: `Basic ${DID_API_KEY}`,
          "Content-Type": "application/json",
        };
        
        if (cookies) {
          destroyHeaders["Cookie"] = cookies;
        }

        const destroyResponse = await fetch(`${DID_HTTP_API_URL}/talks/streams/${streamId}`, {
          method: "DELETE",
          headers: destroyHeaders,
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!destroyResponse.ok) {
          const errorText = await destroyResponse.text();
          console.error("[D-ID Stream] Destroy error:", errorText);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: unknown) {
    console.error("[D-ID Stream] Error:", error);
    const message = error instanceof Error ? error.message : "D-ID stream error";
    
    // Return 401 for authentication errors
    if (message === 'Missing authorization header' || message === 'Invalid authentication token') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
