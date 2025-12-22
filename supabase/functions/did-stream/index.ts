import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// D-ID API configuration
const DID_API_URL = "https://api.d-id.com";

// Get the Supabase URL to construct the public avatar URL
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';

// Default avatar image - stored in public/avatars folder of the project
// This can be overridden by passing a custom avatarUrl in the request
const getAvatarUrl = (customUrl?: string): string => {
  if (customUrl) {
    console.log('[D-ID Stream] Using custom avatar URL:', customUrl);
    return customUrl;
  }
  
  // Use the default interviewer avatar from the project's public folder
  // This will be served from the project's domain
  const defaultUrl = "https://fjaneryjjgesujinlbix.supabase.co/storage/v1/object/public/avatars/interviewer.png";
  console.log('[D-ID Stream] Using default avatar URL:', defaultUrl);
  return defaultUrl;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const DID_API_KEY = Deno.env.get('DID_API_KEY');
  if (!DID_API_KEY) {
    console.error('DID_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'D-ID API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { action, streamId, sdpAnswer, audio, iceCandidate, avatarUrl } = await req.json();
    console.log(`[D-ID Stream] Action: ${action}`);

    switch (action) {
      case 'create': {
        // Create a new D-ID streaming session
        console.log('[D-ID Stream] Creating new stream session...');
        
        // Get the avatar URL (custom or default)
        const sourceUrl = getAvatarUrl(avatarUrl);
        
        const createResponse = await fetch(`${DID_API_URL}/talks/streams`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source_url: sourceUrl,
            driver_url: "bank://lively/driver-03", // Natural idle behavior
            config: {
              stitch: true,
              result_format: "mp4",
            },
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('[D-ID Stream] Create error:', errorText);
          throw new Error(`Failed to create D-ID stream: ${createResponse.status} - ${errorText}`);
        }

        const streamData = await createResponse.json();
        console.log('[D-ID Stream] Stream created:', streamData.id);

        return new Response(
          JSON.stringify({
            streamId: streamData.id,
            sdpOffer: streamData.offer,
            iceServers: streamData.ice_servers,
            sessionId: streamData.session_id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sdp': {
        // Send SDP answer to complete WebRTC handshake
        if (!streamId || !sdpAnswer) {
          throw new Error('streamId and sdpAnswer required for SDP action');
        }

        console.log('[D-ID Stream] Sending SDP answer for stream:', streamId);

        const sdpResponse = await fetch(`${DID_API_URL}/talks/streams/${streamId}/sdp`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answer: sdpAnswer,
            session_id: streamId,
          }),
        });

        if (!sdpResponse.ok) {
          const errorText = await sdpResponse.text();
          console.error('[D-ID Stream] SDP error:', errorText);
          throw new Error(`Failed to send SDP answer: ${sdpResponse.status}`);
        }

        console.log('[D-ID Stream] SDP answer accepted');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'ice': {
        // Forward ICE candidate to D-ID
        if (!streamId || !iceCandidate) {
          throw new Error('streamId and iceCandidate required for ICE action');
        }

        console.log('[D-ID Stream] Sending ICE candidate for stream:', streamId);

        const iceResponse = await fetch(`${DID_API_URL}/talks/streams/${streamId}/ice`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            candidate: iceCandidate.candidate,
            sdpMid: iceCandidate.sdpMid,
            sdpMLineIndex: iceCandidate.sdpMLineIndex,
            session_id: streamId,
          }),
        });

        if (!iceResponse.ok) {
          const errorText = await iceResponse.text();
          console.error('[D-ID Stream] ICE error:', errorText);
          // ICE errors are often non-fatal
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'talk': {
        // Stream audio to make the avatar speak
        if (!streamId || !audio) {
          throw new Error('streamId and audio required for talk action');
        }

        console.log('[D-ID Stream] Sending audio to stream:', streamId);

        const talkResponse = await fetch(`${DID_API_URL}/talks/streams/${streamId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            script: {
              type: 'audio',
              audio_url: `data:audio/mp3;base64,${audio}`,
            },
            driver_url: "bank://lively/driver-03",
            config: {
              stitch: true,
            },
            session_id: streamId,
          }),
        });

        if (!talkResponse.ok) {
          const errorText = await talkResponse.text();
          console.error('[D-ID Stream] Talk error:', errorText);
          throw new Error(`Failed to send audio: ${talkResponse.status}`);
        }

        const talkData = await talkResponse.json();
        console.log('[D-ID Stream] Audio sent successfully');

        return new Response(
          JSON.stringify({ success: true, talkId: talkData.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'destroy': {
        // Close the D-ID stream
        if (!streamId) {
          throw new Error('streamId required for destroy action');
        }

        console.log('[D-ID Stream] Destroying stream:', streamId);

        const destroyResponse = await fetch(`${DID_API_URL}/talks/streams/${streamId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (!destroyResponse.ok) {
          const errorText = await destroyResponse.text();
          console.error('[D-ID Stream] Destroy error:', errorText);
          // Non-fatal, stream may have already ended
        }

        console.log('[D-ID Stream] Stream destroyed');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('[D-ID Stream] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'D-ID stream error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
