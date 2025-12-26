import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// D-ID API configuration
const DID_API_URL = "https://api.d-id.com";

// Get the Supabase URL to construct the public avatar URL
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';

// Default avatar - use D-ID's guaranteed-to-work presenter image
// Note: Supabase storage URLs don't work reliably with D-ID's image validation
const getAvatarUrl = (customUrl?: string): string => {
  // Only use custom URLs from trusted sources (not Supabase storage)
  // D-ID has issues validating Supabase storage URLs
  if (customUrl && !customUrl.includes('supabase.co/storage')) {
    console.log('[D-ID Stream] Using custom avatar URL:', customUrl);
    return customUrl;
  }
  
  // Use D-ID's sample presenter image which is guaranteed to work
  const defaultUrl = "https://create-images-results.d-id.com/DefaultPresenters/Emma_f/image.png";
  console.log('[D-ID Stream] Using D-ID default avatar URL:', defaultUrl);
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
    const { action, streamId, sessionId, sdpAnswer, audio, iceCandidate, avatarUrl } = await req.json();
    console.log(`[D-ID Stream] Action: ${action}, streamId: ${streamId}, sessionId: ${sessionId}`);

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
            stream_warmup: true, // Enable stream warmup to reduce jittering and show idle avatar
            config: {
              stitch: true,
            },
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('[D-ID Stream] Create error:', errorText);
          throw new Error(`Failed to create D-ID stream: ${createResponse.status} - ${errorText}`);
        }

        const streamData = await createResponse.json();
        
        // Log the full response to understand the structure
        console.log('[D-ID Stream] Full response:', JSON.stringify(streamData, null, 2));
        console.log('[D-ID Stream] Stream created - id:', streamData.id, 'session_id:', streamData.session_id);

        // D-ID returns 'id' as the stream ID and 'session_id' as the WebRTC session identifier
        // Make sure we're getting the correct session_id from the JSON response
        const actualSessionId = streamData.session_id;
        
        if (!actualSessionId) {
          console.error('[D-ID Stream] No session_id in response, full response:', JSON.stringify(streamData));
          throw new Error('D-ID did not return a session_id');
        }

        return new Response(
          JSON.stringify({
            streamId: streamData.id,
            sdpOffer: streamData.offer,
            iceServers: streamData.ice_servers,
            sessionId: actualSessionId,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sdp': {
        // Send SDP answer to complete WebRTC handshake
        // D-ID requires the session_id (not stream_id) for WebRTC negotiation
        if (!streamId || !sessionId || !sdpAnswer) {
          throw new Error('streamId, sessionId, and sdpAnswer required for SDP action');
        }

        console.log('[D-ID Stream] Sending SDP answer for stream:', streamId, 'session:', sessionId);

        const sdpResponse = await fetch(`${DID_API_URL}/talks/streams/${streamId}/sdp`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answer: sdpAnswer,
            session_id: sessionId, // Use the actual session_id from D-ID, not stream_id
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
        // D-ID requires the session_id for ICE candidates
        if (!streamId || !sessionId || !iceCandidate) {
          throw new Error('streamId, sessionId, and iceCandidate required for ICE action');
        }

        console.log('[D-ID Stream] Sending ICE candidate for stream:', streamId, 'session:', sessionId);

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
            session_id: sessionId, // Use the actual session_id from D-ID
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
        if (!streamId || !sessionId || !audio) {
          throw new Error('streamId, sessionId, and audio required for talk action');
        }

        console.log('[D-ID Stream] Sending audio to stream:', streamId, 'session:', sessionId);

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
            session_id: sessionId, // Use the actual session_id
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
