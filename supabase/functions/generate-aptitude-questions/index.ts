 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     // Verify authentication
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }

     const supabase = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_ANON_KEY")!,
       { global: { headers: { Authorization: authHeader } } }
     );

     const { data: { user }, error: authError } = await supabase.auth.getUser();
     if (authError || !user) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }

     console.log(`[Aptitude] Authenticated user: ${user.id}`);

     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
      const systemPrompt = `You are an expert aptitude test question generator for competitive job interviews and placement exams. Generate exactly 10 challenging multiple choice questions.
 
 Requirements:
- Questions must be CHALLENGING interview-level aptitude (logical reasoning, quantitative, verbal, analytical)
- NOT computer science specific - suitable for all branches but must be intellectually demanding
- Difficulty mix: 4 medium-hard, 6 hard (NO easy questions)
 - Each question has exactly 4 options (A, B, C, D)
 - Only one correct answer per question
 - Questions must be unique and varied
- Include COMPLEX topics like:
  • Advanced number series with multiple patterns
  • Complex logical puzzles requiring multi-step deduction
  • Tricky percentage and ratio problems with multiple variables
  • Time, speed, distance problems with relative motion
  • Work and efficiency problems with pipes/tanks
  • Probability with combinations and conditional probability
  • Seating arrangements and ordering puzzles
  • Blood relation puzzles with multiple generations
  • Coding-decoding with complex patterns
  • Data sufficiency and statement analysis
  • Syllogisms with 3+ statements
  • Critical reasoning and assumption identification

IMPORTANT: Make questions genuinely challenging - the kind seen in competitive exams like CAT, GRE, GMAT, or top company placement tests. Avoid straightforward calculations. Include multi-step reasoning.
 
 You MUST respond with ONLY a valid JSON array, no markdown, no explanation. Format:
 [
   {
     "id": 1,
     "question": "Question text here?",
     "options": {
       "A": "Option A text",
       "B": "Option B text", 
       "C": "Option C text",
       "D": "Option D text"
     },
     "correctAnswer": "A",
     "difficulty": "easy"
   }
 ]`;
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-2.5-flash",
         messages: [
           { role: "system", content: systemPrompt },
           { role: "user", content: "Generate 10 unique aptitude test questions now. Respond with only the JSON array." }
         ],
         temperature: 0.9,
       }),
     });
 
     if (!response.ok) {
       if (response.status === 429) {
         return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
           status: 429,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       if (response.status === 402) {
         return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
           status: 402,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       const errorText = await response.text();
       console.error("AI gateway error:", response.status, errorText);
       throw new Error(`AI gateway error: ${response.status}`);
     }
 
     const data = await response.json();
     const content = data.choices?.[0]?.message?.content;
 
     if (!content) {
       throw new Error("No content in AI response");
     }
 
     // Parse the JSON from the response (handle potential markdown wrapping)
     let questions;
     try {
       // Remove markdown code blocks if present
       let cleanContent = content.trim();
       if (cleanContent.startsWith("```json")) {
         cleanContent = cleanContent.slice(7);
       } else if (cleanContent.startsWith("```")) {
         cleanContent = cleanContent.slice(3);
       }
       if (cleanContent.endsWith("```")) {
         cleanContent = cleanContent.slice(0, -3);
       }
       questions = JSON.parse(cleanContent.trim());
     } catch (parseError) {
       console.error("Failed to parse AI response:", content);
       throw new Error("Failed to parse questions from AI response");
     }
 
     // Validate we got 10 questions
     if (!Array.isArray(questions) || questions.length !== 10) {
       console.error("Invalid question count:", questions?.length);
       throw new Error("Invalid number of questions generated");
     }
 
     return new Response(JSON.stringify({ questions }), {
       status: 200,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("Error generating aptitude questions:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate questions" }),
       {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });