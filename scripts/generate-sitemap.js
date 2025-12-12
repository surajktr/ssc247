import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
const BASE_URL = 'https://ssc247.in';
// Using the same credentials as lib/supabase.ts
const SUPABASE_URL = 'https://cdwikwwpakmlauiddasz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkd2lrd3dwYWttbGF1aWRkYXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjkzNTcsImV4cCI6MjA3NzE0NTM1N30.02KB2EawFjfiUM0i22-v9TfxEkNqEc4YcXqR9C8xRHg';

// --- Helpers ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Duplicate of the logic in App.tsx to ensure URLs match exactly
const parseQuestions = (q) => {
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

const generateSlug = (entry) => {
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

// --- Main Generator ---
async function generateSitemap() {
  console.log('Fetching data from Supabase...');
  
  const { data: posts, error } = await supabase
    .from('current_affairs')
    .select('id, upload_date, questions')
    .order('upload_date', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    process.exit(1);
  }

  console.log(`Found ${posts.length} posts. Generating XML...`);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  posts.forEach(post => {
      try {
        const { slug, id } = generateSlug(post);
        // Construct the query parameter based URL
        // Note: & needs to be escaped as &amp; in XML
        const url = `${BASE_URL}/?post=${slug}&amp;id=${id}`;
        
        // Ensure valid date for lastmod
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
        console.warn(`Skipping post ${post.id} due to error`, e);
      }
  });

  xml += `\n</urlset>`;

  const outputPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(outputPath, xml);
  
  console.log(`Sitemap generated successfully at: ${outputPath}`);
}

generateSitemap();