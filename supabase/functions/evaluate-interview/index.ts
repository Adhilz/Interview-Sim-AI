import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mode 3 - Interview Evaluation System Prompt (STRICT)
const EVALUATION_SYSTEM_PROMPT = `You are an expert interview evaluator.

INPUTS:
1. Candidate profile JSON
2. Complete interview transcript (all questions and answers)

TASK:
Evaluate the candidate STRICTLY based on their interview responses.
Scores must NOT be fixed, default, or reused.
Each interview must produce DIFFERENT results based on performance.

OUTPUT:
Return ONLY valid JSON in the following format:
{
  "technical_skills": {
    "score": 0,
    "feedback": ""
  },
  "problem_solving": {
    "score": 0,
    "feedback": ""
  },
  "communication": {
    "score": 0,
    "feedback": ""
  },
  "project_understanding": {
    "score": 0,
    "feedback": ""
  },
  "overall_score": 0,
  "strengths": [],
  "areas_for_improvement": [],
  "final_verdict": "",
  "improvements": [
    {
      "suggestion": "",
      "category": "",
      "priority": 1
    }
  ]
}

SCORING RULES:
- Each category score: 0-10 (will be converted to 0-100 scale)
- Overall score = average of all category scores (converted to 0-100)
- Scores MUST reflect transcript quality
- No assumptions beyond provided data
- No template or static responses

Categories for improvements: "communication", "technical", "project_understanding", "preparation", "structure"
Priority: 1=high, 2=medium, 3=low`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interviewId, userId, transcript, candidateProfile } = await req.json();

    if (!interviewId || !userId) {
      throw new Error('Missing required fields');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Evaluating interview - Mode 3 (Interview Evaluation)');

    // If no transcript provided, try to get it from VAPI
    let interviewTranscript = transcript;
    let profile = candidateProfile;

    if (!interviewTranscript) {
      // Get session data
      const { data: session } = await supabase
        .from('interview_sessions')
        .select('vapi_session_id')
        .eq('interview_id', interviewId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (session?.vapi_session_id) {
        const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
        if (VAPI_API_KEY) {
          const vapiResponse = await fetch(`https://api.vapi.ai/call/${session.vapi_session_id}`, {
            headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
          });
          if (vapiResponse.ok) {
            const callData = await vapiResponse.json();
            interviewTranscript = callData.transcript || callData.messages?.map((m: any) => 
              `${m.role}: ${m.content}`
            ).join('\n');
          }
        }
      }
    }

    // Get candidate profile from resume highlights if not provided
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

    // Build the evaluation prompt
    const userPrompt = `CANDIDATE PROFILE:
<<<
${profile ? JSON.stringify(profile, null, 2) : 'No profile available'}
>>>

INTERVIEW TRANSCRIPT:
<<<
${interviewTranscript || 'No transcript available. Provide general feedback with baseline scores.'}
>>>`;

    // Generate evaluation using AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: EVALUATION_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userPrompt
          }
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
      console.log('Failed to parse AI response, using defaults');
      // Default evaluation if parsing fails
      evaluation = {
        technical_skills: { score: 7, feedback: "Unable to fully evaluate from transcript." },
        problem_solving: { score: 7, feedback: "Unable to fully evaluate from transcript." },
        communication: { score: 7, feedback: "Unable to fully evaluate from transcript." },
        confidence: { score: 7, feedback: "Unable to fully evaluate from transcript." },
        overall_score: 70,
        strengths: ["Completed the interview session"],
        areas_for_improvement: ["Continue practicing interview skills"],
        final_verdict: "Your interview has been completed. Continue practicing to improve your skills.",
        improvements: [
          { suggestion: "Practice STAR method for behavioral questions", category: "structure", priority: 1 },
          { suggestion: "Research common interview questions", category: "preparation", priority: 2 }
        ]
      };
    }

    // Convert scores from 0-10 to 0-100 if needed
    const normalizeScore = (score: number) => {
      if (score <= 10) return score * 10;
      return score;
    };

    const overallScore = evaluation.overall_score 
      ? normalizeScore(evaluation.overall_score)
      : Math.round((
          normalizeScore(evaluation.technical_skills?.score || 7) +
          normalizeScore(evaluation.problem_solving?.score || 7) +
          normalizeScore(evaluation.communication?.score || 7) +
          normalizeScore(evaluation.project_understanding?.score || 7)
        ) / 4);

    // Build feedback from individual category feedback
    const feedback = [
      evaluation.final_verdict || '',
      '',
      '**Strengths:**',
      ...(evaluation.strengths?.map((s: string) => `- ${s}`) || []),
      '',
      '**Areas for Improvement:**',
      ...(evaluation.areas_for_improvement?.map((a: string) => `- ${a}`) || [])
    ].join('\n');

    // Save evaluation
    const { data: evalData, error: evalError } = await supabase
      .from('evaluations')
      .insert({
        interview_id: interviewId,
        user_id: userId,
        overall_score: overallScore,
        communication_score: normalizeScore(evaluation.communication?.score || 7),
        technical_score: normalizeScore(evaluation.technical_skills?.score || 7),
        confidence_score: normalizeScore(evaluation.project_understanding?.score || 7),
        feedback: feedback,
      })
      .select()
      .single();

    if (evalError) {
      console.error('Evaluation save error:', evalError);
      throw new Error('Failed to save evaluation');
    }

    // Save improvement suggestions
    const improvements = evaluation.improvements || evaluation.areas_for_improvement?.map((a: string, i: number) => ({
      suggestion: a,
      category: 'general',
      priority: i + 1
    })) || [];

    if (improvements.length > 0) {
      const suggestions = improvements.map((imp: any) => ({
        evaluation_id: evalData.id,
        suggestion: typeof imp === 'string' ? imp : imp.suggestion,
        category: imp.category || 'general',
        priority: imp.priority || 2,
      }));

      await supabase.from('improvement_suggestions').insert(suggestions);
    }

    console.log('Evaluation saved successfully');

    return new Response(
      JSON.stringify({ success: true, evaluation: evalData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-interview function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Evaluation failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
