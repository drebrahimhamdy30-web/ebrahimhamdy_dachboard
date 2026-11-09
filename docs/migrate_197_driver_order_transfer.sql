-- migrate_197_driver_order_transfer.sql
-- نقل طلب من طيار لطيار من تطبيق الطيار، بقبول + مهلة دقيقة + إعداد لكل فرع.
-- الطلب يفضل مع الناقل (مش بيتحرك) لحد ما المستلم يقبل؛ القبول بيستخدم نفس
-- منطق transfer_orders_to_driver (نقل الكاشير). مُطبّق على السحابة 2026-11-09.

alter table public.dispatch_settings add column if not exists driver_transfer_enabled boolean not null default false;

create table if not exists public.order_transfer_requests(
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  from_driver_id uuid not null references public.drivers(id),
  to_driver_id   uuid not null references public.drivers(id),
  branch_id     uuid,
  status        text not null default 'pending',   -- pending|accepted|rejected|expired|cancelled
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '1 minute',
  responded_at  timestamptz
);
create index if not exists otr_to_pending_idx on public.order_transfer_requests(to_driver_id) where status='pending';
create index if not exists otr_from_pending_idx on public.order_transfer_requests(from_driver_id) where status='pending';
create index if not exists otr_order_idx on public.order_transfer_requests(order_id);
create unique index if not exists otr_uniq_pending on public.order_transfer_requests(order_id) where status='pending';

alter table public.order_transfer_requests enable row level security;
grant select on public.order_transfer_requests to authenticated;
drop policy if exists otr_sel on public.order_transfer_requests;
create policy otr_sel on public.order_transfer_requests for select to authenticated using (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='order_transfer_requests') then
    alter publication supabase_realtime add table public.order_transfer_requests;
  end if;
end $$;

