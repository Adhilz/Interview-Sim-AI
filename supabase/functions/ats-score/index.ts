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

// OCR extraction prompt for scanned PDFs
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
  console.log('[ATS OCR] Starting Gemini Vision OCR extraction...');
  
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
    console.error('[ATS OCR] Gemini Vision error:', response.status, errorText);
    throw new Error(`OCR extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const extractedText = data.choices?.[0]?.message?.content?.trim();
  
  if (!extractedText) {
    throw new Error('OCR returned empty result');
  }

  console.log('[ATS OCR] Extracted', extractedText.length, 'characters via Vision AI');
  return extractedText;
}

// Detect if text extraction likely failed (scanned PDF)
function isTextExtractionLikelyFailed(text: string | null | undefined): boolean {
  if (!text) return true;
  
  const trimmed = text.trim();
  
  // Empty or nearly empty
  if (trimmed.length < 100) return true;
  
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
    const user = await verifyAuth(req);
    console.log(`[ATS Score] Authenticated user: ${user.id}`);

    const { resumeText, resumeId, userId, jobRole, fileBase64, mimeType } = await req.json();

    if (!resumeId || !userId) {
      throw new Error('Missing required fields: resumeId, userId');
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
    
    let finalResumeText = resumeText;
    let ocrUsed = false;

    // Check if we need OCR
    if (isTextExtractionLikelyFailed(resumeText)) {
      console.log('[ATS Score] Text extraction appears failed, attempting OCR...');
      
      if (fileBase64 && mimeType) {
        try {
          finalResumeText = await performOCR(fileBase64, mimeType, LOVABLE_API_KEY);
          ocrUsed = true;
          console.log('[ATS Score] OCR successful, extracted text length:', finalResumeText.length);
        } catch (ocrError) {
          console.error('[ATS Score] OCR failed:', ocrError);
          // If we have some text, use it even if it's not great
          if (resumeText && resumeText.trim().length > 0) {
            finalResumeText = resumeText;
            console.log('[ATS Score] Using original text as OCR fallback failed');
          } else {
            throw new Error('Could not extract text from resume. Please try uploading a PDF with selectable text.');
          }
        }
      } else if (!resumeText || resumeText.trim().length < 50) {
        throw new Error('Could not extract text from resume. Please provide the resume file for OCR processing.');
      }
    }

    if (!finalResumeText || finalResumeText.trim().length < 50) {
      throw new Error('Could not extract meaningful text from resume for ATS analysis.');
    }

    console.log(`[ATS Score] Resume text length: ${finalResumeText.length}, OCR used: ${ocrUsed}`);

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
            content: `TARGET JOB ROLE: ${targetRole}\n\nRESUME TEXT:\n<<<\n${finalResumeText}\n>>>\n\nProvide comprehensive ATS analysis.`
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
        recommendedKeywords: parsedData.recommended_keywords || [],
        ocrUsed
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
