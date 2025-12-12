import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuration
const BASE_URL = 'https://ssc247.in';
const SUPABASE_URL = 'https://cdwikwwpakmlauiddasz.supabase.co';
// Using the anon key is usually sufficient for reading public data.
// In production, use Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') if RLS is restrictive.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkd2lrd3dwYWttbGF1aWRkYXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjkzNTcsImV4cCI6MjA3NzE0NTM1N30.02KB2EawFjfiUM0i22-v9TfxEkNqEc4YcXqR9C8xRHg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: Parse questions to extract title for slug (Matches App.tsx logic)
const parseQuestions = (q: any) => {
  if (!q) return { title: '', description: '', questions: [] };
  
  let parsed = q;
  if (typeof q === 'string') {
      try { 
          parsed = JSON.parse(q); 
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      } catch(e) { 
          return { title: '', description: '', questions: [] }; 
      }
  }
  
  if (Array.isArray(parsed)) return { questions: parsed };
  if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.questions)) return parsed;
      return { ...parsed, questions: [] };
  }

  return { title: '', description: '', questions: [] };
};

// Helper: Generate Slug (Matches App.tsx logic)
const generateSlug = (entry: any) => {
    const qData = parseQuestions(entry.questions);
    let firstQuestion = "daily-current-affairs";
    
    if (qData && qData.questions && Array.isArray(qData.questions) && qData.questions.length > 0) {
         const qText = qData.questions[0]?.question_en;
         if (qText) firstQuestion = String(qText);
    }
    
    const slug = firstQuestion
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .substring(0, 100);
    
    const dateStr = new Date(entry.upload_date).toISOString().split('T')[0];
    
    return { slug: `${slug}-${dateStr}`, id: entry.id };
};

serve(async (req) => {
  try {
    const { data: posts, error } = await supabase
      .from('current_affairs')
      .select('id, upload_date, questions')
      .order('upload_date', { ascending: false });

    if (error) throw error;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    posts?.forEach(post => {
        try {
          const { slug, id } = generateSlug(post);
          // XML requires escaping ampersands
          const url = `${BASE_URL}/?post=${slug}&amp;id=${id}`;
          
          let dateObj = new Date(post.upload_date);
          if (isNaN(dateObj.getTime())) dateObj = new Date();
          const lastMod = dateObj.toISOString().split('T')[0];

          xml += `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        } catch (e) {
          console.error("Skipping post due to formatting error", post.id);
        }
    });

    xml += `\n</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600", // Cache for 1 hour
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});