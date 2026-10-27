import type { VercelRequest,VercelResponse } from '@vercel/node';
import { backendHealth } from '../server/backendHealth.js';
export default async function handler(req:VercelRequest,res:VercelResponse){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const health=await backendHealth({url:process.env.VITE_SUPABASE_URL,anonKey:process.env.VITE_SUPABASE_ANON_KEY,modelKey:process.env.GROQ_API_KEY});
  return res.status(health.status==='ready'?200:503).json(health);
}