-- نقل طلب واحد (داخلى، بلا حارس دور) — نفس منطق transfer_orders_to_driver
create or replace function public._driver_move_order(p_order_id uuid, p_to_driver_id uuid, p_user_name text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_to public.drivers%rowtype; v_from_name text; v_from_id uuid;
  v_new_trip uuid; v_new_status text; v_old_trip uuid; v_now timestamptz:=now();
begin
  select * into v_to from public.drivers where id=p_to_driver_id and is_active;
  if not found then return jsonb_build_object('success',false,'error','الطيار المستلم غير متاح'); end if;
  perform 1 from public.orders where id=p_order_id and status not in ('delivered','completed');
  if not found then return jsonb_build_object('success',false,'error','الطلب اتسلّم خلاص'); end if;
  perform set_config('app.manual_assign','on',true);
  select id,status into v_new_trip,v_new_status from public.trips
   where driver_id=p_to_driver_id and status in ('active','pending_complete')
   order by (status='active') desc, created_at desc limit 1;
  if v_new_trip is null then
    insert into public.trips(driver_id,driver_name,branch_id,status,orders_count,total_amount,created_at)
    select p_to_driver_id,v_to.full_name,o.branch_id,'active',0,0,v_now from public.orders o where o.id=p_order_id
    returning id into v_new_trip;
    insert into public.trip_logs(trip_id,event,details,user_name)
    values(v_new_trip,'trip_created',jsonb_build_object('driver',v_to.full_name,'transfer',true),p_user_name);
  elsif v_new_status='pending_complete' then
    update public.trips set status='active',updated_at=v_now where id=v_new_trip;
  end if;
  select o.driver_id,o.deliveryman into v_from_id,v_from_name from public.orders o where o.id=p_order_id;
  select tr.trip_id into v_old_trip from public.trip_orders tr join public.trips t on t.id=tr.trip_id
   where tr.order_id=p_order_id and t.status in ('active','pending_complete') limit 1;
  delete from public.trip_orders where order_id=p_order_id and trip_id<>v_new_trip;
  if not exists(select 1 from public.trip_orders where trip_id=v_new_trip and order_id=p_order_id) then
    insert into public.trip_orders(trip_id,order_id) values(v_new_trip,p_order_id);
  end if;
  update public.orders set driver_id=p_to_driver_id, deliveryman=v_to.full_name,
    status=case when status in ('pending','postponed') then 'assigned' else status end,
    assigned_at=coalesce(assigned_at,v_now), updated_at=v_now where id=p_order_id;
  insert into public.order_logs(order_id,event,details,user_name)
  values(p_order_id,'order_transferred',
    jsonb_build_object('from',coalesce(v_from_name,'—'),'to',v_to.full_name,'reason','نقل من طيار لطيار','trip_id',v_new_trip),p_user_name);
  update public.trips set
    orders_count=(select count(*) from public.trip_orders where trip_id=v_new_trip),
    total_amount=(select coalesce(sum(o.total_bill_net),0) from public.trip_orders tr join public.orders o on o.id=tr.order_id where tr.trip_id=v_new_trip),
    updated_at=v_now where id=v_new_trip;
  if v_old_trip is not null then
    update public.trips set
      orders_count=(select count(*) from public.trip_orders where trip_id=v_old_trip),
      total_amount=(select coalesce(sum(o.total_bill_net),0) from public.trip_orders tr join public.orders o on o.id=tr.order_id where tr.trip_id=v_old_trip),
      updated_at=v_now where id=v_old_trip;
    update public.trips set status='completed',updated_at=v_now
     where id=v_old_trip and not exists(select 1 from public.trip_orders where trip_id=v_old_trip);
  end if;
  return jsonb_build_object('success',true,'trip_id',v_new_trip);
end $function$;

create or replace function public.driver_request_transfer(p_order_id uuid, p_from_driver_id uuid, p_to_driver_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_o public.orders%rowtype; v_enabled boolean; v_to public.drivers%rowtype; v_id uuid;
begin
  if p_from_driver_id=p_to_driver_id then return jsonb_build_object('success',false,'error','لا يمكن النقل لنفسك'); end if;
  select * into v_o from public.orders where id=p_order_id;
  if not found then return jsonb_build_object('success',false,'error','الطلب غير موجود'); end if;
  if v_o.driver_id is distinct from p_from_driver_id then return jsonb_build_object('success',false,'error','الطلب مش معاك'); end if;
  if v_o.status not in ('assigned','picked') then return jsonb_build_object('success',false,'error','الطلب مش قابل للنقل في حالته الحالية'); end if;
  select coalesce(driver_transfer_enabled,false) into v_enabled from public.dispatch_settings where branch_id=v_o.branch_id;
  if not coalesce(v_enabled,false) then return jsonb_build_object('success',false,'error','خاصية النقل غير مفعّلة لهذا الفرع'); end if;
  select * into v_to from public.drivers where id=p_to_driver_id and is_active;
  if not found then return jsonb_build_object('success',false,'error','الطيار المستلم غير متاح'); end if;
  begin
    insert into public.order_transfer_requests(order_id,from_driver_id,to_driver_id,branch_id,status,expires_at)
    values(p_order_id,p_from_driver_id,p_to_driver_id,v_o.branch_id,'pending',now()+interval '1 minute')
    returning id into v_id;
  exception when unique_violation then
    return jsonb_build_object('success',false,'error','فيه طلب نقل معلّق بالفعل لهذا الطلب');
  end;
  return jsonb_build_object('success',true,'transfer_id',v_id);
end $function$;

create or replace function public.driver_respond_transfer(p_transfer_id uuid, p_driver_id uuid, p_accept boolean, p_user_name text default '—')
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_t public.order_transfer_requests%rowtype; v_res jsonb;
begin
  select * into v_t from public.order_transfer_requests where id=p_transfer_id for update;
  if not found then return jsonb_build_object('success',false,'error','طلب النقل غير موجود'); end if;
  if v_t.to_driver_id is distinct from p_driver_id then return jsonb_build_object('success',false,'error','الطلب مش موجّه ليك'); end if;
  if v_t.status<>'pending' then return jsonb_build_object('success',false,'error','طلب النقل اتعالج خلاص'); end if;
  if now()>v_t.expires_at then
    update public.order_transfer_requests set status='expired' where id=p_transfer_id;
    return jsonb_build_object('success',false,'error','انتهت مهلة النقل');
  end if;
  if not p_accept then
    update public.order_transfer_requests set status='rejected', responded_at=now() where id=p_transfer_id;
    return jsonb_build_object('success',true,'action','rejected');
  end if;
  v_res := public._driver_move_order(v_t.order_id, v_t.to_driver_id, p_user_name);
  if coalesce((v_res->>'success')::boolean,false) is not true then
    update public.order_transfer_requests set status='expired', responded_at=now() where id=p_transfer_id;
    return v_res;
  end if;
  update public.order_transfer_requests set status='accepted', responded_at=now() where id=p_transfer_id;
  return jsonb_build_object('success',true,'action','accepted','trip_id',v_res->>'trip_id');
end $function$;

create or replace function public.driver_cancel_transfer(p_transfer_id uuid, p_from_driver_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_t public.order_transfer_requests%rowtype;
begin
  select * into v_t from public.order_transfer_requests where id=p_transfer_id;
  if not found then return jsonb_build_object('success',false,'error','غير موجود'); end if;
  if v_t.from_driver_id is distinct from p_from_driver_id then return jsonb_build_object('success',false,'error','مش من حقك'); end if;
  if v_t.status<>'pending' then return jsonb_build_object('success',false,'error','اتعالج خلاص'); end if;
  update public.order_transfer_requests set status='cancelled', responded_at=now() where id=p_transfer_id;
  return jsonb_build_object('success',true);
end $function$;

revoke all on function public._driver_move_order(uuid,uuid,text) from public, anon;
revoke all on function public.driver_request_transfer(uuid,uuid,uuid) from public, anon;
revoke all on function public.driver_respond_transfer(uuid,uuid,boolean,text) from public, anon;
revoke all on function public.driver_cancel_transfer(uuid,uuid) from public, anon;
grant execute on function public.driver_request_transfer(uuid,uuid,uuid) to authenticated;
grant execute on function public.driver_respond_transfer(uuid,uuid,boolean,text) to authenticated;
grant execute on function public.driver_cancel_transfer(uuid,uuid) to authenticated;

-- انتهاء المهلة تلقائيًا كل 30 ثانية
select cron.schedule('expire_order_transfers','30 seconds',
  $$update public.order_transfer_requests set status='expired' where status='pending' and expires_at<now()$$);
