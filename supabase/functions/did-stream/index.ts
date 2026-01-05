import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// D-ID API configuration
const DID_API_URL = "https://api.d-id.com";

// Default avatar - use D-ID's guaranteed-to-work presenter image
const getAvatarUrl = (customUrl?: string): string => {
  // Only use custom URLs from trusted sources (not Supabase storage)
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
    const { action, streamId, sessionId, sdpAnswer, text, audio, iceCandidate, avatarUrl } = await req.json();
    console.log(`[D-ID Stream] Action: ${action}, streamId: ${streamId}, sessionId: ${sessionId}`);

    switch (action) {
      case 'create': {
        // Create a new D-ID streaming session
        console.log('[D-ID Stream] Creating new stream session...');
        
        const sourceUrl = getAvatarUrl(avatarUrl);
        
        const createResponse = await fetch(`${DID_API_URL}/talks/streams`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source_url: sourceUrl,
            driver_url: "bank://lively/driver-06", // More expressive driver for better lip-sync
            stream_warmup: true,
            config: {
              stitch: true,
              fluent: true, // Enable fluent mode for smoother transitions
              pad_audio: 0.0, // No padding for real-time streaming
            },
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('[D-ID Stream] Create error:', errorText);
          throw new Error(`Failed to create D-ID stream: ${createResponse.status} - ${errorText}`);
        }

        const streamData = await createResponse.json();
        console.log('[D-ID Stream] Stream created - id:', streamData.id, 'session_id:', streamData.session_id);

        const actualSessionId = streamData.session_id;
        
        if (!actualSessionId) {
          console.error('[D-ID Stream] No session_id in response');
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
        if (!streamId || !sessionId || !sdpAnswer) {
          throw new Error('streamId, sessionId, and sdpAnswer required for SDP action');
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
            session_id: sessionId,
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
        if (!streamId || !sessionId || !iceCandidate) {
          throw new Error('streamId, sessionId, and iceCandidate required for ICE action');
        }

        console.log('[D-ID Stream] Sending ICE candidate');

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
            session_id: sessionId,
          }),
        });

        if (!iceResponse.ok) {
          const errorText = await iceResponse.text();
          console.error('[D-ID Stream] ICE error:', errorText);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'talk': {
        // Stream text to make the avatar speak with real-time lip-sync
        if (!streamId || !sessionId) {
          throw new Error('streamId and sessionId required for talk action');
        }

        if (!text && !audio) {
          throw new Error('Either text or audio is required for talk action');
        }

        console.log('[D-ID Stream] Sending talk command, text length:', text?.length || 0);

        const script: any = text 
          ? {
              type: 'text',
              input: text,
              provider: {
                type: 'microsoft',
                voice_id: 'en-US-JennyNeural', // Natural female voice
                voice_config: {
                  style: 'friendly',
                  rate: '1.0',
                }
              }
            }
          : {
              type: 'audio',
              audio_url: `data:audio/mp3;base64,${audio}`,
            };

        const talkResponse = await fetch(`${DID_API_URL}/talks/streams/${streamId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            script,
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
          console.error('[D-ID Stream] Talk error:', errorText);
          throw new Error(`Failed to send talk: ${talkResponse.status}`);
        }

        const talkData = await talkResponse.json();
        console.log('[D-ID Stream] Talk sent successfully');

        return new Response(
          JSON.stringify({ success: true, talkId: talkData.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'destroy': {
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
