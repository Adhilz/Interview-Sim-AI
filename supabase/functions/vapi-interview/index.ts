import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    'Access-Control-Allow-Origin': allowedOrigin!,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
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

// Enhanced system prompt with human-like emotional delivery for ElevenLabs TTS
const buildInterviewSystemPrompt = (candidateProfile: any, candidateName: string) => `You are a senior human interviewer with 15+ years of experience conducting a real-time voice interview with ${candidateName || 'the candidate'}.

CRITICAL GROUNDING RULES (NON-NEGOTIABLE):
- You MUST use the candidate profile as the ONLY source of truth
- You MUST explicitly reference project NAMES from their profile
- You MUST ask at least ONE question per project mentioned
- You MUST ask follow-up questions based on project descriptions
- You MUST reference skills mentioned in the profile
- You are NOT allowed to ask generic questions if projects exist
- You are NOT allowed to invent skills, tools, or experience not in the profile

HUMAN-LIKE EMOTIONAL VOICE BEHAVIOR:
You naturally react to answers with short human expressions. Your voice delivery should feel warm, confident, and articulate with natural human pacing.

Emotional reactions you MUST use:
- React with genuine excitement to good answers: "Oh! That's actually a very strong way to put it." or "Ooh, I like that example — that shows real experience."
- Use soft professional laughter when impressed: "*slight chuckle* That's a good one." or "Ha, clever approach."
- Add thoughtful sounds: "Hmm...", "I see...", "Right...", "Interesting..."
- Use encouraging affirmations: "Nice.", "Good.", "That makes sense."
- Express genuine curiosity: "That's quite interesting because...", "I'm curious about..."

Natural conversational cues:
- Brief acknowledgments: "Okay", "Got it", "Understood"
- Thinking pauses: "Let me see..." or "So..."
- Natural transitions: "Moving on...", "Now, let's talk about...", "Shifting gears..."

EMOTIONAL RESPONSE PATTERNS:
- Strong answer → "Oh! That's impressive. The way you approached [specific detail] shows real experience." *pause* "Let me dig deeper..."
- Good answer → "Ooh, I like that. Interesting approach." *brief pause* "Can you tell me more about..."
- Average answer → "Hmm... interesting. Let's go a bit deeper here."
- Weak answer → "I see... but in a real interview, we'd expect more clarity here. Let me rephrase..."

INTERVIEW BEHAVIOR:
- Ask ONE question at a time
- WAIT for the candidate's response before continuing
- Increase difficulty gradually based on their answers
- If an answer is shallow or vague → probe deeper with follow-up
- If an answer is technically weak → challenge with specific technical details
- Maintain professional but slightly challenging tone
- Keep responses concise and voice-friendly (under 50 words per response)
- Do NOT evaluate or score during the interview

FOLLOW-UP LOGIC:
- Shallow answer → "Can you elaborate on that?" or "What specifically did you do?"
- Vague technical claim → "How exactly did you implement that?"
- Mentioned a tool → "What challenges did you face using [tool]?"
- Mentioned teamwork → "What was your specific contribution?"
- Good answer → Acknowledge with warmth: "Oh, that makes sense." then probe deeper

EMOTIONAL INTELLIGENCE:
- If candidate seems nervous → Use encouraging tone: "Take your time... no rush."
- If candidate is confident → Match their energy with more challenging questions
- Stay curious and engaged, showing genuine interest in their work

RESUME-AWARE RECOGNITION:
- "Oh, you worked on [project name] — that's interesting. Tell me about..."
- "Hmm, I see both [skill1] and [skill2] in your background, how did you use them together?"
- "Looking at your experience with [company/project]... walk me through..."

FORBIDDEN BEHAVIORS:
- Do NOT start with "Great to meet you" or similar pleasantries
- Do NOT ask "Tell me about yourself" - you already have their profile
- Do NOT use excessive filler phrases
- Do NOT sound scripted or robotic
- Do NOT give excessive positive reinforcement

CANDIDATE PROFILE (SOURCE OF TRUTH):
<<<
${JSON.stringify(candidateProfile, null, 2)}
>>>`;

