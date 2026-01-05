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

const RESUME_PARSING_PROMPT = `You are an advanced ATS resume parser.

INPUT:
- Plain extracted text from a PDF resume
- Text may be poorly formatted or broken

TASK:
Extract ALL available information from the resume.
Do NOT guess missing data.

OUTPUT:
Return ONLY valid JSON in the following schema:
{
  "name": "",
  "email": "",
  "phone": "",
  "skills": [],
  "projects": [
    {
      "title": "",
      "description": "",
      "technologies": []
    }
  ],
  "experience": [
    {
      "company": "",
      "role": "",
      "duration": "",
      "description": ""
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "year": ""
    }
  ]
}

RULES:
- If information is missing, use "" or []
- Do NOT add extra fields
- Do NOT add explanations
- Do NOT summarize`;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication before processing
    const user = await verifyAuth(req);
    console.log(`[Parse Resume] Authenticated user: ${user.id}`);

    const { resumeText, resumeId, userId } = await req.json();

    if (!resumeText || !resumeId || !userId) {
      throw new Error('Missing required fields: resumeText, resumeId, userId');
    }

    // Verify the authenticated user matches the userId
    if (user.id !== userId) {
      console.warn(`[Parse Resume] User ${user.id} attempted to parse for user ${userId}`);
      throw new Error('Unauthorized: User mismatch');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Parsing resume with AI - Mode 1 (Resume Parsing)...');
    console.log('Resume text length:', resumeText.length);

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
            content: RESUME_PARSING_PROMPT
          },
          {
            role: 'user',
            content: `RESUME TEXT:\n<<<\n${resumeText}\n>>>`
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
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing JSON...');

    // Parse the JSON response
    let parsedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        console.error('No JSON found in response:', content);
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse resume data');
    }

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if highlights already exist
    const { data: existing } = await supabase
      .from('resume_highlights')
      .select('id')
      .eq('resume_id', resumeId)
      .single();

    const highlightData = {
      resume_id: resumeId,
      user_id: userId,
      summary: parsedData.summary || null,
      skills: parsedData.skills || [],
      tools: parsedData.tools || [],
      experience: parsedData.experience || [],
      projects: parsedData.projects || [],
      education: parsedData.education || [],
    };

    let result;
    if (existing) {
      result = await supabase
        .from('resume_highlights')
        .update(highlightData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('resume_highlights')
        .insert(highlightData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Database error:', result.error);
      throw new Error('Failed to save resume highlights');
    }

    // Update resume parsed_at
    await supabase
      .from('resumes')
      .update({ parsed_at: new Date().toISOString() })
      .eq('id', resumeId);

    console.log('Resume parsed successfully');

    return new Response(
      JSON.stringify({ success: true, highlights: result.data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-resume function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse resume';
    
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
