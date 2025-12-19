import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interviewId, userId, transcript } = await req.json();

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

    // If no transcript provided, try to get it from VAPI
    let interviewTranscript = transcript;
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
            content: `You are an expert interview evaluator. Analyze the interview transcript and provide a detailed evaluation.

You must respond with a valid JSON object containing:
- overall_score: Number 1-100
- communication_score: Number 1-100
- technical_score: Number 1-100
- confidence_score: Number 1-100
- feedback: String with detailed overall feedback (2-3 paragraphs)
- improvements: Array of objects with {suggestion: string, category: string, priority: number 1-3}

Categories for improvements: "communication", "technical", "confidence", "preparation", "structure"
Priority: 1=high, 2=medium, 3=low

Be constructive and specific. Return ONLY valid JSON.`
          },
          {
            role: 'user',
            content: interviewTranscript 
              ? `Evaluate this interview transcript:\n\n${interviewTranscript}`
              : `The interview was completed but no transcript is available. Provide a general evaluation with placeholder scores and encourage the student to review their performance. Set all scores to 70 as baseline.`
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
      throw new Error('AI evaluation failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let evaluation;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      // Default evaluation if parsing fails
      evaluation = {
        overall_score: 70,
        communication_score: 70,
        technical_score: 70,
        confidence_score: 70,
        feedback: "Your interview has been completed. Continue practicing to improve your skills.",
        improvements: [
          { suggestion: "Practice STAR method for behavioral questions", category: "structure", priority: 1 },
          { suggestion: "Research common interview questions", category: "preparation", priority: 2 }
        ]
      };
    }

    // Save evaluation
    const { data: evalData, error: evalError } = await supabase
      .from('evaluations')
      .insert({
        interview_id: interviewId,
        user_id: userId,
        overall_score: evaluation.overall_score,
        communication_score: evaluation.communication_score,
        technical_score: evaluation.technical_score,
        confidence_score: evaluation.confidence_score,
        feedback: evaluation.feedback,
      })
      .select()
      .single();

    if (evalError) {
      console.error('Evaluation save error:', evalError);
      throw new Error('Failed to save evaluation');
    }

    // Save improvement suggestions
    if (evaluation.improvements?.length > 0) {
      const suggestions = evaluation.improvements.map((imp: any) => ({
        evaluation_id: evalData.id,
        suggestion: imp.suggestion,
        category: imp.category,
        priority: imp.priority,
      }));

      await supabase.from('improvement_suggestions').insert(suggestions);
    }

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