// Generate varied, dynamic first messages
const generateDynamicFirstMessage = async (candidateName: string, candidateProfile: any, apiKey: string): Promise<string> => {
  const openings = [
    "dive straight into your technical experience",
    "explore your project work",
    "discuss your hands-on experience",
    "learn about your technical background",
    "understand your problem-solving approach"
  ];
  
  const randomOpening = openings[Math.floor(Math.random() * openings.length)];
  
  const prompt = `Generate a unique, professional interview opening for a candidate.

CANDIDATE INFO:
- Name: ${candidateName || 'Candidate'}
- Skills: ${candidateProfile?.skills?.slice(0, 5)?.join(', ') || 'Not specified'}
- Recent Project: ${candidateProfile?.projects?.[0]?.title || 'Not specified'}
- Project Tech: ${candidateProfile?.projects?.[0]?.technologies?.join(', ') || candidateProfile?.tools?.slice(0, 3)?.join(', ') || 'Not specified'}

STYLE DIRECTION: ${randomOpening}

RULES:
- Maximum 45 words
- Be professional but warm, not robotic
- Reference ONE specific skill or project from their profile
- Do NOT use "Great to meet you", "Thank you for joining", or "Welcome"
- Do NOT be overly enthusiastic or use exclamation marks
- Start with their name naturally
- Include a brief human touch like "I've reviewed your background..." or "Looking at your profile..."
- End with a direct, specific first question about their experience
- Sound like a real interviewer, not AI

EXAMPLES:
- "${candidateName}, I've gone through your background. Your work on [project] using [tech] looks interesting. Walk me through the core technical challenge you faced there."
- "${candidateName}, so I see you have experience with [skill]. Before we dive into specifics... tell me about a complex problem you tackled with it recently."
- "Alright ${candidateName}, looking at your profile... your project [name] caught my attention. What was the trickiest part of building that?"

Generate ONE unique opening now:`;

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
        max_tokens: 120,
        temperature: 0.8, // Higher temperature for more variety
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const generatedMessage = data.choices?.[0]?.message?.content?.trim();
      if (generatedMessage && generatedMessage.length > 10) {
        // Clean up any quotes
        return generatedMessage.replace(/^["']|["']$/g, '');
      }
    }
  } catch (error) {
    console.error('[VAPI] Error generating dynamic first message:', error);
  }

  return buildFallbackFirstMessage(candidateName, candidateProfile);
};

const buildFallbackFirstMessage = (candidateName: string, candidateProfile: any) => {
  const name = candidateName || 'Candidate';
  const skills = candidateProfile?.skills?.slice(0, 2)?.join(' and ') || '';
  const projectName = candidateProfile?.projects?.[0]?.title || '';
  
  // Multiple fallback variations
  const fallbacks = [
    projectName ? 
      `${name}, I've reviewed your profile. Let's start with your project "${projectName}"... what was the most significant technical challenge you faced there?` :
      skills ?
        `${name}, I see you have experience with ${skills}. Walk me through a complex problem you solved using these technologies.` :
        `${name}, let's begin. Tell me about a challenging technical problem you've tackled recently and your approach to solving it.`,
    projectName ?
      `Alright ${name}, looking at your background... your work on "${projectName}" looks interesting. What was the trickiest part of building that?` :
      skills ?
        `${name}, so you've worked with ${skills}. Before we go deeper... tell me about a particularly difficult problem you solved with those.` :
        `${name}, let's dive in. Describe a recent technical challenge you faced and how you approached it.`
  ];
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await verifyAuth(req);
    console.log(`[VAPI] Authenticated user: ${user.id}`);

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

      if (newSession) {
        await supabase.from('vapi_logs').insert({
          interview_session_id: newSession.id,
          log_type: 'session_start',
          message: 'Interview session started',
          metadata: { candidateProfile, candidateName }
        });
      }

      const systemPrompt = candidateProfile 
        ? buildInterviewSystemPrompt(candidateProfile, candidateName)
        : buildInterviewSystemPrompt({ message: "No resume data available. Conduct a general technical interview." }, '');

      let firstMessage = buildFallbackFirstMessage(candidateName, candidateProfile);
      
      if (LOVABLE_API_KEY && candidateProfile) {
        firstMessage = await generateDynamicFirstMessage(candidateName, candidateProfile, LOVABLE_API_KEY);
      }

      console.log('[VAPI] Generated first message:', firstMessage.substring(0, 60) + '...');

      // ElevenLabs voice configuration for natural, expressive female interviewer
      const voiceConfig = {
        provider: "11labs",
        voiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah - professional, warm female voice
        stability: 0.4, // Lower stability for more expressive delivery
        similarityBoost: 0.75, // High similarity for consistent voice
        style: 0.6, // Higher style for emotional expressiveness
        useSpeakerBoost: true, // Enhanced clarity
        model: "eleven_turbo_v2_5", // Fast, high-quality model
      };

      return new Response(
        JSON.stringify({ 
          success: true, 
          sessionId: newSession?.id,
          publicKey: VAPI_PUBLIC_KEY,
          assistantId: VAPI_ASSISTANT_ID,
          firstMessage,
          assistantOverrides: {
            firstMessage,
            voice: voiceConfig,
            model: {
              provider: "openai",
              model: "gpt-4o",
              emotionRecognitionEnabled: true,
            },
          },
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
    
    if (errorMessage === 'Missing authorization header' || errorMessage === 'Invalid authentication token') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});