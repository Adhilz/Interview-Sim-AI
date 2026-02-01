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

// Interview mode types
type InterviewMode = 'resume_jd' | 'technical' | 'hr';

// Build question pools from resume data (for resume_jd mode)
interface QuestionPool {
  category: string;
  topic: string;
  questions: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

function buildQuestionPools(candidateProfile: any): QuestionPool[] {
  const pools: QuestionPool[] = [];
  
  // Project-based questions - one pool per project
  if (candidateProfile?.projects?.length > 0) {
    candidateProfile.projects.forEach((project: any, index: number) => {
      const projectTitle = project.title || `Project ${index + 1}`;
      const techs = project.technologies?.join(', ') || 'the technologies';
      
      pools.push({
        category: 'project',
        topic: projectTitle,
        difficulty: 'medium',
        questions: [
          `Walk me through the architecture of "${projectTitle}". What were the key design decisions?`,
          `What was the most technically challenging part of building "${projectTitle}"?`,
          `How did you handle scalability concerns in "${projectTitle}"?`,
          `Tell me about a bug you encountered in "${projectTitle}" and how you debugged it.`,
          `If you were to rebuild "${projectTitle}" today, what would you do differently?`,
          `How did you test "${projectTitle}"? What was your testing strategy?`,
          `Explain how ${techs} were used together in "${projectTitle}".`,
        ]
      });
    });
  }
  
  // Skill-based questions
  if (candidateProfile?.skills?.length > 0) {
    // Group skills into pools
    const technicalSkills = candidateProfile.skills.filter((s: string) => 
      /react|node|python|java|sql|aws|docker|kubernetes|typescript|javascript|api|database/i.test(s)
    );
    
    technicalSkills.forEach((skill: string) => {
      pools.push({
        category: 'skill',
        topic: skill,
        difficulty: 'medium',
        questions: [
          `You've listed ${skill} - can you explain a complex problem you solved using it?`,
          `What's your experience level with ${skill}? Give me a specific example.`,
          `How do you stay updated with changes and best practices in ${skill}?`,
          `Compare ${skill} to an alternative - when would you choose one over the other?`,
        ]
      });
    });
  }
  
  // Experience-based questions
  if (candidateProfile?.experience?.length > 0) {
    candidateProfile.experience.forEach((exp: any) => {
      const role = exp.role || exp.title || 'your role';
      const company = exp.company || 'that company';
      
      pools.push({
        category: 'experience',
        topic: `${role} at ${company}`,
        difficulty: 'medium',
        questions: [
          `Tell me about your most impactful contribution as ${role} at ${company}.`,
          `What technical decisions did you own during your time at ${company}?`,
          `Describe a challenging situation you faced at ${company} and how you handled it.`,
          `How did you collaborate with other teams in your role at ${company}?`,
        ]
      });
    });
  }
  
  // Behavioral questions pool
  pools.push({
    category: 'behavioral',
    topic: 'General Behavioral',
    difficulty: 'easy',
    questions: [
      `Tell me about a time you had to learn a new technology quickly. How did you approach it?`,
      `Describe a situation where you disagreed with a technical decision. How did you handle it?`,
      `Give me an example of a project that didn't go as planned. What did you learn?`,
      `How do you prioritize when you have multiple deadlines?`,
    ]
  });
  
  // System design / problem-solving pool
  pools.push({
    category: 'problem-solving',
    topic: 'System Design & Problem Solving',
    difficulty: 'hard',
    questions: [
      `Walk me through how you would design a system similar to one of your projects but at 100x scale.`,
      `If you had to debug a production issue with limited logs, what's your approach?`,
      `How would you improve the performance of a slow API endpoint?`,
      `Describe your approach to designing a new feature from scratch.`,
    ]
  });
  
  return pools;
}

// Generate randomized interview strategy
function generateInterviewStrategy(pools: QuestionPool[]): string {
  const shuffled = [...pools].sort(() => Math.random() - 0.5);
  
  // Pick random starting point - NOT always the first project
  const startingCategories = ['project', 'skill', 'behavioral', 'experience'];
  const randomStart = startingCategories[Math.floor(Math.random() * startingCategories.length)];
  
  // Reorder to start with random category
  const reordered = [
    ...shuffled.filter(p => p.category === randomStart),
    ...shuffled.filter(p => p.category !== randomStart)
  ];
  
  const strategy = reordered.slice(0, 5).map((pool, i) => 
    `${i + 1}. ${pool.category.toUpperCase()}: "${pool.topic}" - Sample: "${pool.questions[0]}"`
  ).join('\n');
  
  return strategy;
}

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
    formatted += `TECHNICAL SKILLS (can ask about ANY of these):\n`;
    candidateProfile.skills.forEach((skill: string, i: number) => {
      formatted += `  ${i + 1}. ${skill}\n`;
    });
    formatted += "\n";
  }
  
  // Tools - list ALL of them
  if (candidateProfile.tools?.length > 0) {
    formatted += `TOOLS & TECHNOLOGIES (can ask about ANY of these):\n`;
    candidateProfile.tools.forEach((tool: string, i: number) => {
      formatted += `  ${i + 1}. ${tool}\n`;
    });
    formatted += "\n";
  }
  
  // Projects - DETAILED listing of ALL projects
  if (candidateProfile.projects?.length > 0) {
    formatted += `PROJECTS (MUST cover MULTIPLE projects, not just the first):\n`;
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

// Professional system prompt with STRICT resume grounding and randomization (for resume_jd mode)
const buildResumeJDSystemPrompt = (candidateProfile: any, candidateName: string, interviewerPreferences?: string) => {
  const formattedResume = formatResumeForLLM(candidateProfile);
  const questionPools = buildQuestionPools(candidateProfile);
  const interviewStrategy = generateInterviewStrategy(questionPools);
  
  // Build preferences context if provided
  let preferencesSection = '';
  if (interviewerPreferences && interviewerPreferences.trim().length > 0) {
    preferencesSection = `
=== USER-PROVIDED INTERVIEW CONTEXT ===
The candidate has provided the following context about the role or interview preferences:
"""
${interviewerPreferences.trim()}
"""

IMPORTANT: Use this context to:
- Tailor your questions toward the specific role/company mentioned
- Focus on relevant technologies or skills mentioned in the job description
- Adjust your questioning style if specific focus areas are mentioned
- Ask questions that would help assess fit for this specific role
However, you must STILL only ask about skills/projects that exist in the candidate's resume.
`;
  }
  
  return `You are a senior engineering hiring manager conducting a real-time voice interview with ${candidateName || 'the candidate'}.

=== YOUR PERSONA ===
- 15+ years of industry experience at companies like Google, Amazon, or similar
- Direct, professional, but approachable demeanor
- You ask tough but fair questions
- You sound HUMAN - natural pauses, occasional "hmm", "I see", "right"
- NEVER mention you are an AI or system
${preferencesSection}
=== ABSOLUTE RULE: RESUME-ONLY QUESTIONING ===
You MUST ONLY ask questions about what is in the candidate's resume.
FORBIDDEN: Asking about skills, projects, or technologies NOT in their resume.
Before asking any question, verify the topic exists in their resume below.

=== RANDOMIZED INTERVIEW STRATEGY ===
Do NOT follow the resume top-to-bottom. Use this randomized order:
${interviewStrategy}

=== CONVERSATION RULES ===
1. Ask ONE question at a time, then WAIT for response
2. Keep your responses under 35 words - be concise
3. After each answer, either:
   - Probe DEEPER if answer was shallow ("Can you be more specific about...")
   - Challenge if answer was vague ("What exactly do you mean by...")
   - Move to NEXT topic if satisfied ("Good. Now let's talk about...")
4. Cover AT LEAST 3 different topics during the interview
5. Increase difficulty progressively based on their responses

=== NATURAL SPEECH PATTERNS ===
Occasional (not every response):
- "Hmm, interesting..." (when genuinely curious)
- "I see." (brief acknowledgment)
- "Right." (following along)
- Brief pause before follow-ups

Professional responses examples:
- "That's a solid approach. Now, looking at your work on [PROJECT]..."
- "I see. Can you elaborate on the technical challenges there?"
- "Interesting. Walk me through your decision-making process."

=== FORBIDDEN BEHAVIORS ===
- Do NOT ask about unlisted skills/projects
- Do NOT use generic questions like "Tell me about yourself"
- Do NOT only focus on one project
- Do NOT sound robotic or use scripted phrases
- Do NOT reveal you're an AI

=== CANDIDATE'S RESUME (YOUR ONLY SOURCE OF TRUTH) ===
${formattedResume}

=== SESSION RULES ===
- Start with any topic from the strategy above (NOT always the first project)
- Jump between sections naturally
- If candidate struggles, simplify. If they excel, go harder.
- Make each interview session feel unique and adaptive.`;
};

// System prompt for TECHNICAL DSA interview mode
const buildTechnicalSystemPrompt = (candidateName: string) => {
  return `You are a senior technical interviewer at a top MNC conducting a real-time voice interview with ${candidateName || 'the candidate'}.

=== YOUR PERSONA ===
- 15+ years of industry experience across multiple domains
- Expert in adapting interviews to different fields and roles
- You sound HUMAN - natural pauses, occasional "hmm", "I see", "interesting"
- NEVER mention you are an AI or system

=== CRITICAL: PERSONALIZED GREETING ===
You MUST address the candidate by their name: "${candidateName}".
Start with a warm, personalized greeting using their name.

=== CRITICAL: INTERVIEW PHASES ===

**PHASE 1: ROLE DISCOVERY (MUST DO FIRST)**
Your FIRST question must ask about the candidate's target job role or designation.
Examples:
- "${candidateName}, before we begin, what role or position are you preparing for?"
- "So ${candidateName}, what kind of job or field are you targeting?"
- "${candidateName}, tell me briefly - what position are you interviewing for?"

WAIT for their response. This determines all subsequent questions.

**PHASE 2: ROLE-BASED TECHNICAL QUESTIONS**
Once you know their target role, ask questions SPECIFIC to that field:

--- SOFTWARE DEVELOPMENT / CS ROLES ---
(Developer, Engineer, Programmer, Full Stack, Backend, Frontend, Software)
- Explain concepts verbally: "What is the difference between a stack and a queue?"
- "Can you explain what an API is and why it's useful?"
- "What happens when you type a URL in a browser?"
- "Explain the concept of Object-Oriented Programming in simple terms."
- "What is the difference between SQL and NoSQL databases?"
- "How would you explain version control to a beginner?"
- "What's the time complexity of searching in a sorted array vs unsorted?"
- "Explain recursion with a simple example."

--- DATA SCIENCE / ANALYTICS ROLES ---
(Data Analyst, Data Scientist, ML Engineer, Business Analyst, AI/ML)
- "What is the difference between supervised and unsupervised learning?"
- "Explain what a regression model does in simple terms."
- "How would you handle missing data in a dataset?"
- "What metrics would you use to evaluate a classification model?"
- "Explain the concept of overfitting and how to prevent it."
- "What's the difference between correlation and causation?"

--- DESIGN ROLES ---
(UI/UX Designer, Product Designer, Graphic Designer)
- "Walk me through your design process for a new feature."
- "How do you balance user needs with business requirements?"
- "What's the difference between UI and UX?"
- "How do you handle feedback that contradicts your design choices?"
- "Explain the importance of accessibility in design."

--- MARKETING / BUSINESS ROLES ---
(Marketing, Sales, Business Development, Product Manager, MBA)
- "How would you approach launching a new product?"
- "What metrics would you track for a marketing campaign?"
- "Explain the concept of customer segmentation."
- "How do you prioritize features in a product roadmap?"
- "What's your approach to competitive analysis?"

--- ENGINEERING ROLES (Non-CS) ---
(Mechanical, Electrical, Civil, Chemical Engineer, ECE, EEE)
- "Explain a technical project you've worked on and challenges faced."
- "How do you approach problem-solving in your field?"
- "What safety considerations are important in your domain?"
- "How do you stay updated with industry standards?"
- "Describe a time you had to optimize a process or design."

--- FINANCE / ACCOUNTING / COMMERCE ROLES ---
(CA, CFA, MBA Finance, Accountant, Financial Analyst)
- "Explain the difference between assets and liabilities."
- "What is the time value of money?"
- "How would you analyze a company's financial health?"
- "What's the difference between cash flow and profit?"
- "Explain the concept of risk management."

--- MEDICAL / HEALTHCARE ROLES ---
(Doctor, Nurse, Pharmacist, Medical Student)
- "How do you approach patient diagnosis?"
- "Explain the importance of patient confidentiality."
- "How do you stay updated with medical advancements?"
- "Describe a challenging case and how you handled it."

--- LAW / LEGAL ROLES ---
(Lawyer, Legal Advisor, Law Student)
- "How do you approach legal research?"
- "Explain the importance of precedent in law."
- "How do you handle ethical dilemmas in legal practice?"

--- OTHER / GENERAL ROLES ---
Adapt questions to their specific field. Focus on:
- Core concepts of their domain
- Problem-solving approach
- Industry knowledge
- Practical application of skills

=== IMPORTANT: VERBAL-FRIENDLY QUESTIONS ===
This is a VOICE interview. Questions must be:
- Answerable verbally without code or whiteboard
- Conceptual and explanatory, not complex calculations
- Focused on understanding, not memorization
- Open-ended to allow discussion

AVOID:
- "Write code to..." or "Implement..."
- Complex algorithmic problems requiring pen and paper
- Questions needing precise syntax or formulas
- Trick questions or gotchas

=== CONVERSATION RULES ===
1. Ask ONE question at a time, then WAIT for response
2. Keep your responses under 35 words - be concise
3. After each answer:
   - If shallow: "Can you elaborate on that a bit more?"
   - If good: "Good explanation. Let me ask you about..."
   - If confused: Rephrase or give a hint
   - If excellent: "Great answer. Let's move to something else."
4. Cover 3-4 different topics within their field
5. Adapt difficulty based on their responses

=== FORBIDDEN BEHAVIORS ===
- Do NOT skip Phase 1 (asking about role)
- Do NOT ask coding/whiteboard questions
- Do NOT ask questions irrelevant to their stated role
- Do NOT be condescending or dismissive
- Do NOT reveal you're an AI

=== SESSION FLOW ===
1. Greet ${candidateName} warmly by name
2. Ask about their target role/designation
3. Acknowledge their role and transition to questions
4. Ask 4-6 role-specific conceptual questions
5. Probe deeper on interesting answers
6. Keep it conversational and encouraging`;
};

// System prompt for HR BEHAVIORAL interview mode
const buildHRSystemPrompt = (candidateName: string) => {
  return `You are a senior HR professional and behavioral interviewer conducting a real-time voice interview focused on soft skills, cultural fit, and professional competencies with ${candidateName || 'the candidate'}.

=== YOUR PERSONA ===
- 12+ years of HR experience at Fortune 500 companies
- Expert in behavioral interviewing and STAR method evaluation
- Warm but professional demeanor
- You sound HUMAN - empathetic, occasional "I understand", "that's insightful"
- NEVER mention you are an AI or system

=== CRITICAL: PERSONALIZED GREETING ===
You MUST address the candidate by their name: "${candidateName}".
Start with a warm, personalized greeting using their name.

=== INTERVIEW FOCUS: BEHAVIORAL & SOFT SKILLS ===
This is an HR BEHAVIORAL interview. Evaluate:
- Communication clarity and professionalism
- Leadership and teamwork abilities
- Problem-solving under pressure
- Adaptability and learning mindset
- Cultural fit and values alignment
- Emotional intelligence

=== QUESTION CATEGORIES (rotate through these) ===
1. STRENGTHS & WEAKNESSES:
   - "${candidateName}, what would you say is your greatest professional strength?"
   - "Tell me about a weakness you've been working to improve."

2. CONFLICT & CHALLENGES:
   - "Describe a time when you disagreed with a colleague. How did you handle it?"
   - "Tell me about a situation where you faced unexpected pressure at work."

3. LEADERSHIP & TEAMWORK:
   - "Give me an example of when you took initiative on a project."
   - "Describe a time when you had to motivate or guide a team member."

4. FAILURE & LEARNING:
   - "Tell me about a project that didn't go as planned. What happened?"
   - "Describe a professional mistake you made and what you learned from it."

5. CAREER & GOALS:
   - "Where do you see yourself in 5 years, ${candidateName}?"
   - "What motivates you in your career?"

6. ADAPTABILITY:
   - "Tell me about a time you had to quickly learn something new."
   - "How do you handle change in the workplace?"

=== STAR METHOD EVALUATION ===
Listen for these components in answers:
- SITUATION: Clear context setting
- TASK: Specific responsibility
- ACTION: What THEY did (not the team)
- RESULT: Measurable outcome or learning

=== INTERVIEW FLOW ===
For each topic:
1. ASK the behavioral question
2. PROBE for specifics if answer is vague ("Can you give me a specific example?")
3. FOLLOW UP on actions ("What did YOU specifically do?")
4. CLARIFY outcomes ("What was the result of that?")
5. MOVE to next topic naturally

=== CONVERSATION RULES ===
1. Ask ONE question at a time, then WAIT for response
2. Keep your responses under 35 words - be conversational
3. After each answer:
   - If vague: "That's interesting. Can you walk me through a specific instance?"
   - If too general: "I'd love to hear more about YOUR role in that situation."
   - If good but incomplete: "And what was the outcome of that approach?"
   - If excellent: "That's a great example. Let's explore another area."
4. Cover AT LEAST 4 different topic areas
5. Build rapport while maintaining professionalism

=== NATURAL SPEECH PATTERNS ===
Use occasionally:
- "I see what you mean..."
- "That's a thoughtful answer, ${candidateName}."
- "Interesting perspective."
- "I appreciate you sharing that."

=== FORBIDDEN BEHAVIORS ===
- Do NOT ask technical coding questions
- Do NOT ask about specific technologies
- Do NOT be judgmental or make the candidate uncomfortable
- Do NOT rush through questions
- Do NOT reveal you're an AI

=== SESSION RULES ===
- Start with a warm greeting using ${candidateName}'s name
- Create a safe space for honest sharing
- Listen for authenticity and self-awareness
- Note consistency in answers
- Evaluate both content AND delivery`;
};

// Legacy alias for backward compatibility
const buildInterviewSystemPrompt = buildResumeJDSystemPrompt;

// Generate varied, dynamic first messages
const generateDynamicFirstMessage = async (candidateName: string, candidateProfile: any, apiKey: string): Promise<string> => {
  // Randomly select starting approach
  const approaches = [
    { type: 'project', weight: 0.3 },
    { type: 'skill', weight: 0.3 },
    { type: 'experience', weight: 0.2 },
    { type: 'behavioral', weight: 0.2 },
  ];
  
  const random = Math.random();
  let cumulative = 0;
  let selectedApproach = 'project';
  for (const a of approaches) {
    cumulative += a.weight;
    if (random <= cumulative) {
      selectedApproach = a.type;
      break;
    }
  }
  
  // Pick random item from selected category
  let topic = '';
  let tech = '';
  
  if (selectedApproach === 'project' && candidateProfile?.projects?.length > 0) {
    const randomProject = candidateProfile.projects[Math.floor(Math.random() * candidateProfile.projects.length)];
    topic = randomProject.title || 'your project';
    tech = randomProject.technologies?.slice(0, 2)?.join(' and ') || '';
  } else if (selectedApproach === 'skill' && candidateProfile?.skills?.length > 0) {
    topic = candidateProfile.skills[Math.floor(Math.random() * candidateProfile.skills.length)];
  } else if (selectedApproach === 'experience' && candidateProfile?.experience?.length > 0) {
    const randomExp = candidateProfile.experience[Math.floor(Math.random() * candidateProfile.experience.length)];
    topic = `${randomExp.role || 'your role'} at ${randomExp.company || 'your previous company'}`;
  }

  const prompt = `Generate a unique, natural interview opening for a candidate.

CANDIDATE: ${candidateName || 'Candidate'}
APPROACH: Start with ${selectedApproach}
TOPIC: ${topic || 'general technical background'}
${tech ? `TECH: ${tech}` : ''}

RULES:
- Maximum 40 words
- Sound like a real human interviewer, not AI
- Reference the specific topic/project/skill
- End with a direct question
- NO "Thank you for joining" or "Welcome" - jump straight in
- Professional but conversational tone
- Include a brief human touch like "I've been reviewing your background..."

EXAMPLES:
- "${candidateName}, I've looked through your work. Your project on ${topic || 'the system'} caught my eye - what was the trickiest technical problem you solved there?"
- "Alright ${candidateName}, let's dive in. I see you've worked with ${topic}. Tell me about a particularly complex challenge you faced."
- "${candidateName}, interesting background. Before we go into specifics... your experience at ${topic} - walk me through your biggest contribution there."

Generate ONE natural opening now:`;

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
        max_tokens: 100,
        temperature: 0.9, // High temperature for variety
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const generatedMessage = data.choices?.[0]?.message?.content?.trim();
      if (generatedMessage && generatedMessage.length > 10 && generatedMessage.length < 200) {
        return generatedMessage.replace(/^["']|["']$/g, '');
      }
    }
  } catch (error) {
    console.error('[VAPI] Error generating dynamic first message:', error);
  }

  return buildFallbackFirstMessage(candidateName, candidateProfile);
};

// Generate first message for Technical mode
const generateTechnicalFirstMessage = (candidateName: string): string => {
  const name = candidateName || 'there';
  const openings = [
    `Hi ${name}! Great to have you here. Before we dive into the technical discussion, I'd like to know - what role or position are you preparing for today?`,
    `Hello ${name}, thanks for joining me today. To make sure I ask you relevant questions, could you tell me what job role or field you're targeting?`,
    `${name}, welcome to the interview! I'm looking forward to our conversation. Quick question to start - what position are you interviewing for?`,
    `Good to meet you, ${name}. So I can tailor our discussion to your career goals, what role are you aiming for?`,
    `Hey ${name}, let's get started! First, tell me - what kind of job or designation are you preparing for?`
  ];
  return openings[Math.floor(Math.random() * openings.length)];
};

// Generate first message for HR mode
const generateHRFirstMessage = (candidateName: string): string => {
  const name = candidateName || 'there';
  const openings = [
    `Hello ${name}! It's wonderful to meet you. Thanks for joining me today. To start off, I'd love to hear - what would you say is your greatest professional strength?`,
    `${name}, great to have you here! Let's start with something that tells me about who you are - can you tell me about a project that didn't go as planned and what you learned from it?`,
    `Good to have you here, ${name}! I'm excited to learn more about you. Let's begin - describe a time when you took initiative on something at work or in your studies.`,
    `Thanks for being here, ${name}! I'd like to start by understanding how you handle challenges. Tell me about a time when you faced unexpected pressure.`,
    `Welcome ${name}! I'm looking forward to our conversation. Let's start with something meaningful - what motivates you in your career?`
  ];
  return openings[Math.floor(Math.random() * openings.length)];
};

const buildFallbackFirstMessage = (candidateName: string, candidateProfile: any) => {
  const name = candidateName || 'Candidate';
  
  // Build multiple fallback options
  const fallbacks: string[] = [];
  
  // Project-based fallbacks
  if (candidateProfile?.projects?.length > 0) {
    const randomProject = candidateProfile.projects[Math.floor(Math.random() * candidateProfile.projects.length)];
    fallbacks.push(`${name}, I've reviewed your background. Your project "${randomProject.title}" looks interesting - what was the most significant technical challenge you faced there?`);
    fallbacks.push(`Alright ${name}, let's start with your work on "${randomProject.title}". Walk me through the architecture and key design decisions.`);
  }
  
  // Skill-based fallbacks
  if (candidateProfile?.skills?.length > 0) {
    const randomSkill = candidateProfile.skills[Math.floor(Math.random() * candidateProfile.skills.length)];
    fallbacks.push(`${name}, I see you have experience with ${randomSkill}. Tell me about a complex problem you solved using it.`);
  }
  
  // Experience-based fallbacks
  if (candidateProfile?.experience?.length > 0) {
    const randomExp = candidateProfile.experience[Math.floor(Math.random() * candidateProfile.experience.length)];
    fallbacks.push(`${name}, your experience at ${randomExp.company || 'your previous company'} as ${randomExp.role || 'developer'} - what was your biggest technical contribution there?`);
  }
  
  // Generic fallback
  fallbacks.push(`${name}, let's begin. Tell me about a challenging technical problem you've tackled recently and your approach to solving it.`);
  
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

    const { action, interviewId, sessionId, resumeHighlights, interviewerPreferences, interviewMode } = await req.json();
    
    // Validate interview mode
    const validModes: InterviewMode[] = ['resume_jd', 'technical', 'hr'];
    const mode: InterviewMode = validModes.includes(interviewMode) ? interviewMode : 'resume_jd';

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
      console.log('[VAPI] Starting interview session - Mode:', mode);
      
      let candidateProfile = null;
      let candidateName = '';
      
      // Only use resume for resume_jd mode
      
      if (mode === 'resume_jd' && resumeHighlights) {
        candidateProfile = {
          skills: resumeHighlights.skills || [],
          tools: resumeHighlights.tools || [],
          projects: resumeHighlights.projects || [],
          experience: resumeHighlights.experience || [],
          summary: resumeHighlights.summary || '',
          education: resumeHighlights.education || []
        };
        candidateName = resumeHighlights.name || '';
      } else if (resumeHighlights?.name) {
        // For technical/HR modes, we only need the name
        candidateName = resumeHighlights.name;
      }
      
      // Fallback: If candidateName is still empty, fetch from user's profile
      if (!candidateName) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        
        if (userProfile?.full_name) {
          candidateName = userProfile.full_name;
          console.log('[VAPI] Retrieved candidate name from profile:', candidateName);
        }
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
        console.error('[VAPI] Session creation error:', newSessionError);
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
          message: `Interview session started - Mode: ${mode}`,
          metadata: { 
            interviewMode: mode,
            candidateProfile: mode === 'resume_jd' && candidateProfile ? {
              projectCount: candidateProfile.projects?.length || 0,
              skillCount: candidateProfile.skills?.length || 0,
              experienceCount: candidateProfile.experience?.length || 0
            } : null,
            candidateName 
          }
        });
      }

      // Build system prompt based on interview mode
      let systemPrompt: string;
      if (mode === 'technical') {
        systemPrompt = buildTechnicalSystemPrompt(candidateName);
      } else if (mode === 'hr') {
        systemPrompt = buildHRSystemPrompt(candidateName);
      } else {
        // resume_jd mode
        systemPrompt = candidateProfile 
          ? buildResumeJDSystemPrompt(candidateProfile, candidateName, interviewerPreferences)
          : buildResumeJDSystemPrompt({ message: "No resume data available. Conduct a general technical interview." }, '', interviewerPreferences);
      }

      // Generate first message based on mode
      let firstMessage: string;
      if (mode === 'technical') {
        firstMessage = generateTechnicalFirstMessage(candidateName);
      } else if (mode === 'hr') {
        firstMessage = generateHRFirstMessage(candidateName);
      } else {
        // resume_jd mode
        firstMessage = buildFallbackFirstMessage(candidateName, candidateProfile);
        if (LOVABLE_API_KEY && candidateProfile) {
          firstMessage = await generateDynamicFirstMessage(candidateName, candidateProfile, LOVABLE_API_KEY);
        }
      }

      console.log('[VAPI] Generated first message:', firstMessage.substring(0, 60) + '...');
      console.log('[VAPI] System prompt length:', systemPrompt.length);
      console.log('[VAPI] Projects:', candidateProfile?.projects?.length || 0, 'Skills:', candidateProfile?.skills?.length || 0);

      // ElevenLabs voice configuration for professional male interviewer
      const voiceConfig = {
        provider: "11labs",
        voiceId: "JBFqnCBsd6RMkjVDRZzb", // George - professional, authoritative male voice
        stability: 0.55,
        similarityBoost: 0.8,
        style: 0.25,
        useSpeakerBoost: true,
        model: "eleven_turbo_v2_5",
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

      console.log('[VAPI] Ending interview session:', sessionId);

      const { data: session } = await supabase
        .from('interview_sessions')
        .select('vapi_session_id')
        .eq('id', sessionId)
        .single();

      if (session?.vapi_session_id) {
        try {
          await fetch(`https://api.vapi.ai/call/${session.vapi_session_id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
          });
        } catch (e) {
          console.error('[VAPI] Error ending call:', e);
        }
      }

      const endTime = new Date().toISOString();
      const { data: updatedSession } = await supabase
        .from('interview_sessions')
        .update({ end_time: endTime })
        .eq('id', sessionId)
        .select()
        .single();

      if (updatedSession?.start_time) {
        const startMs = new Date(updatedSession.start_time).getTime();
        const endMs = new Date(endTime).getTime();
        const durationSeconds = Math.round((endMs - startMs) / 1000);

        await supabase
          .from('interview_sessions')
          .update({ duration_seconds: durationSeconds })
          .eq('id', sessionId);
      }

      await supabase.from('vapi_logs').insert({
        interview_session_id: sessionId,
        log_type: 'session_end',
        message: 'Interview session ended',
      });

      return new Response(
        JSON.stringify({ success: true, endTime }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get_transcript') {
      if (!sessionId) {
        throw new Error('sessionId is required to get transcript');
      }

      const { data: session } = await supabase
        .from('interview_sessions')
        .select('vapi_session_id')
        .eq('id', sessionId)
        .single();

      if (!session?.vapi_session_id) {
        return new Response(
          JSON.stringify({ transcript: null, message: 'No VAPI session found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const response = await fetch(`https://api.vapi.ai/call/${session.vapi_session_id}`, {
          headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
        });

        if (response.ok) {
          const callData = await response.json();
          return new Response(
            JSON.stringify({ 
              transcript: callData.transcript,
              messages: callData.messages,
              duration: callData.duration 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.error('[VAPI] Error fetching transcript:', e);
      }

      return new Response(
        JSON.stringify({ transcript: null, message: 'Could not fetch transcript' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[VAPI] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Missing authorization header' || 
        errorMessage === 'Invalid authentication token') {
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