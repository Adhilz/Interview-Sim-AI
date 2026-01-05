import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mode 2 - Live Interview System Prompt (STRICT & DYNAMIC)
const buildInterviewSystemPrompt = (candidateProfile: any, candidateName: string) => `You are a professional human interviewer conducting a real-time voice interview with ${candidateName || 'the candidate'}.

CRITICAL GROUNDING RULES (NON-NEGOTIABLE):
- You MUST use the candidate profile as the ONLY source of truth
- You MUST explicitly reference project NAMES from their profile
- You MUST ask at least ONE question per project mentioned
- You MUST ask follow-up questions based on project descriptions
- You MUST reference skills mentioned in the profile
- You are NOT allowed to ask generic questions if projects exist
- You are NOT allowed to invent skills, tools, or experience not in the profile

INTERVIEW BEHAVIOR:
- Ask ONE question at a time
- WAIT for the candidate's response before continuing
- Increase difficulty gradually based on their answers
- If an answer is shallow or vague → probe deeper with follow-up
- If an answer is technically weak → challenge with specific technical details
- Maintain professional but slightly challenging tone
- Keep responses concise and voice-friendly (under 50 words per response)
- Do NOT evaluate or score during the interview
- Do NOT give positive reinforcement like "Great answer" or "Good job"
- Use neutral transitions like "I see", "Understood", "Let's move on"

FOLLOW-UP LOGIC:
- Shallow answer → Ask "Can you elaborate on that?" or "What specifically did you do?"
- Vague technical claim → Ask "How exactly did you implement that?"
- Mentioned a tool → Ask "What challenges did you face using [tool]?"
- Mentioned teamwork → Ask "What was your specific contribution?"

FORBIDDEN BEHAVIORS:
- Do NOT start with "Great to meet you" or similar pleasantries
- Do NOT ask "Tell me about yourself" - you already have their profile
- Do NOT use filler phrases like "That's interesting"
- Do NOT compliment or encourage during the interview

CANDIDATE PROFILE (SOURCE OF TRUTH):
<<<
${JSON.stringify(candidateProfile, null, 2)}
>>>`;

// Generate dynamic first message using AI
const generateDynamicFirstMessage = async (candidateName: string, candidateProfile: any, apiKey: string): Promise<string> => {
  const prompt = `Generate a professional, unique interview opening for a candidate.

CANDIDATE INFO:
- Name: ${candidateName || 'Candidate'}
- Skills: ${candidateProfile?.skills?.slice(0, 5)?.join(', ') || 'Not specified'}
- Recent Project: ${candidateProfile?.projects?.[0]?.title || 'Not specified'}
- Project Tech: ${candidateProfile?.projects?.[0]?.technologies?.join(', ') || candidateProfile?.tools?.slice(0, 3)?.join(', ') || 'Not specified'}

RULES:
- Maximum 40 words
- Be professional, neutral, slightly formal
- Reference ONE specific skill or project from their profile
- Do NOT use "Great to meet you" or "Thank you for joining"
- Do NOT be overly enthusiastic
- Start with their name
- End with a direct, specific first question about their experience

EXAMPLES OF GOOD OPENINGS:
- "${candidateName}, I've reviewed your background in [skill]. Let's discuss your work on [project] - what was the core technical challenge you solved?"
- "${candidateName}, your experience with [technology] caught my attention. Walk me through a complex problem you tackled using it."

Generate ONE opening now:`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const generatedMessage = data.choices?.[0]?.message?.content?.trim();
      if (generatedMessage && generatedMessage.length > 10) {
        return generatedMessage;
      }
    }
  } catch (error) {
    console.error('[VAPI] Error generating dynamic first message:', error);
  }

  // Fallback to template-based message
  return buildFallbackFirstMessage(candidateName, candidateProfile);
};

const buildFallbackFirstMessage = (candidateName: string, candidateProfile: any) => {
  const name = candidateName || 'Candidate';
  const skills = candidateProfile?.skills?.slice(0, 2)?.join(' and ') || '';
  const projectName = candidateProfile?.projects?.[0]?.title || '';
  
  if (projectName) {
    return `${name}, I've reviewed your profile. Let's start with your project "${projectName}" - what was the most significant technical challenge you faced?`;
  } else if (skills) {
    return `${name}, I see you have experience with ${skills}. Walk me through a complex problem you solved using these technologies.`;
  }
  return `${name}, let's begin. Tell me about a challenging technical problem you've solved recently and your approach to solving it.`;
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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (action === 'get_config') {
      if (!VAPI_PUBLIC_KEY) {
        return new Response(
          JSON.stringify({ 
            error: 'VAPI_PUBLIC_KEY is not configured',
            setup_required: true,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!VAPI_ASSISTANT_ID) {
        return new Response(
          JSON.stringify({ 
            error: 'VAPI_ASSISTANT_ID is not configured',
            setup_required: true,
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
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'start') {
      console.log('Starting interview session - Mode 2 (Live Interview)');
      
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

      // Create interview session record
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

      // Build system prompt
      const systemPrompt = candidateProfile 
        ? buildInterviewSystemPrompt(candidateProfile, candidateName)
        : buildInterviewSystemPrompt({ message: "No resume data available. Conduct a general technical interview." }, '');

      // Generate dynamic first message using AI
      let firstMessage = buildFallbackFirstMessage(candidateName, candidateProfile);
      
      if (LOVABLE_API_KEY && candidateProfile) {
        firstMessage = await generateDynamicFirstMessage(candidateName, candidateProfile, LOVABLE_API_KEY);
      }

      console.log('[VAPI] Generated first message:', firstMessage.substring(0, 50) + '...');

      return new Response(
        JSON.stringify({ 
          success: true, 
          sessionId: newSession?.id,
          publicKey: VAPI_PUBLIC_KEY,
          assistantId: VAPI_ASSISTANT_ID,
          firstMessage,
          assistantOverrides: {
            firstMessage,
            model: {
              provider: 'custom-llm',
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'system', content: systemPrompt }],
            },
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'end') {
      if (!sessionId) {
        throw new Error('sessionId is required to end interview');
      }

      console.log('Ending interview session:', sessionId);

      const { data: session } = await supabase
        .from('interview_sessions')
        .select('vapi_session_id')
        .eq('id', sessionId)
        .single();

      if (session?.vapi_session_id) {
        await fetch(`https://api.vapi.ai/call/${session.vapi_session_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
        });
      }

      const endTime = new Date().toISOString();
      const { data: updatedSession } = await supabase
        .from('interview_sessions')
        .update({ end_time: endTime })
        .eq('id', sessionId)
        .select()
        .single();

      if (updatedSession?.start_time) {
        const duration = Math.floor(
          (new Date(endTime).getTime() - new Date(updatedSession.start_time).getTime()) / 1000
        );
        await supabase
          .from('interview_sessions')
          .update({ duration_seconds: duration })
          .eq('id', sessionId);
      }

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

      const vapiResponse = await fetch(`https://api.vapi.ai/call/${session.vapi_session_id}`, {
        headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
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
