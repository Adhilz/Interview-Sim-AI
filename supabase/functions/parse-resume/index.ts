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
    const { resumeText, resumeId, userId } = await req.json();

    if (!resumeText || !resumeId || !userId) {
      throw new Error('Missing required fields: resumeText, resumeId, userId');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Parsing resume with Gemini...');

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
            content: `You are an expert resume parser. Extract structured information from resumes.
            
You must respond with a valid JSON object containing these fields:
- summary: A 2-3 sentence professional summary
- skills: Array of technical/soft skills (strings)
- tools: Array of tools, technologies, frameworks (strings)
- experience: Array of objects with {company, role, duration, highlights: string[]}
- projects: Array of objects with {name, description, technologies: string[]}
- education: Array of objects with {institution, degree, year, gpa?}

Be thorough and extract all relevant information. Return ONLY valid JSON, no other text.`
          },
          {
            role: 'user',
            content: `Parse this resume and extract structured information:\n\n${resumeText}`
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

    // Parse the JSON response
    let parsedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
