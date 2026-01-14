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

// Format resume highlights into clear, readable format for LLM
const formatResumeForLLM = (candidateProfile: any): string => {
  if (!candidateProfile) return "No resume data available.";
  
  let formatted = "";
  
  // Name
  if (candidateProfile.name) {
    formatted += `CANDIDATE NAME: ${candidateProfile.name}\n\n`;
  }
  
  // Summary
  if (candidateProfile.summary) {
    formatted += `SUMMARY:\n${candidateProfile.summary}\n\n`;
  }
  
  // Skills - list ALL of them
  if (candidateProfile.skills?.length > 0) {
    formatted += `TECHNICAL SKILLS (ask about ANY of these):\n`;
    candidateProfile.skills.forEach((skill: string, i: number) => {
      formatted += `  ${i + 1}. ${skill}\n`;
    });
    formatted += "\n";
  }
  
  // Tools - list ALL of them
  if (candidateProfile.tools?.length > 0) {
    formatted += `TOOLS & TECHNOLOGIES (ask about ANY of these):\n`;
    candidateProfile.tools.forEach((tool: string, i: number) => {
      formatted += `  ${i + 1}. ${tool}\n`;
    });
    formatted += "\n";
  }
  
  // Projects - DETAILED listing of ALL projects
  if (candidateProfile.projects?.length > 0) {
    formatted += `PROJECTS (YOU MUST ASK ABOUT MULTIPLE PROJECTS, NOT JUST THE FIRST ONE):\n`;
    candidateProfile.projects.forEach((project: any, i: number) => {
      formatted += `\n  PROJECT ${i + 1}: "${project.title || 'Untitled Project'}"\n`;
      if (project.description) {
        formatted += `    Description: ${project.description}\n`;
      }
      if (project.technologies?.length > 0) {
        formatted += `    Technologies: ${project.technologies.join(', ')}\n`;
      }
      if (project.highlights?.length > 0) {
        formatted += `    Key achievements: ${project.highlights.join('; ')}\n`;
      }
    });
    formatted += "\n";
  }
  
  // Experience - DETAILED listing
  if (candidateProfile.experience?.length > 0) {
    formatted += `WORK EXPERIENCE (ask about specific roles and responsibilities):\n`;
    candidateProfile.experience.forEach((exp: any, i: number) => {
      formatted += `\n  EXPERIENCE ${i + 1}: ${exp.title || exp.role || 'Role'} at ${exp.company || 'Company'}\n`;
      if (exp.duration || exp.dates) {
        formatted += `    Duration: ${exp.duration || exp.dates}\n`;
      }
      if (exp.description) {
        formatted += `    Details: ${exp.description}\n`;
      }
      if (exp.achievements?.length > 0) {
        formatted += `    Achievements: ${exp.achievements.join('; ')}\n`;
      }
    });
    formatted += "\n";
  }
  
  // Education
  if (candidateProfile.education?.length > 0) {
    formatted += `EDUCATION:\n`;
    candidateProfile.education.forEach((edu: any, i: number) => {
      if (typeof edu === 'string') {
        formatted += `  ${i + 1}. ${edu}\n`;
      } else {
        formatted += `  ${i + 1}. ${edu.degree || ''} ${edu.field || ''} - ${edu.institution || edu.school || ''}\n`;
      }
    });
    formatted += "\n";
  }
  
  return formatted;
};

// Enhanced system prompt with STRICT resume grounding and emotional delivery
const buildInterviewSystemPrompt = (candidateProfile: any, candidateName: string) => {
  const formattedResume = formatResumeForLLM(candidateProfile);
  
  return `You are a senior human interviewer with 15+ years of experience conducting a real-time voice interview with ${candidateName || 'the candidate'}.

=== ABSOLUTE RULE: RESUME-ONLY QUESTIONING ===
You MUST ONLY ask questions about what is in the candidate's resume below.
You are FORBIDDEN from asking about projects, skills, or experiences NOT listed in their resume.
If you want to ask about something, FIRST check if it exists in their resume.
If it's not there, DO NOT ask about it.

=== MANDATORY EMOTIONAL EXPRESSIONS (USE THESE FREQUENTLY) ===
You MUST include these natural human sounds and reactions in EVERY response:

INTERJECTIONS (use at least one per response):
- "Oh!" - when surprised or impressed
- "Ooh!" - when intrigued
- "Ah..." - when understanding something
- "Hmm..." - when thinking
- "Mm-hmm" - when acknowledging

REACTIONS (sprinkle naturally):
- "*slight chuckle*" or "*soft laugh*" - when amused or impressed
- "I see..." - when processing information
- "Right..." - when following along
- "Interesting..." - when genuinely curious

AFFIRMATIONS (after good answers):
- "Nice."
- "Good."
- "That makes sense."
- "That's solid."

EXAMPLE RESPONSES WITH EMOTIONS:
- "Oh! That's actually quite impressive. *slight chuckle* I like how you approached the caching problem. Hmm... but tell me, what happened when..."
- "Ooh, interesting. So you used Redis there... Right. And how did that scale?"
- "Ah... I see what you did. *soft laugh* That's clever. Now, moving to your other project..."
- "Hmm... okay. I get the general idea, but... can you be more specific about the implementation?"

=== PROJECT COVERAGE RULE ===
You MUST ask about MULTIPLE different projects from the resume, not just the first one.
After 2-3 questions about one project, EXPLICITLY move to another project:
- "Alright, let's shift to your other project... I see you also worked on [PROJECT NAME FROM RESUME]..."
- "Okay, moving on... Hmm, your work on [DIFFERENT PROJECT] looks interesting..."

=== INTERVIEW BEHAVIOR ===
- Ask ONE question at a time
- WAIT for the candidate's response
- Keep responses under 50 words (voice-friendly)
- Increase difficulty based on their answers
- If answer is shallow → probe deeper
- If answer is vague → ask for specifics

=== FORBIDDEN BEHAVIORS ===
- Do NOT ask about projects not in their resume
- Do NOT invent skills or tools they don't have
- Do NOT ask generic questions like "Tell me about yourself"
- Do NOT skip the emotional expressions - they are MANDATORY
- Do NOT only focus on one project - you MUST cover multiple

=== CANDIDATE'S COMPLETE RESUME (YOUR ONLY SOURCE OF TRUTH) ===
${formattedResume}

Remember: ONLY ask about what's above. Use emotional expressions. Cover MULTIPLE projects.`;
};

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

      // Pass system prompt to the model for resume-aware questioning
      const modelConfig = {
        provider: "openai",
        model: "gpt-4o",
        emotionRecognitionEnabled: true,
        messages: [
          {
            role: "system",
            content: systemPrompt
          }
        ]
      };

      console.log('[VAPI] System prompt length:', systemPrompt.length);
      console.log('[VAPI] Projects in profile:', candidateProfile?.projects?.length || 0);

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
            model: modelConfig,
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