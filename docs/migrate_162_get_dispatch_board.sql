-- migrate_162_get_dispatch_board.sql
-- شاشة التوزيع كانت بتعمل ~12 رحلة شبكة منفصلة كل دورة (كل ~265م.ث للسيرفر في أيرلندا)
-- فالبطء كان زمن شبكة × عدد النداءات، مش القاعدة (استعلاماتها 2-13م.ث).
-- الحل: كل بيانات اللوحة في نداء واحد (jsonb، مش متأثر بسقف 1000):
--   طيارين(بلا avatar) + رحلات نشطة + روابط + طلبات(نشطة+مرتبطة مدموجة) + مناطق +
--   إعدادات الفرع + حضور(آخر 36 ساعة + آخر حالة لكل طيار) + att_drivers + عدد الرحلات.
-- hard_load مش مضمّنة (الشاشة بتكاشها ساعة؛ تضمينها كان بيضاعف حمل القاعدة كل 30ث).
-- الأفاتار بيتجاب مرة واحدة في الشاشة (نادرًا بيتغيّر) بدل كل دورة.
-- النتيجة: نداء واحد ~60م.ث سيرفر + ~219 ك.ب بدل ~12 رحلة؛ ~8× أسرع على النت الضعيف.
-- ⚠️ SECURITY DEFINER + منح authenticated فقط (مش anon — متماشي مع قفل anon).
-- يُطبَّق على القاعدتين: السحابة (اتعملت) + السيرفر الذاتي.

create or replace function public.get_dispatch_board(p_branch uuid default null)
returns jsonb language sql stable security definer set search_path = public
as $func$
  with active_trips as (
    select * from trips where status in ('active','pending_complete')
      and (p_branch is null or branch_id = p_branch)),
  tord as (select trip_id, order_id from trip_orders where trip_id in (select id from active_trips)),
  board_orders as (
    select o.* from orders o
    where (p_branch is null or o.branch_id = p_branch)
      and ( o.status in ('pending','postponed','assigned','picked') or o.id in (select order_id from tord) )),
  att as (
    select * from driver_attendance where created_at > now() - interval '36 hours'
    union
    select distinct on (driver_id) * from driver_attendance order by driver_id, created_at desc)
  select jsonb_build_object(
    'drivers', coalesce((select jsonb_agg((to_jsonb(d) - 'avatar')) from (
        select dr.*, jsonb_build_object('name', b.name) as branches
        from drivers dr left join branches b on b.id = dr.branch_id
        where dr.is_active = true and (p_branch is null or dr.branch_id = p_branch)
        order by dr.full_name) d), '[]'::jsonb),
    'trips', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from active_trips t), '[]'::jsonb),
    'trip_orders', coalesce((select jsonb_agg(jsonb_build_object('trip_id',trip_id,'order_id',order_id)) from tord), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg((to_jsonb(o) - 'source_data' - 'items' - 'route_polyline') order by o.created_at desc) from board_orders o), '[]'::jsonb),
    'regions', coalesce((select jsonb_agg(jsonb_build_object(
        'name',name,'branch_id',branch_id,'min_order_amount',min_order_amount,
        'delivery_fee',delivery_fee,'below_min_fee',below_min_fee)) from regions where is_active = true), '[]'::jsonb),
    'settings', (select to_jsonb(ds) from dispatch_settings ds where p_branch is not null and ds.branch_id = p_branch limit 1),
    'attendance', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from att a), '[]'::jsonb),
    'att_drivers', coalesce((select jsonb_object_agg(dr.id::text, jsonb_build_object('full_name',dr.full_name,'branch_id',dr.branch_id))
        from drivers dr where dr.id in (select distinct driver_id from att where driver_id is not null)), '{}'::jsonb),
    'trip_counts', coalesce((select jsonb_agg(to_jsonb(c)) from get_trip_counts(p_branch) c), '[]'::jsonb)
  );
$func$;

revoke all on function public.get_dispatch_board(uuid) from public, anon;
grant execute on function public.get_dispatch_board(uuid) to authenticated;
