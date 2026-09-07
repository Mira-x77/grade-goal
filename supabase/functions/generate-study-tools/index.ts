import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { subject, classLevel } = await req.json();
    if (!subject || !classLevel) {
      return new Response(JSON.stringify({ error: "subject and classLevel are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Check cache first
    const { data: cached } = await supabase
      .from("study_tool_cache")
      .select("content, generated_at")
      .eq("subject", subject)
      .eq("class_level", classLevel)
      .single();

    // Return cache if less than 30 days old
    if (cached) {
      const age = Date.now() - new Date(cached.generated_at).getTime();
      if (age < 30 * 24 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ content: cached.content, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Fetch paper metadata for context
    const { data: papers } = await supabase
      .from("exam_papers")
      .select("title, year, exam_type, session")
      .eq("subject", subject)
      .eq("class_level", classLevel)
      .order("year", { ascending: false })
      .limit(20);

    const paperContext = papers && papers.length > 0
      ? `Available past papers: ${papers.map(p => `${p.exam_type} ${p.year}${p.session ? ` (${p.session})` : ""}`).join(", ")}.`
      : `No papers on file yet, but generate based on the standard ${classLevel} ${subject} curriculum.`;

    // 3. Call Gemini
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are an expert in the Cameroonian educational system (GCE and BAC/Baccalauréat).
Generate study intelligence for: Subject = "${subject}", Class Level = "${classLevel}".
${paperContext}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "topQuestions": [
    { "question": "...", "frequency": "Appears in ~X of past papers" }
  ],
  "keyTopics": [
    { "topic": "...", "weight": "High/Medium/Low", "hint": "..." }
  ],
  "cheatSheet": [
    { "item": "...", "detail": "..." }
  ],
  "stepBySolutions": [
    { "question": "...", "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."] }
  ],
  "practiceTests": [
    { "question": "...", "type": "MCQ/Essay/Problem", "marks": 5 }
  ],
  "weakSpots": [
    { "area": "...", "why": "...", "tip": "..." }
  ]
}

Rules:
- topQuestions: 10 items — real recurring question patterns from this subject's past exams
- keyTopics: 8 items — ranked by exam frequency
- cheatSheet: 10 items — key formulas, definitions, rules that appear most
- stepBySolutions: 5 items — worked examples with clear steps
- practiceTests: 8 items — exam-style questions
- weakSpots: 6 items — common student failure areas with study tips
- All content must be specific to ${subject} at ${classLevel} level in the Cameroonian curriculum
- Use the language appropriate for the subject (French for French-medium subjects, English for English-medium)`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return new Response(JSON.stringify({ error: `Gemini error: ${err}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const content = JSON.parse(jsonText);

    // 4. Upsert into cache
    await supabase.from("study_tool_cache").upsert({
      subject,
      class_level: classLevel,
      content,
      generated_at: new Date().toISOString(),
    }, { onConflict: "subject,class_level" });

    return new Response(JSON.stringify({ content, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
