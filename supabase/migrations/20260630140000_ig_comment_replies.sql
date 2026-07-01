-- The Hard Win — approved Instagram comment-reply review queue.
-- Apply to the Hard Win project (tpirzpvvhhgpnwsrbbnh) ONLY — never CreatorSeal.
--
-- The AI drafts replies into this table; NOTHING posts until Tanya approves.
-- A reply may only be posted when status = 'approved' AND approved_reply is present.

create table if not exists public.ig_comment_replies (
  id                    bigint generated always as identity primary key,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Instagram identifiers
  ig_post_id            text,                 -- our post the comment is on (-> posts.ig_post_id)
  ig_comment_id         text unique,          -- the comment's own id (dedupe on this)
  parent_media_id       text,                 -- media the comment belongs to (Graph parent)
  commenter_username    text,
  comment_text          text not null,
  comment_permalink     text,

  -- Classification
  comment_type          text,                 -- see check below
  risk_level            text not null default 'low',   -- low | medium | high
  source_check_required boolean not null default false,

  -- Reply lifecycle
  ai_reply_draft        text,                 -- AI suggestion (may be null / do_not_engage)
  approved_reply        text,                 -- the exact text cleared to post (Tanya's)
  status                text not null default 'needs_review',
  approved_by           text,                 -- 'Tanya' once she signs off
  approved_at           timestamptz,
  posted_at             timestamptz,
  error_note            text,                 -- failure detail if a post attempt fails
  notes                 text,                 -- research notes, why rejected, context

  constraint ig_comment_replies_status_chk check (status in (
    'needs_review',    -- AI drafted; waiting on Tanya
    'needs_research',  -- can't reply until a fact/source is checked
    'approved',        -- Tanya approved the draft as written -> cleared to post
    'edited',          -- Tanya rewrote it; approved_reply holds her version
    'rejected',        -- declined; nothing posts
    'do_not_engage',   -- spam / trolling / bait — no reply at all
    'posting',         -- worker has picked it up and is publishing
    'posted',          -- reply is live on Instagram
    'failed'           -- a post attempt failed; see error_note
  )),

  constraint ig_comment_replies_type_chk check (comment_type is null or comment_type in (
    'praise_support',
    'question',
    'source_request',
    'correction_challenge',
    'sensitive_historical_dispute',
    'hostile_trolling',
    'spam_promo',
    'personal_story'
  )),

  constraint ig_comment_replies_risk_chk check (risk_level in ('low','medium','high')),

  -- The approval gate, enforced in the database itself:
  -- you can only be 'approved' if there is real approved_reply text to post.
  constraint ig_comment_replies_approval_chk check (
    status <> 'approved' or (approved_reply is not null and length(btrim(approved_reply)) > 0)
  )
);

-- Keep updated_at honest.
create or replace function public.touch_ig_comment_replies()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_ig_comment_replies on public.ig_comment_replies;
create trigger trg_touch_ig_comment_replies
  before update on public.ig_comment_replies
  for each row execute function public.touch_ig_comment_replies();

-- The posting worker looks up "what is cleared to send?" — index that path.
create index if not exists ig_comment_replies_status_idx
  on public.ig_comment_replies (status);

-- Lock the table down: only the secret server key can touch it.
alter table public.ig_comment_replies enable row level security;
