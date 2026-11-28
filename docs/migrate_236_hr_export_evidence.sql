-- migrate_236 — تصدير إثباتات معاملات الفيزا لنظام HR (قراية بس)
-- ─────────────────────────────────────────────────────────────────────────────
-- قرار المالك 2026-11-28: إغلاق الشيفت اتنقل لـHR و«كل حاجة تتنقل معانا» — صور الإيصالات ومراجعات المعاملات
-- (قيمة الإيصال المؤكدة + القناة) وتعديلات القنوات، لآخر 30 يوم، عشان الإلزام والمرحّل يكملوا من غير فجوة.
-- نفس دالة التصدير ومفتاحها الخاص (migrate_234/235). الصور نفسها بتتنزّل بروابط مؤقتة من الـEdge Function
-- hr_receipts_sign (بنفس المفتاح) — مفتاح الخدمة مابيتحطش على سيرفر HR.
-- الإضافة: p_what = 'receipts' (بالصفحات بالـid) | 'txn_reviews' | 'channel_overrides'. الباقي زي ما هو حرفيًا.

create or replace function public.hr_export(p_key text, p_what text, p_after bigint default 0, p_limit integer default 2000)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 2000), 5000));
  v_rows jsonb;
begin
  if not public.is_hr_export_key(p_key) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_what = 'stores' then
    select coalesce(jsonb_agg(to_jsonb(s) order by s.id), '[]') into v_rows
      from (select id, name, order_by, active, link_per_branch from stores) s;
  elsif p_what = 'mappings' then
    select coalesce(jsonb_agg(to_jsonb(m)), '[]') into v_rows
      from (select store, name_header, price_header, discount_header, updated_at from store_sheet_mappings) m;
  elsif p_what = 'items' then
    select coalesce(jsonb_agg(to_jsonb(i) order by i.id), '[]') into v_rows
      from (select id, item_name, store, code, discount_perc, price, notes, available, supplier_code, max_qty, updated_at
              from store_item_prices where id > coalesce(p_after, 0) order by id limit v_limit) i;
  elsif p_what = 'ibnsina_tax' then
    select coalesce(jsonb_agg(to_jsonb(t)), '[]') into v_rows
      from (select supplier_code, taxed, item_name, invoices_seen, updated_at from ibnsina_tax) t;
  elsif p_what = 'wallet_sms' then
    select coalesce(jsonb_agg(to_jsonb(w) order by w.id), '[]') into v_rows
      from (select id, branch, to_no, from_no, ammount, type, fees, balance, message, op_ref, "createdAt"
              from wallet_sms
             where id > coalesce(p_after, 0) and "createdAt" >= now() - interval '30 days'
             order by id limit v_limit) w;
  elsif p_what = 'paymob' then
    select coalesce(jsonb_agg(to_jsonb(w) order by w.id), '[]') into v_rows
      from (select id, terminal_id, machine_name, branch, order_id, type, ammount, fees, vat, netammount, "createdAt"
              from wallet
             where id > coalesce(p_after, 0) and "createdAt" >= now() - interval '30 days'
             order by id limit v_limit) w;
  elsif p_what = 'receipts' then
    select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]') into v_rows
      from (select id, kind, branch, ref_id, path, mime, bytes, uploaded_by, uploaded_at
              from txn_receipts
             where kind = 'card' and id > coalesce(p_after, 0) and uploaded_at >= now() - interval '30 days'
             order by id limit v_limit) r;
  elsif p_what = 'txn_reviews' then
    select coalesce(jsonb_agg(to_jsonb(r)), '[]') into v_rows
      from (select branch, fh_id, paid, channel, reviewed_by, reviewed_at
              from shift_txn_reviews where reviewed_at >= now() - interval '30 days') r;
  elsif p_what = 'channel_overrides' then
    select coalesce(jsonb_agg(to_jsonb(o)), '[]') into v_rows
      from (select branch, fh_id, channel, by_user, set_at
              from card_channel_overrides where set_at >= now() - interval '30 days') o;
  else
    raise exception 'unknown: %', p_what;
  end if;

  return jsonb_build_object('rows', v_rows, 'count', jsonb_array_length(v_rows));
end
$function$;
