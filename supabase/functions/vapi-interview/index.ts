import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mode 2 - Live Interview System Prompt (STRICT)
const buildInterviewSystemPrompt = (candidateProfile: any, candidateName: string) => `You are a professional human interviewer conducting a real-time voice interview with ${candidateName || 'the candidate'}.

CRITICAL GROUNDING RULES (NON-NEGOTIABLE):
- You MUST use the candidate profile as the ONLY source of truth
- You MUST explicitly reference project NAMES
- You MUST ask at least ONE question per project
- You MUST ask follow-up questions based on project descriptions
- You MUST reference skills mentioned in the profile
- You are NOT allowed to ask generic questions if projects exist
- You are NOT allowed to invent skills, tools, or experience

INTERVIEW BEHAVIOR:
- Start with a brief introduction addressing the candidate by name
- Ask ONE question at a time
- Increase difficulty gradually
- Maintain natural, human tone
- Do NOT evaluate or score during the interview
- Wait for the candidate's response before continuing
- Keep responses concise and voice-friendly

INTERVIEW FOCUS:
- Project understanding
- Technical depth
- Problem-solving approach
- Communication clarity

CANDIDATE PROFILE (SOURCE OF TRUTH):
<<<
${JSON.stringify(candidateProfile, null, 2)}
>>>`;

// Build personalized first message based on candidate profile
const buildFirstMessage = (candidateName: string, candidateProfile: any) => {
  const name = candidateName || 'there';
  const skills = candidateProfile?.skills?.slice(0, 3)?.join(', ') || '';
  const hasProjects = candidateProfile?.projects?.length > 0;
  const projectName = hasProjects ? candidateProfile.projects[0]?.title : '';
  
  if (skills && projectName) {
    return `Hello ${name}! I'm your AI interviewer today. I've reviewed your background and I'm excited to discuss your experience with ${skills}. I'm particularly interested in your project "${projectName}". Let's start - can you give me a brief overview of your background and what you're passionate about in tech?`;
  } else if (skills) {
    return `Hello ${name}! I'm your AI interviewer today. I've reviewed your resume and I see you have experience with ${skills}. I'm looking forward to learning more about your work. Let's start - can you tell me about yourself and walk me through your background?`;
  } else {
    return `Hello ${name}! I'm your AI interviewer today. Thank you for joining this interview session. Let's start with a brief introduction - can you tell me a little about yourself and walk me through your background?`;
  }
};

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

    if (action === 'start') {
      console.log('Starting interview session - Mode 2 (Live Interview)');
      
      // Build candidate profile from resume highlights for the interview prompt
      let candidateProfile = null;
      let candidateName = '';
      
      if (resumeHighlights) {
        candidateProfile = {
          skills: resumeHighlights.skills || [],
          tools: resumeHighlights.tools || [],
          projects: resumeHighlights.projects || [],
          experience: resumeHighlights.experience || [],
          summary: resumeHighlights.summary || ''
        };
        candidateName = resumeHighlights.name || '';
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
          metadata: { candidateProfile, candidateName }
        });
      }

      // Build system prompt with candidate profile
      const systemPrompt = candidateProfile 
        ? buildInterviewSystemPrompt(candidateProfile, candidateName)
        : buildInterviewSystemPrompt({ message: "No resume data available. Conduct a general behavioral interview." }, '');

      // Build personalized first message
      const firstMessage = buildFirstMessage(candidateName, candidateProfile);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sessionId: newSession?.id,
          publicKey: VAPI_PUBLIC_KEY,
          assistantId: VAPI_ASSISTANT_ID,
          firstMessage,
          // Only override firstMessage - model config should be in VAPI dashboard
          assistantOverrides: {
            firstMessage,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'end') {
      if (!sessionId) {
        throw new Error('sessionId is required to end interview');
      }

      console.log('Ending interview session:', sessionId);

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
