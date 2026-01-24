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

const ATS_ANALYSIS_PROMPT = `You are a senior ATS optimization specialist and technical recruiter. You evaluate resumes exactly like real Applicant Tracking Systems and human hiring managers, giving brutally honest, constructive feedback and concrete improvement suggestions.

Analyze the resume for the given job role and provide a comprehensive ATS compatibility assessment.

SCORING CRITERIA (0-100):
1. Keyword Match (25%): How well skills/experience match the job role
2. Skills Alignment (20%): Technical and soft skills relevance
3. Action Verbs & Impact (15%): Use of strong verbs and quantifiable results
4. ATS Structure (15%): Standard sections (Summary, Experience, Projects, Skills, Education, Certifications)
5. Formatting (15%): Single-column, no tables/images/icons, clean parsing
6. Readability (10%): Clear, scannable content

OUTPUT FORMAT (JSON only):
{
  "overall_score": <0-100>,
  "keyword_match_percentage": <0-100>,
  "section_scores": {
    "summary": <0-100>,
    "experience": <0-100>,
    "projects": <0-100>,
    "skills": <0-100>,
    "education": <0-100>,
    "certifications": <0-100 or null if missing>
  },
  "missing_keywords": ["keyword1", "keyword2", ...],
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "formatting_issues": ["issue1", "issue2", ...],
  "recruiter_review": "Detailed, honest 3-4 paragraph review covering: overall impression, what works well, critical gaps, and hiring manager perspective",
  "improvement_suggestions": [
    {
      "category": "Experience|Skills|Summary|Projects|Format",
      "original": "original text if applicable",
      "improved": "rewritten/improved version",
      "reason": "why this change helps"
    }
  ],
  "optimized_bullets": [
    {
      "original": "weak bullet point",
      "optimized": "strong, quantified version",
      "impact_added": "what measurable impact was added"
    }
  ],
  "recommended_keywords": ["keyword1", "keyword2", ...]
}

RULES:
- Be brutally honest but constructive
- Provide specific, actionable improvements
- Focus on ATS parsing success
- Consider both ATS algorithms and human reviewers
- Return ONLY valid JSON, no explanations outside JSON`;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await verifyAuth(req);
    console.log(`[ATS Score] Authenticated user: ${user.id}`);

    const { resumeText, resumeId, userId, jobRole } = await req.json();

    if (!resumeText || !resumeId || !userId) {
      throw new Error('Missing required fields: resumeText, resumeId, userId');
    }

    if (user.id !== userId) {
      throw new Error('Unauthorized: User mismatch');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const targetRole = jobRole || 'Software Engineer';
    console.log(`[ATS Score] Analyzing resume for role: ${targetRole}`);
    console.log(`[ATS Score] Resume text length: ${resumeText.length}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: ATS_ANALYSIS_PROMPT
          },
          {
            role: 'user',
            content: `TARGET JOB ROLE: ${targetRole}\n\nRESUME TEXT:\n<<<\n${resumeText}\n>>>\n\nProvide comprehensive ATS analysis.`
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
      const errorText = await response.text();
      console.error('[ATS Score] AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('[ATS Score] AI response received, parsing JSON...');

    let parsedData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        console.error('[ATS Score] No JSON found in response:', content);
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[ATS Score] Failed to parse AI response:', content);
      throw new Error('Failed to parse ATS analysis');
    }

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if score already exists for this resume and job role
    const { data: existing } = await supabase
      .from('ats_scores')
      .select('id')
      .eq('resume_id', resumeId)
      .eq('job_role', targetRole)
      .single();

    const scoreData = {
      resume_id: resumeId,
      user_id: userId,
      job_role: targetRole,
      overall_score: parsedData.overall_score || 0,
      keyword_match_percentage: parsedData.keyword_match_percentage || 0,
      section_scores: parsedData.section_scores || {},
      missing_keywords: parsedData.missing_keywords || [],
      strengths: parsedData.strengths || [],
      weaknesses: parsedData.weaknesses || [],
      improvement_suggestions: parsedData.improvement_suggestions || [],
      recruiter_review: parsedData.recruiter_review || '',
      formatting_issues: parsedData.formatting_issues || [],
      optimized_bullets: parsedData.optimized_bullets || [],
    };

    let result;
    if (existing) {
      result = await supabase
        .from('ats_scores')
        .update({ ...scoreData, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('ats_scores')
        .insert(scoreData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('[ATS Score] Database error:', result.error);
      throw new Error('Failed to save ATS score');
    }

    console.log('[ATS Score] Analysis saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        atsScore: result.data,
        recommendedKeywords: parsedData.recommended_keywords || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ATS Score] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze resume';
    
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
