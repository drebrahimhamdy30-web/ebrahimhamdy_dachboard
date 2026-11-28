// hr_receipts_sign — روابط مؤقتة (10 دقايق) لصور إيصالات الفيزا عشان نظام HR ينقلها (migrate_236)
// ─────────────────────────────────────────────────────────────────────────────
// قرار المالك 2026-11-28: إغلاق الشيفت اتنقل لـHR بالصور. المخزن receipts خاص، ومفتاح الخدمة مايتحطش على سيرفر HR،
// فالدالة دي بتاخد مفتاح التصدير نفسه (hr_export_key في الخزنة) وبتتحقق منه بنداء hr_export، وبعدين بتوقّع
// المسارات المطلوبة بس من المخزن receipts (بحد 100 في النداء). مابتكتبش ولا بتمسح أي حاجة.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let body: { key?: unknown; paths?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const key = typeof body.key === 'string' ? body.key : '';
  const paths = (Array.isArray(body.paths) ? body.paths : [])
    .filter((p): p is string => typeof p === 'string' && /^card\/[a-z]+\/[\w.-]+$/.test(p))
    .slice(0, 100);
  if (!key || !paths.length) return json({ error: 'key and paths required' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  // التحقق من المفتاح بنفس دالة التصدير (بترفض بـ42501 لو المفتاح غلط)
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!);
  const check = await anon.rpc('hr_export', { p_key: key, p_what: 'stores', p_after: 0, p_limit: 1 });
  if (check.error) return json({ error: 'forbidden' }, 403);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.storage.from('receipts').createSignedUrls(paths, 600);
  if (error) return json({ error: error.message }, 500);
  return json({ urls: (data ?? []).map((d) => ({ path: d.path, url: d.signedUrl, error: d.error })) });
});
