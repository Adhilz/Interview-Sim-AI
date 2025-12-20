import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default prompts - can be overridden via environment variables
const DEFAULT_SYSTEM_PROMPT = `You are a professional interviewer conducting a mock interview. 
Be encouraging but realistic. Ask follow-up questions based on the candidate's responses.
Focus on behavioral questions and technical skills mentioned in their resume.
Keep responses concise and natural for voice conversation.`;

const DEFAULT_FIRST_MESSAGE = "Hello! I'm your AI interviewer today. Let's start with a simple question - can you briefly tell me about yourself and what position you're interested in?";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, interviewId, sessionId, resumeHighlights } = await req.json();

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_ASSISTANT_ID');
    const VAPI_PUBLIC_KEY = Deno.env.get('VAPI_PUBLIC_KEY');

    // Action to get config for client-side VAPI SDK
    if (action === 'get_config') {
      if (!VAPI_PUBLIC_KEY) {
        return new Response(
          JSON.stringify({ 
            error: 'VAPI_PUBLIC_KEY is not configured',
            setup_required: true,
            instructions: 'Please add VAPI_PUBLIC_KEY to your environment variables. Get it from https://vapi.ai dashboard under API Keys (use the PUBLIC key).'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!VAPI_ASSISTANT_ID) {
        return new Response(
          JSON.stringify({ 
            error: 'VAPI_ASSISTANT_ID is not configured',
            setup_required: true,
            instructions: 'Please add VAPI_ASSISTANT_ID to your environment variables. Create an assistant at https://vapi.ai'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          publicKey: VAPI_PUBLIC_KEY,
          assistantId: VAPI_ASSISTANT_ID,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VAPI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'VAPI_API_KEY is not configured',
          setup_required: true,
          instructions: 'Please add VAPI_API_KEY to your environment variables. Get it from https://vapi.ai'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VAPI_ASSISTANT_ID && action === 'start') {
      return new Response(
        JSON.stringify({ 
          error: 'VAPI_ASSISTANT_ID is not configured',
          setup_required: true,
          instructions: 'Please add VAPI_ASSISTANT_ID to your environment variables. Create an assistant at https://vapi.ai'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get custom prompts from environment or use defaults
    const systemPrompt = Deno.env.get('VAPI_SYSTEM_PROMPT') || DEFAULT_SYSTEM_PROMPT;
    const firstMessage = Deno.env.get('VAPI_FIRST_MESSAGE') || DEFAULT_FIRST_MESSAGE;

    if (action === 'start') {
      // Build context from resume highlights
      let resumeContext = '';
      if (resumeHighlights) {
        resumeContext = `\n\nCandidate's background:
- Skills: ${resumeHighlights.skills?.join(', ') || 'Not provided'}
- Tools: ${resumeHighlights.tools?.join(', ') || 'Not provided'}
- Summary: ${resumeHighlights.summary || 'Not provided'}`;
      }

      // Create interview session record (VAPI call happens client-side via SDK)
      const { data: newSession, error: newSessionError } = await supabase
        .from('interview_sessions')
        .insert({
          interview_id: interviewId,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (newSessionError) {
        console.error('Session creation error:', newSessionError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create interview session',
            details: newSessionError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the start event
      if (newSession) {
        await supabase.from('vapi_logs').insert({
          interview_session_id: newSession.id,
          log_type: 'session_start',
          message: 'Interview session started',
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          sessionId: newSession?.id,
          // Client will use VAPI Web SDK with public key
          publicKey: VAPI_PUBLIC_KEY,
          assistantId: VAPI_ASSISTANT_ID,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'end') {
      if (!sessionId) {
        throw new Error('sessionId is required to end interview');
      }

      // Get the VAPI session ID
      const { data: session } = await supabase
        .from('interview_sessions')
        .select('vapi_session_id')
        .eq('id', sessionId)
        .single();

      if (session?.vapi_session_id) {
        // End VAPI call
        await fetch(`https://api.vapi.ai/call/${session.vapi_session_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
          },
        });
      }

      // Update session
      const endTime = new Date().toISOString();
      const { data: updatedSession } = await supabase
        .from('interview_sessions')
        .update({ 
          end_time: endTime,
        })
        .eq('id', sessionId)
        .select()
        .single();

      // Calculate duration
      if (updatedSession?.start_time) {
        const duration = Math.floor(
          (new Date(endTime).getTime() - new Date(updatedSession.start_time).getTime()) / 1000
        );
        await supabase
          .from('interview_sessions')
          .update({ duration_seconds: duration })
          .eq('id', sessionId);
      }

      // Log end event
      await supabase.from('vapi_logs').insert({
        interview_session_id: sessionId,
        log_type: 'session_end',
        message: 'VAPI session ended',
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get_transcript') {
      if (!sessionId) {
        throw new Error('sessionId is required');
      }

      const { data: session } = await supabase
        .from('interview_sessions')
        .select('vapi_session_id')
        .eq('id', sessionId)
        .single();

      if (!session?.vapi_session_id) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get call details from VAPI
      const vapiResponse = await fetch(`https://api.vapi.ai/call/${session.vapi_session_id}`, {
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
        },
      });

      if (!vapiResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to get transcript' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const callData = await vapiResponse.json();

      return new Response(
        JSON.stringify({ 
          transcript: callData.transcript,
          messages: callData.messages,
          summary: callData.summary
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in vapi-interview function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
