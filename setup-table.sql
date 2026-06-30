-- The Hard Win — content table for daily Instagram posts
-- Paste this whole thing into Supabase: SQL Editor -> New query -> Run.

create table if not exists posts (
  id              bigint generated always as identity primary key,
  quote           text not null,
  explanation     text,
  caption         text,
  image_url       text,
  status          text not null default 'pending',   -- pending | posted | error
  scheduled_date  date,                               -- optional: post on a set day
  posted_at       timestamptz,
  ig_post_id      text,
  created_at      timestamptz not null default now()
);

-- Lock the table down (only the secret server key can touch it).
alter table posts enable row level security;

-- Load the 5 starter cards (images already hosted).
insert into posts (quote, explanation, caption, image_url, status) values
(
  'The win that costs you something is the only kind that lasts.',
  'If it didn''t cost effort, fear, or sacrifice, it won''t change you. Pay the price on purpose.',
  E'The win that costs you something is the only kind that lasts. 💪\n\nIf it didn''t cost effort, fear, or sacrifice, it won''t change you.\n\nReal people. Real proof.\n#thehardwin #discipline #mindset #motivation #grit',
  'https://tpirzpvvhhgpnwsrbbnh.supabase.co/storage/v1/object/public/cards/card-1.png',
  'pending'
),
(
  'Proof beats promises. Show the work.',
  'Don''t just say you''re growing. Post the receipts, the reps, the progress people can see.',
  E'Proof beats promises. Show the work. 📈\n\nDon''t just say you''re growing — show the receipts.\n\nReal people. Real proof.\n#thehardwin #discipline #consistency #motivation #grit',
  'https://tpirzpvvhhgpnwsrbbnh.supabase.co/storage/v1/object/public/cards/card-2.png',
  'pending'
),
(
  'Nobody claps for the reps. Do them anyway.',
  'The boring, unseen practice is exactly what builds the result everyone applauds later.',
  E'Nobody claps for the reps. Do them anyway. 🔁\n\nThe boring, unseen practice builds the result everyone applauds later.\n\nReal people. Real proof.\n#thehardwin #discipline #hardwork #motivation #grit',
  'https://tpirzpvvhhgpnwsrbbnh.supabase.co/storage/v1/object/public/cards/card-3.png',
  'pending'
),
(
  'Discipline is just remembering what you actually want.',
  'When motivation fades, picture the bigger goal. It makes the hard choice obvious.',
  E'Discipline is just remembering what you actually want. 🎯\n\nWhen motivation fades, picture the bigger goal.\n\nReal people. Real proof.\n#thehardwin #discipline #focus #motivation #grit',
  'https://tpirzpvvhhgpnwsrbbnh.supabase.co/storage/v1/object/public/cards/card-4.png',
  'pending'
),
(
  'Hard-won is the only kind worth keeping.',
  'Easy wins fade fast. The things you struggle for stick and become who you are.',
  E'Hard-won is the only kind worth keeping. 🏆\n\nEasy wins fade. The things you struggle for become who you are.\n\nReal people. Real proof.\n#thehardwin #discipline #resilience #motivation #grit',
  'https://tpirzpvvhhgpnwsrbbnh.supabase.co/storage/v1/object/public/cards/card-5.png',
  'pending'
);
