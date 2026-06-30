LINKEDIN POST — pick the length that fits your feed
====================================================

------------------------------------------------------------
VERSION A — short
------------------------------------------------------------

I shipped my first end-to-end automation.

It runs a faceless Instagram channel, The Hard Win (@thehardwin) — every other day it
posts a real historical figure who did the hard version of something, paired with a
source line you can actually check.

About 75% of it is automated: a custom Python renderer builds the cards, Supabase
stores them, n8n schedules them, and the Instagram Graph API posts them.

The other 25% is me — and that part is on purpose. The brand's whole promise is that
every fact is true and checkable, so nothing posts until I've verified the source and
approved the card by hand. I automated the labor. I kept the judgment.

That human gate has already caught problems the system reported as fine. Building it to
need me in the loop is the part I'm most proud of.

First one's live. On to the next.

#Automation #Python #BuildInPublic #ContentAutomation #NoCode


------------------------------------------------------------
VERSION B — longer, more detail
------------------------------------------------------------

My first real automation is live — and I learned more from the 25% I DIDN'T automate
than the 75% I did.

It's a faceless Instagram channel called The Hard Win (@thehardwin). Every other day it
posts a real person who did the hard version of something — started late, came from
nothing, got told no and kept going — paired with a "receipt": a source line you can
check yourself. The whole brand rests on one rule: the fact has to be true.

What I automated (~75%):
• A custom Python/Pillow renderer that builds each card and auto-fits the text so it
  never breaks the layout
• Supabase as the data + image store
• n8n to schedule posts every other day
• The Instagram Graph API to publish, with long-lived token refresh
• A reusable skill that encodes the research and verification rules, so the next batch
  is a short run, not a rebuild

What I deliberately kept human (~25%):
• Every fact has to clear a two-source rule before it can become a card
• If a fact won't hold, the person gets cut — a cut is the standard working, not a
  failure
• I review every card for accuracy AND layout before it's approved
• Nothing posts until I sign off

I could have let it run end to end. I didn't, on purpose. The brand's value is that
it's trustworthy, and you can't outsource trust to a script. The human gate has already
caught real bugs the system thought were fine.

Automate the labor. Keep the judgment. That's the lesson I'm taking forward.

First one's done — already researching the next.

#Automation #Python #Supabase #BuildInPublic #ContentCreation #SystemsThinking
