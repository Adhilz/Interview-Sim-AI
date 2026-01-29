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

// Mode 3 - STRICT Interview Evaluation System Prompt
const EVALUATION_SYSTEM_PROMPT = `You are an EXTREMELY STRICT interview evaluator. Your job is to identify weaknesses, not to encourage.

CRITICAL RULES:
- PENALIZE vague, shallow, or generic answers heavily
- PENALIZE filler words, hesitation, and lack of structure
- PENALIZE technically incorrect or misleading explanations
- PENALIZE answers that don't address the actual question asked
- PENALIZE lack of specific examples, metrics, or concrete details
- DO NOT give benefit of the doubt
- DO NOT use encouraging language
- DO NOT inflate scores

SCORING CRITERIA (0-10 scale):

COMMUNICATION (0-10):
- 0-2: Incoherent, cannot form complete thoughts
- 3-4: Rambling, uses excessive filler, unclear structure
- 5-6: Adequate but lacks precision, some rambling
- 7-8: Clear, structured, minimal filler
- 9-10: Exceptional clarity, perfect structure, compelling delivery

TECHNICAL ACCURACY (0-10):
- 0-2: Fundamentally incorrect understanding
- 3-4: Major technical errors or misconceptions
- 5-6: Mostly correct but with gaps or shallow understanding
- 7-8: Accurate with good depth
- 9-10: Expert-level accuracy with nuanced understanding

CONFIDENCE/PRESENCE (0-10):
- 0-2: Cannot answer, excessive hesitation
- 3-4: Very uncertain, many pauses
- 5-6: Some hesitation but recovers
- 7-8: Steady, appropriate pace
- 9-10: Commanding presence, natural confidence

RELEVANCE (0-10):
- 0-2: Completely off-topic
- 3-4: Barely addresses the question
- 5-6: Partially relevant, missing key points
- 7-8: Addresses question well
- 9-10: Perfectly targeted, comprehensive answer

OUTPUT FORMAT (JSON only):
{
  "communication": {
    "score": <0-10>,
    "feedback": "<specific criticism, max 30 words>"
  },
  "technical_accuracy": {
    "score": <0-10>,
    "feedback": "<specific criticism, max 30 words>"
  },
  "confidence": {
    "score": <0-10>,
    "feedback": "<specific criticism, max 30 words>"
  },
  "relevance": {
    "score": <0-10>,
    "feedback": "<specific criticism, max 30 words>"
  },
  "overall_score": <0-100>,
  "verdict": "<harsh but fair 2-sentence summary>",
  "critical_weaknesses": [
    "<weakness 1 - be specific>",
    "<weakness 2 - be specific>",
    "<weakness 3 - be specific>"
  ],
  "improvements": [
    {
      "suggestion": "<specific, actionable improvement>",
      "category": "communication|technical|confidence|preparation|structure",
      "priority": 1
    }
  ],
  "response_analysis": [
    {
      "question": "<interviewer question>",
      "response": "<candidate response>",
      "quality": "good|average|poor",
      "strengths": ["<what was good about this response>"],
      "improvements": ["<how this response could be better>"],
      "score": <1-10>
    }
  ]
}

For response_analysis, analyze EACH candidate response in the transcript:
- Extract the interviewer question and candidate response pair
- Rate each response individually
- Identify specific strengths (what was good)
- Identify specific improvements (what could be better)
- Quality: "good" (7-10), "average" (4-6), "poor" (1-3)

FORBIDDEN PHRASES (never use):
- "Good attempt"
- "Nice effort"
- "Well done"
- "Great job"
- "You showed potential"
- "Keep it up"
- "Promising"

REQUIRED PHRASES (use these instead):
- "The response lacks..."
- "Failed to demonstrate..."
- "Insufficient depth in..."
- "The explanation was technically incorrect because..."
- "The answer did not address..."
- "Critical gap in understanding..."`;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication before processing
    const user = await verifyAuth(req);
    console.log(`[Evaluate] Authenticated user: ${user.id}`);

    const { interviewId, userId, transcript, candidateProfile } = await req.json();

    if (!interviewId || !userId) {
      throw new Error('Missing required fields');
    }

    // Verify the authenticated user matches the userId or is authorized
    if (user.id !== userId) {
      console.warn(`[Evaluate] User ${user.id} attempted to evaluate for user ${userId}`);
      throw new Error('Unauthorized: User mismatch');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Evaluate] Evaluating interview - Mode 3 (STRICT Evaluation)');
    console.log('[Evaluate] Transcript provided:', transcript ? 'yes' : 'no', 'Length:', transcript?.length || 0);
    console.log('[Evaluate] Raw transcript preview:', transcript?.substring(0, 300));

    let interviewTranscript = transcript;
    let profile = candidateProfile;
    let transcriptSource = 'provided';
    let vapiCallData: any = null;

    // ALWAYS try to fetch from VAPI API to get the authoritative transcript
    const { data: session } = await supabase
      .from('interview_sessions')
      .select('vapi_session_id')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (session?.vapi_session_id) {
      console.log('[Evaluate] Found VAPI session ID:', session.vapi_session_id);
      const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
      if (VAPI_API_KEY) {
        try {
          const vapiResponse = await fetch(`https://api.vapi.ai/call/${session.vapi_session_id}`, {
            headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
          });
          
          if (vapiResponse.ok) {
            vapiCallData = await vapiResponse.json();
            console.log('[Evaluate] VAPI call data received');
            console.log('[Evaluate] VAPI messages count:', vapiCallData.messages?.length || 0);
            console.log('[Evaluate] VAPI transcript field:', vapiCallData.transcript ? 'present' : 'absent');
            console.log('[Evaluate] VAPI artifact:', vapiCallData.artifact ? 'present' : 'absent');
            
            // Try multiple sources to build transcript
            let vapiTranscript = '';
            
            // Source 1: Build from messages array (most reliable)
            if (vapiCallData.messages && Array.isArray(vapiCallData.messages)) {
              const transcriptLines: string[] = [];
              
              for (const msg of vapiCallData.messages) {
                // Handle different message formats
                const content = msg.content || msg.text || msg.message;
                if (content && typeof content === 'string' && content.trim().length > 0) {
                  // Map roles correctly - VAPI uses 'user' for candidate, 'assistant' for AI
                  let role = 'Unknown';
                  const msgRole = (msg.role || '').toLowerCase();
                  if (msgRole === 'assistant' || msgRole === 'bot' || msgRole === 'ai') {
                    role = 'Interviewer';
                  } else if (msgRole === 'user' || msgRole === 'human' || msgRole === 'candidate') {
                    role = 'Candidate';
                  } else if (msgRole === 'system') {
                    continue; // Skip system messages
                  } else {
                    // Try to infer from message type or other fields
                    if (msg.type === 'assistant' || msg.sender === 'assistant') {
                      role = 'Interviewer';
                    } else if (msg.type === 'user' || msg.sender === 'user') {
                      role = 'Candidate';
                    }
                  }
                  
                  transcriptLines.push(`${role}: ${content.trim()}`);
                }
              }
              
              if (transcriptLines.length > 0) {
                vapiTranscript = transcriptLines.join('\n');
                transcriptSource = 'vapi_messages';
                console.log('[Evaluate] Built transcript from VAPI messages:', transcriptLines.length, 'lines');
                console.log('[Evaluate] Sample lines:', transcriptLines.slice(0, 3).join(' | '));
              }
            }
            
            // Source 2: Try artifact.messages if available
            if (!vapiTranscript && vapiCallData.artifact?.messages) {
              const transcriptLines: string[] = [];
              for (const msg of vapiCallData.artifact.messages) {
                const content = msg.content || msg.text;
                if (content && typeof content === 'string' && content.trim().length > 0) {
                  const role = (msg.role === 'assistant' || msg.role === 'bot') ? 'Interviewer' : 'Candidate';
                  if (msg.role !== 'system') {
                    transcriptLines.push(`${role}: ${content.trim()}`);
                  }
                }
              }
              if (transcriptLines.length > 0) {
                vapiTranscript = transcriptLines.join('\n');
                transcriptSource = 'vapi_artifact';
                console.log('[Evaluate] Built transcript from VAPI artifact:', transcriptLines.length, 'lines');
              }
            }
            
            // Source 3: Use transcript field directly
            if (!vapiTranscript && vapiCallData.transcript) {
              vapiTranscript = vapiCallData.transcript;
              transcriptSource = 'vapi_transcript_field';
              console.log('[Evaluate] Using VAPI transcript field, length:', vapiTranscript.length);
            }
            
            // Use VAPI transcript if it's better than what was provided
            if (vapiTranscript && vapiTranscript.length > (interviewTranscript?.length || 0)) {
              interviewTranscript = vapiTranscript;
              console.log('[Evaluate] Using VAPI transcript (longer than provided)');
            } else if (vapiTranscript && !interviewTranscript) {
              interviewTranscript = vapiTranscript;
              console.log('[Evaluate] Using VAPI transcript (none provided)');
            }
          } else {
            console.error('[Evaluate] VAPI API error:', vapiResponse.status, await vapiResponse.text());
          }
        } catch (vapiError) {
          console.error('[Evaluate] Error fetching VAPI transcript:', vapiError);
        }
      }
    } else {
      console.warn('[Evaluate] No VAPI session found for interview:', interviewId);
    }

    // Fetch candidate profile if not provided
    if (!profile) {
      const { data: interview } = await supabase
        .from('interviews')
        .select('resume_id')
        .eq('id', interviewId)
        .single();

      if (interview?.resume_id) {
        const { data: highlights } = await supabase
          .from('resume_highlights')
          .select('*')
          .eq('resume_id', interview.resume_id)
          .single();

        if (highlights) {
          profile = {
            skills: highlights.skills || [],
            tools: highlights.tools || [],
            projects: highlights.projects || [],
            experience: highlights.experience || [],
            summary: highlights.summary || ''
          };
        }
      }
    }

    // Enhanced transcript quality analysis - check for user/candidate responses in multiple formats
    const candidatePatterns = [
      /Candidate:/i,
      /User:/i,
      /\buser\b.*?:/i,
      /^[^:]+:\s+[A-Z]/m  // Any role label followed by content starting with capital
    ];
    
    const hasUserResponses = interviewTranscript && candidatePatterns.some(p => p.test(interviewTranscript));
    const transcriptWordCount = interviewTranscript ? interviewTranscript.split(/\s+/).length : 0;
    const transcriptLineCount = interviewTranscript ? interviewTranscript.split('\n').filter((l: string) => l.trim()).length : 0;
    
    // Count actual candidate lines
    const candidateLineCount = interviewTranscript 
      ? interviewTranscript.split('\n').filter((l: string) => /^(Candidate|User):/i.test(l.trim())).length 
      : 0;
    
    console.log('[Evaluate] Transcript analysis:', {
      source: transcriptSource,
      hasUserResponses,
      wordCount: transcriptWordCount,
      lineCount: transcriptLineCount,
      candidateLineCount,
      length: interviewTranscript?.length || 0
    });

    // Build evaluation prompt with quality checks
    let evaluationNote = '';
    if (!hasUserResponses || candidateLineCount === 0) {
      evaluationNote = '\n\nNOTE: The transcript appears to contain NO candidate responses. This may indicate a silent session or audio issues. Assign failing scores accordingly.';
    } else if (transcriptWordCount < 100) {
      evaluationNote = '\n\nNOTE: The transcript is very short. The candidate may not have provided substantial responses. Consider this when scoring.';
    } else if (candidateLineCount < 2) {
      evaluationNote = '\n\nNOTE: The candidate provided very few responses. Consider this when evaluating engagement.';
    }

    const userPrompt = `CANDIDATE PROFILE:
<<<
${profile ? JSON.stringify(profile, null, 2) : 'No profile available'}
>>>

INTERVIEW TRANSCRIPT:
<<<
${interviewTranscript || 'No transcript available. Assign minimum scores across all categories.'}
>>>

TRANSCRIPT SOURCE: ${transcriptSource}
CANDIDATE RESPONSES DETECTED: ${hasUserResponses ? 'Yes' : 'No'}
CANDIDATE RESPONSE COUNT: ${candidateLineCount}
TOTAL WORD COUNT: ${transcriptWordCount}
${evaluationNote}

Evaluate this interview STRICTLY. No soft feedback. Identify every weakness.
IMPORTANT: Include response_analysis array with analysis of EACH candidate response in the transcript.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: EVALUATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI evaluation failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log('AI evaluation response received');

    let evaluation;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      console.log('Failed to parse AI response, using strict defaults');
      evaluation = {
        communication: { score: 4, feedback: "Unable to evaluate from transcript. Insufficient data." },
        technical_accuracy: { score: 4, feedback: "Unable to evaluate from transcript. Insufficient data." },
        confidence: { score: 4, feedback: "Unable to evaluate from transcript. Insufficient data." },
        relevance: { score: 4, feedback: "Unable to evaluate from transcript. Insufficient data." },
        overall_score: 40,
        verdict: "The interview data was insufficient for proper evaluation. The candidate should retry with a complete session.",
        critical_weaknesses: ["Incomplete interview session", "No evaluable responses provided"],
        improvements: [
          { suggestion: "Complete the full interview session", category: "preparation", priority: 1 },
          { suggestion: "Ensure stable connection for full transcript capture", category: "technical", priority: 2 }
        ],
        response_analysis: []
      };
    }

    // Calculate overall score
    const communicationScore = evaluation.communication?.score || 4;
    const technicalScore = evaluation.technical_accuracy?.score || 4;
    const confidenceScore = evaluation.confidence?.score || 4;
    const relevanceScore = evaluation.relevance?.score || 4;
    
    const overallScore = evaluation.overall_score || Math.round(
      ((communicationScore + technicalScore + confidenceScore + relevanceScore) / 4) * 10
    );

    // Build feedback
    const feedback = [
      `**Verdict:** ${evaluation.verdict || 'Evaluation complete.'}`,
      '',
      '**Critical Weaknesses:**',
      ...(evaluation.critical_weaknesses?.map((w: string) => `- ${w}`) || ['- No specific weaknesses identified']),
      '',
      '**Detailed Scores:**',
      `- Communication: ${communicationScore}/10 - ${evaluation.communication?.feedback || 'N/A'}`,
      `- Technical: ${technicalScore}/10 - ${evaluation.technical_accuracy?.feedback || 'N/A'}`,
      `- Confidence: ${confidenceScore}/10 - ${evaluation.confidence?.feedback || 'N/A'}`,
      `- Relevance: ${relevanceScore}/10 - ${evaluation.relevance?.feedback || 'N/A'}`,
    ].join('\n');

    // Prepare response analysis
    const responseAnalysis = evaluation.response_analysis || [];

    // Save evaluation with transcript and response analysis
    const { data: evalData, error: evalError } = await supabase
      .from('evaluations')
      .insert({
        interview_id: interviewId,
        user_id: userId,
        overall_score: overallScore,
        communication_score: communicationScore * 10,
        technical_score: technicalScore * 10,
        confidence_score: confidenceScore * 10,
        feedback: feedback,
        transcript: interviewTranscript || null,
        response_analysis: responseAnalysis.length > 0 ? responseAnalysis : null,
      })
      .select()
      .single();

    if (evalError) {
      console.error('Evaluation save error:', evalError);
      throw new Error('Failed to save evaluation');
    }

    // Save improvement suggestions
    const improvements = evaluation.improvements || [];
    if (improvements.length > 0) {
      const suggestions = improvements.map((imp: any, idx: number) => ({
        evaluation_id: evalData.id,
        suggestion: typeof imp === 'string' ? imp : imp.suggestion,
        category: imp.category || 'general',
        priority: imp.priority || idx + 1,
      }));

      await supabase.from('improvement_suggestions').insert(suggestions);
    }

    console.log('Strict evaluation saved successfully with transcript and response analysis');

    return new Response(
      JSON.stringify({ success: true, evaluation: evalData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-interview function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Evaluation failed';
    
    // Return 401 for authentication errors
    if (errorMessage === 'Missing authorization header' || 
        errorMessage === 'Invalid authentication token' ||
        errorMessage === 'Unauthorized: User mismatch') {
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
