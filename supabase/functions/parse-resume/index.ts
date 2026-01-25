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

const RESUME_PARSING_PROMPT = `You are an expert ATS resume parser with 15 years of experience.

INPUT:
- Plain extracted text from a PDF resume (may include OCR artifacts)
- Text may be poorly formatted, have OCR errors, or be disorganized

TASK:
Extract ALL available information from the resume, cleaning up any OCR artifacts.
Do NOT guess or invent information - only extract what's present.
Handle multi-column layouts, graphics-based sections, and unusual formatting gracefully.

OUTPUT:
Return ONLY valid JSON in the following schema:
{
  "name": "",
  "email": "",
  "phone": "",
  "summary": "",
  "skills": [],
  "tools": [],
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
- Clean up OCR artifacts (random characters, broken words)
- If information is missing, use "" or []
- Extract ALL projects found, not just the first few
- Preserve technical terminology accurately
- Do NOT add extra fields or explanations`;

const OCR_EXTRACTION_PROMPT = `You are an expert OCR system specialized in reading resume images.

TASK:
Carefully extract ALL text from this resume image/PDF scan.
The resume may be:
- Scanned/photographed document
- Multi-column layout
- Contains graphics, icons, or charts
- Has unusual fonts or styling

EXTRACTION RULES:
1. Read ALL text visible in the image
2. Preserve section structure (Education, Experience, Skills, Projects)
3. Handle multi-column layouts - read left column fully, then right
4. Extract text from within graphics/charts if present
5. Clean up any obvious OCR errors
6. Preserve bullet points and list structures
7. Include contact information (email, phone, LinkedIn)

OUTPUT:
Return the extracted text as clean, structured plain text preserving the resume's organization.
Do NOT add any commentary - just the extracted text.`;

// Vision-based OCR using Lovable AI
async function performOCR(base64Image: string, mimeType: string, apiKey: string): Promise<string> {
  console.log('[OCR] Starting Gemini Vision OCR extraction...');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: OCR_EXTRACTION_PROMPT
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OCR] Gemini Vision error:', response.status, errorText);
    throw new Error(`OCR extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const extractedText = data.choices?.[0]?.message?.content?.trim();
  
  if (!extractedText) {
    throw new Error('OCR returned empty result');
  }

  console.log('[OCR] Extracted', extractedText.length, 'characters via Vision AI');
  return extractedText;
}

// Detect if text extraction likely failed (scanned PDF)
function isTextExtractionLikelyFailed(text: string | null | undefined): boolean {
  if (!text) return true;
  
  const trimmed = text.trim();
  
  // Empty or nearly empty
  if (trimmed.length < 50) return true;
  
  // Check for gibberish (high ratio of special characters)
  const alphanumeric = trimmed.replace(/[^a-zA-Z0-9\s]/g, '').length;
  const ratio = alphanumeric / trimmed.length;
  if (ratio < 0.5) return true;
  
  // Check for common resume keywords - if none present, likely failed
  const resumeKeywords = ['experience', 'education', 'skills', 'project', 'work', 'university', 'degree', 'developer', 'engineer'];
  const lowerText = trimmed.toLowerCase();
  const foundKeywords = resumeKeywords.filter(kw => lowerText.includes(kw));
  if (foundKeywords.length < 2) return true;
  
  return false;
}

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

    const { resumeText, resumeId, userId, fileBase64, mimeType, useOCR } = await req.json();

    if (!resumeId || !userId) {
      throw new Error('Missing required fields: resumeId, userId');
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

    let finalResumeText = resumeText;
    let ocrUsed = false;

    // Check if we need OCR
    if (isTextExtractionLikelyFailed(resumeText)) {
      console.log('[Parse Resume] Text extraction appears failed, attempting OCR...');
      
      if (fileBase64 && mimeType) {
        try {
          finalResumeText = await performOCR(fileBase64, mimeType, LOVABLE_API_KEY);
          ocrUsed = true;
          console.log('[Parse Resume] OCR successful, extracted text length:', finalResumeText.length);
        } catch (ocrError) {
          console.error('[Parse Resume] OCR failed:', ocrError);
          // Fall back to original text if OCR fails
          if (!resumeText || resumeText.trim().length === 0) {
            throw new Error('Could not extract text from resume. The PDF may be a scanned image. Please try uploading a PDF with selectable text.');
          }
        }
      } else if (useOCR && fileBase64) {
        // Forced OCR mode
        try {
          finalResumeText = await performOCR(fileBase64, mimeType || 'application/pdf', LOVABLE_API_KEY);
          ocrUsed = true;
        } catch (ocrError) {
          console.error('[Parse Resume] Forced OCR failed:', ocrError);
          throw new Error('OCR extraction failed. Please try a different resume format.');
        }
      }
    }

    if (!finalResumeText || finalResumeText.trim().length < 50) {
      throw new Error('Could not extract meaningful text from resume. Please ensure the PDF contains readable text or try re-uploading.');
    }

    console.log('[Parse Resume] Parsing resume with AI - Mode 1 (Resume Parsing)...');
    console.log('[Parse Resume] Resume text length:', finalResumeText.length, 'OCR used:', ocrUsed);

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
            content: `RESUME TEXT:\n<<<\n${finalResumeText}\n>>>`
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

    console.log('[Parse Resume] AI response received, parsing JSON...');

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

    console.log('[Parse Resume] Resume parsed successfully, OCR used:', ocrUsed);

    return new Response(
      JSON.stringify({ 
        success: true, 
        highlights: result.data,
        ocrUsed,
        extractedTextLength: finalResumeText.length
      }),
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