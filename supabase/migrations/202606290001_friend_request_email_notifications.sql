create table if not exists public.friend_request_email_notifications (
  request_id uuid primary key references public.friend_requests(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'not_configured')),
  provider text not null default 'resend',
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  check (requester_id <> recipient_id)
);

create index if not exists friend_request_email_notifications_recipient_idx
on public.friend_request_email_notifications (recipient_id, created_at desc);

create or replace function public.touch_friend_request_email_notification_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists friend_request_email_notifications_touch_updated_at
on public.friend_request_email_notifications;

create trigger friend_request_email_notifications_touch_updated_at
before update on public.friend_request_email_notifications
for each row
execute function public.touch_friend_request_email_notification_updated_at();

alter table public.friend_request_email_notifications enable row level security;

create policy "friend request email notifications participant select"
on public.friend_request_email_notifications
for select
to authenticated
using ((select auth.uid()) in (requester_id, recipient_id));

