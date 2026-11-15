Nova's Moon Mission: Spec and Cursor 
Prompts
NASA Space Apps 2026, Build a Junior Astronaut Mission Trainer. Hand this whole doc to
Cursor, then feed it the prompts in Section 9 one at a time.
0. Read this first
Deadline: the submission page says projects close Sunday, November 15 at 11:59 p.m.
local time. If that is tonight, build only the lines marked [TONIGHT] and cut
everything marked [LATER]. Confirm with your Local Lead.
Rule for everything below: a small game that works and is honest about its data beats
a big one that is half broken.
Never fake data silently. Every number in the game carries a label: LIVE, ARCHIVED,
REFERENCE, ASSUMPTION, or STORY.
Prefer real NASA data over assumptions. If a number can come from a NASA source,
use that source. Use an ASSUMPTION only when no NASA number exists, and label it
1. The pitch (use this in your demo)
Run a Moon base for 10 days. Real NASA space weather decides when the storms hit.
Every choice costs something, and today's choice changes day 8.
Players: kids 7 to 12, with real stakes that older kids, parents and teachers will also enjoy
(Section 6d). Assume the player knows nothing about space (Section 6c). Format:
browser game, no login, no download.
2. How this scores against the judging rubric
Criterion What we do to earn a 5
Relevance Real DONKI data sets storm severity and warning
time inside the game, not in a side panel. Real site
illumination sets solar power. Real OSDR space
biology studies drive the greenhouse events.
Nova's Moon Mission: Spec and Cursor Prompts
Page 1 of 20

3. Core design
Crew of 4 Moonkeepers led by Nova. Mission: 10 days. All amounts are whole numbers so
kids can reason about them.
3.1 Three systems only
1. Power ("electricity that keeps your Moon home running")
2. Life Support (water, oxygen and a greenhouse)
3. Crew Protection (shielding and sheltering from radiation)
3.2 The linking chain (this is the educational heart)
Power runs the recycler, which saves water.
Water is split into oxygen by the oxygen maker, which also needs power.
Science needs power and sends the crew outside, which raises radiation exposure
during storms.
Shielding needs building materials, which are also needed for solar panels.
Greenhouse plants use water and power, give a little oxygen and a research bonus,
and are tied to a real OSDR study.
No choice is free. Spending on one thing starves another.
Criterion What we do to earn a 5
Validity Every number is labeled. Real physics is used
where possible (CME travel time). A visible "What
is simplified" screen.
Impact Teaches one true constraint: power, water, oxygen
and radiation protection are linked. Works for
classrooms.
Creativity Compounding chain (power, recycler, water,
oxygen) plus a storm timer driven by real events.
Replay with a different seed.
Presentation 30 second video that shows: live card, a choice, the
consequence two days later, the end report.
Nova's Moon Mission: Spec and Cursor Prompts
Page 2 of 20

3.3 State
type GameState = {
  day: number;               // 1..10
  site: "rim" | "plain";
  battery: number;           // stored power chips, cap 20
  water: number;             // start 40
  oxygen: number;            // start 30
  materials: number;         // start 10
  shieldLevel: number;       // 0..4
  panelBonus: number;        // extra chips per day from built panels
  exposure: number;          // 0..100, never goes down on its own
  science: number;           // score
  log: DayLog[];             // every decision, for the replay screen
};
3.4 Daily power budget
Each day the player gets generation + battery  in "power chips" and spends them on:
Unspent chips go to the battery (cap 20, so you cannot hoard forever).
3.5 Daily consumption (all ASSUMPTION unless you verify)
Water use: 4 per day without recycler, 1 per day with recycler.
Oxygen use: 3 per day.
Item Cost (chips) Effect
Heat and basics 2 (forced) If unpowered, exposure and crew health suffer
Recycler 2 Water loss per day drops from 4 to 1
Oxygen maker 2 +3 oxygen, uses 1 water
Comms to Earth 1 Needed to receive storm warnings early. Off =
warning time cut in half
Science (0 to 4) 1 per level +2 science points per level. Crew goes outside
Greenhouse 1 (and 2 water) +1 oxygen and +1 science per day, but 2 water
leaves your tanks. A real OSDR study sets the
event (Section 4.3)
Nova's Moon Mission: Spec and Cursor Prompts
Page 3 of 20

Lose if water or oxygen reaches 0, or exposure reaches 100.
3.6 Materials
Build a shield level: 2 materials. Each level cuts storm exposure by 20 percent (cap 4
levels, 80 percent).
Build a solar panel: 3 materials, +1 power chip per day, permanent.
Materials start at 10. A small resupply event can add some (see events).
3.7 Storm exposure formula
base  = severity * 15                      // severity 1, 2 or 3 from real 
flare class
if sheltered:   exposure += base * 0.15 * (1 - 0.2 * shieldLevel)
else:           exposure += base * (1 - 0.2 * shieldLevel)
if sheltered:   science that day = 0       // the cost of staying safe
Normal days outside add a small exposure of 2 (assumption).
3.8 Sites (two only)
The equatorial sunlight fraction (about half) is solid.
The polar illumination fraction must be verified against a NASA/LRO source before
you cite it. Use a published figure, label it REFERENCE, and put the link in the source
panel. If you cannot verify tonight, label it ASSUMPTION based on LRO studies and
say so.
Rim site (south pole ridge) Plain site (equatorial mare)
Sunlight High, near constant About half of the time (lunar day is
about 29.5 Earth days)
Power per
day
8 chips 8 chips on 5 days, then 0 chips on
night days
Trade-off Steady power but rough terrain:
science gives only +1.5 per level
Easy terrain: science +2 per level, but
you must store power for night
Nova's Moon Mission: Spec and Cursor Prompts
Page 4 of 20

3.9 The trade-off rule: every decision costs something
The challenge text says a decision with no cost teaches nothing. So the rule for the whole
game: every choice has a benefit and a cost, and both are shown before the player
commits. If a choice has no cost, delete it or give it one.
Cost preview: tapping any option shows what it adds and what it takes (power, water,
oxygen, materials, exposure, science) before the player confirms.
No dominant option: no option is better than another on every measure. If one is,
rebalance.
A delayed cost: every decision has at least one cost that lands 2 or more days later, so
a child can trace cause to effect.
No fake choices: the forced 2 chips for heat and basics is shown as a fixed cost, not as
a decision.
Same units everywhere: costs use the same icons and numbers as the base screen.
Decision Benefit Cost now Cost later The true idea it
teaches
Build at the
rim site
Steady
sunlight
Rough ground,
science 1.5 per
level
Hard to
expand fast
Where you build
decides your
power
Build at the
plain site
Easy ground,
science 2 per
level
No power on
night days
Must store
power in the
battery
The Moon has long
days and long
nights
Run the
recycler
Water loss
drops from 4
to 1
2 power Less power for
science
Recycling saves
supplies but needs
energy
Run the
oxygen maker
+3 oxygen 2 power and 1
water
Water runs
lower
Air can be made
from water, with
electricity
Keep comms
on
Full storm
warning time
1 power Less science Talking to Earth
costs energy
Do science +2 science per
level
1 power per
level
More exposure
on storm days
Research needs
energy and time
outside
Nova's Moon Mission: Spec and Cursor Prompts
Page 5 of 20

4. Real data: how it drives the game
4.1 DONKI (live, with archived fallback)
API: https://api.nasa.gov/DONKI/{FLR|CME|SEP|GST}?startDate=YYYY-MM-
DD&endDate=YYYY-MM-DD&api_key=KEY
On load, fetch the last 30 days of flares (FLR) and CMEs.
Severity from the strongest real flare: class C = 1, M = 2, X = 3. The mapping is a game
assumption. The flare record is real. Show both.
Warning time from a real CME speed: hours = 149,600,000 km / speed km/s /
3600 . This is real physics (distance from Sun to Moon is about 1 AU). Example: 1000
km/s gives about 41 hours. Game rule: warning days = floor(hours / 24), minimum 0.
Without comms, halve it.
Note for the "What really happens" text: radiation particles from a flare can arrive
much sooner than the CME cloud, so real warning times are shorter. This honesty
earns Validity points.
If the live pull has no flare or CME: use the archived event and show an ARCHIVED
badge with its real date. Do not hide this.
Archived fallback: at build time, fetch 3 real events (one C, one M, one X flare, each
with a CME if one exists) and store the records as JSON. Do not invent records.
Decision Benefit Cost now Cost later The true idea it
teaches
Run the
greenhouse
+1 oxygen, +1
science
1 power and 2
water
Tanks drain
faster
Plants help, but
they need
resources
Build a shield
level
20 percent less
storm
exposure
2 materials Fewer solar
panels
Protection costs
building materials
Build a solar
panel
+1 power every
day
3 materials Less shielding Investing early
pays off later
Shelter in a
storm
Exposure stays
low
No science that
day
Falling behind
on score
Safety versus
progress
Nova's Moon Mission: Spec and Cursor Prompts
Page 6 of 20

SEP endpoint is optional. Do not use SEP events as a dose measurement; they are not.
4.2 Site illumination (archived)
Embedded small table for the two sites, with a source link and an ARCHIVED or
REFERENCE badge.
4.3 OSDR: the greenhouse and real space biology [TONIGHT: archived studies, 
LATER: live search]
Biology enters the game here as a real choice, not a trivia card. Each run, the greenhouse
is tied to a real NASA OSDR study.
What OSDR is: NASA's open archive of space biology experiments. Search by
keyword with https://osdr.nasa.gov/osdr/data/search?term=plant  and read one
study with https://osdr.nasa.gov/osdr/data/osd/meta/{OSD-id} . No key is
needed. Confirm the endpoints on OSDR's API page and the biological data API before
relying on them. Call them through a serverless route ( /api/osdr ), because browser
access (CORS) is unverified.
What the player sees: a Study card with the study ID (OSD-number), title, organism,
mission, one finding in kid language, a link to the real study page, and a LIVE or
ARCHIVED badge.
What it changes in the game: the greenhouse toggle (1 power and 2 water a day, +1
oxygen, +1 science; these numbers are ASSUMPTION). The chosen study sets the
event wording and a small bonus or risk, so a different study on a replay feels
different.
The trade-off: water in the greenhouse is water the oxygen maker cannot use. Plants
give a little air and research, but they drain the tanks.
Biology and radiation: after a storm day, show a "Why radiation matters" card that
cites one real OSDR radiation or microgravity study. The exposure meter stays a
simplified model labeled ASSUMPTION.
Archive first: ship 3 real plant or biology studies that you read yourself, stored as
JSON with ID, title, organism, mission and a finding in your own words. Live search is a
bonus. If it fails, show ARCHIVED. Never hide it.
Honesty rules: state only findings you read on the study page. Experiments on the
International Space Station may not match the Moon, so say so on the card. Never
invent a study ID.
Nova's Moon Mission: Spec and Cursor Prompts
Page 7 of 20

Anchor the greenhouse to a real lunar study. Study OSD-476 in OSDR grew the plant
Arabidopsis in real Apollo lunar soil on Earth (confirm on the OSDR study page). The
reported finding: the plants grew, but slowly, and showed stress. Use that to shape the
rules, not to invent numbers:
Slow start: the greenhouse gives no bonus for its first few days. The slow start is the
real finding. The number of days is an ASSUMPTION.
Smaller bonus than on Earth: lunar-soil plants give less oxygen and science than the
+1 and +1 in Section 3.4. The size is an ASSUMPTION.
Before you set any number: read the study's own measurements (for example growth
or stress results) on its page, write them in this doc with the link, and tune the game
from them. If the study does not give a number you need, label the game number
ASSUMPTION. Never invent a measurement.
Radiation numbers: OSDR animal and plant studies explain why radiation matters, but
they are not a dose table for a Moon base. Keep the exposure meter labeled
ASSUMPTION, or base it on a published radiation measurement dataset and cite it.
4.4 RadLab [CUT unless everything else is done]
5. Events (randomized by seed)
Each day has one event card with two options, each with a visible benefit and a visible
cost. Seed decides which day each event lands, except the real-data storm, which must
arrive after its warning time.
Event Source badge Option A Option B
Solar storm (from
DONKI)
LIVE or ARCHIVED Shelter: exposure
low, no science that
day
Stay out: keep
science, exposure
high
Lunar dust in the
recycler
REFERENCE (dust
was a real Apollo
problem)
Spend 1 material and
1 power to clean
Skip: recycler loses
half efficiency
Nova's Moon Mission: Spec and Cursor Prompts
Page 8 of 20

After every choice show a "What really happens" line: one plain sentence of real NASA
context. Each line must be accurate. If you cannot verify a claim, remove it.
6. The compounding rule (test this)
A test must prove: Day 3, player turns the recycler off to fund science. Water falls faster.
On Day 8 the player cannot run both the oxygen maker and the experiment. If this test
fails, the game is not working.
6b. Prove there is no best strategy
Add an automated balance test. Play 500 seeds with each of five fixed strategies: all
science, all safety, balanced, greenhouse heavy, and random.
Every strategy must win on at least 10 percent of seeds and lose on at least 10
percent. These targets are for tuning, not rules from NASA.
If one strategy wins on more than 90 percent of seeds, rebalance the numbers.
The best fixed strategy must differ between the rim site and the plain site.
Event Source badge Option A Option B
Delayed message
from Earth
REFERENCE (about
1.3 s signal delay)
Spend 1 power to
ask for help
Decide alone: save 1
power, but a 1 in 4
chance of a mistake
that costs 2
materials
Supply ship drops
materials
STORY Take materials, lose
a day of science
Skip it: keep your
science, but no new
materials
Greenhouse
experiment (real
OSDR study)
OSDR Water the plants:
costs 2 water a day,
gives +1 oxygen and
+1 science
Save the water:
tanks stay fuller, no
plant bonus
Battery surge STORY Use extra power
now: more science
today, less in the
battery for night
Save to battery:
nothing gained
today, a buffer for
later
Nova's Moon Mission: Spec and Cursor Prompts
Page 9 of 20

A player who adapts to each day's storm and supplies must beat every fixed strategy.
That is the lesson: think, do not repeat.
6c. Teaching design: assume the player knows nothing
A child should be able to learn the game, and the science, with no help.
Training Day (Day 0): three guided taps, one idea per screen: (1) power is limited, (2)
water and air run out, (3) space weather can hurt the crew. Nothing is scored.
Explain every word the first time it appears, in 15 words or fewer, with a picture.
Example: "Radiation: invisible energy from the Sun that can harm the body." Tap any
underlined word later to see it again in the Space Words drawer.
Same card for every decision: (1) What is happening. (2) Why it matters. (3) Your
options, each with its benefit and cost as icons and numbers. (4) Predict: "What do
you think happens to your water?" (5) Result with arrows. (6) What really happens:
one true NASA fact.
Predict, then reveal. A guess before the result is what makes kids remember cause
and effect. Keep it optional so it never blocks play.
Short words: aim for a reading level of about grade 3 for everyone, sentences under
20 words, icons beside every word that matters. Add a read-aloud button using the
browser's built-in speech, which needs no account.
Ask Nova: a hint button that explains the trade-off in the situation but never names
the best choice.
Debrief: the end report names cause and effect from the player's own game ("On Day
3 you turned off the recycler, so on Day 8 you had to choose between water and
science"), then a 3 question quick check built from what just happened. Every answer
in it must be true and sourced.
Real-kid test: have two kids or non-space adults play with no instructions. If they
cannot explain the Day 3 to Day 8 link afterward, rewrite the cards until they can.
6d. Not babyish: one mode, a rank, and real stakes
One mode for ages 7 to 12. Older kids stay interested because the choices are hard
and the consequences are real, not because the words are harder.
Tone: friendly, short and a little funny, like Henry in Henry's Farm Adventures. Nova
talks to the player like a teammate.
Nova's Moon Mission: Spec and Cursor Prompts
Page 10 of 20

A rank at the end: Cadet, Flight Engineer or Mission Commander, from crew safety,
science and supplies left.
Real stakes, not punishment: the crew can fail. A failure shows a short "Mission
review" of what to change and a one-tap retry on a new seed.
Look: pick one style and keep it. Henry's Farm used pixel art with a dialogue box. Any
consistent illustrated style works. List every asset in References.
6e. Language: talk like Henry's Farm
Henry's lines are things like "Hello, I am Henry! A local farmer." and "Can you help me
figure out what's happening?" That is the level we need. One idea per line, a character
who speaks, a picture first, and click to continue.
Dialogue box: a name tag (Nova, Mission Control), one or two short sentences, at
most 12 words a line, then "click to continue".
Picture first, then words: show a real photo or map and say one plain thing about it,
like Henry's Farm does with its crop failure photo and drought map.
Words we never show on a card unless we have taught them first: class M, CME, SEP,
radiation dose, microgravity, illumination, ECLSS. Use small words instead: storm,
storm cloud, sunlight, water cleaner, air maker.
Math the Henry way: a small box with one simple rule and today's numbers filled in,
such as "Water left = 30 − 4 = 26". No formulas with units a 7 year old has not met.
The real data stays real, but it is told as a picture and a short line:
Real NASA data What the child sees
Flare class (C, M or X) A small, medium or big storm, shown as 1, 2 or 3 sun
bursts
CME speed "The storm cloud will reach the Moon in about 2
days." with a countdown
Event date "NASA saw this on March 3."
OSDR study "Scientists grew plants on a space station. Here is
what they found:" and one sentence
Site sunlight A sun and moon bar: "Sunny almost every day" or
"Dark for half the time"
Nova's Moon Mission: Spec and Cursor Prompts
Page 11 of 20

The exact flare class, speed and formula stay in the small "How do we know?" link on each
card. Nobody needs to click it to play.
Show the cost the same way: "Costs 2 power. Saves 3 water." with icons.
Read-aloud test: read each card to a 7 year old. If they ask "what is that?", rewrite the
card.
Real images: use a real NASA picture for the storm card and the site card, as Henry's
Farm used a real crop photo and a real map. Credit each one exactly as its image page
says.
7. Screens
1. Welcome (Nova, one-sentence goal, start).
2. Pick site (two cards with a visible trade-off).
3. Base screen (main screen): flat illustration, resource bars, "Today's real space
weather" card, event card.
4. Power allocation panel (chips you tap to assign).
5. Day result (what changed and why, with arrows).
6. End report: chart of resources by day, your strategy, what you could try differently,
final score.
7. Replay: new seed, same engine.
Real NASA data What the child sees
Exposure meter A "Crew safety" bar with a heart
Too hard Say it like this
"DONKI recorded an M2.1 flare with an
Earth-directed CME at 900 km/s."
"NASA saw a medium storm on the Sun. The
storm cloud will reach us in 2 days. Get
ready!"
"Radiation exposure increases cumulative
dose."
"Storm energy can hurt people. Stay inside
to stay safe."
"The recycler reduces water loss from 4 to 1
units."
"The water cleaner saves water, but it uses
power."
"Allocate power chips across subsystems." "You have 8 power. Pick what to turn on."
Nova's Moon Mission: Spec and Cursor Prompts
Page 12 of 20

8. "What is real and what is simplified" screen with a badge legend and all sources.
Add a Training Day screen first and a Space Words drawer (Section 6c). Every unfamiliar
term is explained the first time it appears.
8. Tech and structure
React + TypeScript + Vite (or what you already have). Keep the NASA key out of the
browser: use a serverless function (Vercel or Netlify) or an env variable. For
development, DEMO_KEY  works but is rate limited.
Folders: /engine  (pure functions, no UI), /data  (NASA services, cache, archived
JSON), /ui , /content  (events and glossary).
Engine is deterministic given a seed. Write unit tests for the chain in Section 6.
Cache DONKI in localStorage for 6 hours. On any failure fall back to archived and show
the badge.
Every number shown on screen has a badge: LIVE, ARCHIVED, REFERENCE,
ASSUMPTION, STORY.
9. Prompts for Cursor (give them in this order)
Prompt 0: Setup [TONIGHT]
Read SPEC.md (this document). Do not write game code yet.
Create a Vite + React + TypeScript project with folders: /engine, /data, /ui, 
/content.
Add Vitest. Add a README that lists the badge types (LIVE, ARCHIVED, 
REFERENCE, ASSUMPTION, STORY).
Create src/types.ts with the GameState and Event types from the spec.
Summarize back to me the 3 systems and the linking chain in 5 lines to prove 
you understood.
Nova's Moon Mission: Spec and Cursor Prompts
Page 13 of 20

Prompt 1: Simulation engine only [TONIGHT]
Implement /engine as pure TypeScript with no UI and no network.
Follow Section 3 exactly: power chips, recycler, oxygen maker, comms, 
science, battery cap 20,
materials, shield levels, panels, two sites, storm exposure formula, lose 
conditions.
Expose: createGame(site, seed), applyDay(state, decisions, event, choice) -> 
newState + dayLog.
Use a seeded random generator so replay is possible.
Every constant goes in /engine/constants.ts with a comment tagging it 
ASSUMPTION or REFERENCE.
Write Vitest tests for:
1) recycler off on Day 3 leads to lower water on Day 8,
2) shelter costs science and cuts exposure,
3) shield level lowers exposure by 20 percent per level,
4) battery never exceeds 20,
5) game ends when water, oxygen, or exposure limits are hit,
6) same seed gives same game.
Run the tests and show me the results.
Prompt 1b: Greenhouse and trade-off audit [TONIGHT]
Extend /engine using Sections 3.4, 3.9, 6b and 6d.
1) Add the greenhouse (1 power, 2 water per day; +1 oxygen, +1 science). Tag 
these constants ASSUMPTION.
2) Put every difficulty number in /engine/constants.ts as data so it is easy 
to tune. One mode only.
3) Create /engine/audit.ts that lists every player decision with its benefit 
and cost as data, matching the table in Section 3.9.
   Add a test that fails if any decision has an empty benefit or an empty 
cost.
4) Add a test that no option is better than another on every measure.
5) Add a balance test: 500 seeds x 5 fixed strategies (all science, all 
safety, balanced, greenhouse heavy, random).
   Print win rates. Fail if any strategy wins more than 90 percent or less 
than 10 percent of seeds.
6) Show me the win-rate table and tell me which constants you changed to 
balance it.
Nova's Moon Mission: Spec and Cursor Prompts
Page 14 of 20

Prompt 2: Data layer [TONIGHT]
Implement /data.
1) donki.ts: fetch FLR and CME for the last 30 days through a /api/donki 
serverless route that
reads NASA_API_KEY from env. Return the strongest flare and the fastest CME 
with real dates and IDs.
2) severity.ts: flare class C=1, M=2, X=3 (labeled ASSUMPTION mapping).
3) warning.ts: hours = 149600000 / speedKmS / 3600, warningDays = 
floor(hours/24), halved without comms.
4) archived.json: ask me to paste three real DONKI records, or fetch them and 
tell me the IDs.
Do NOT invent records. Do not make up IDs or dates.
5) cache in localStorage for 6 hours.
6) On failure or empty live result, return the archived event with source: 
"ARCHIVED" and its real date.
7) sites.json: two sites with illumination and a source URL; mark anything 
unverified as ASSUMPTION.
Add tests with mocked fetch for success, empty, and failure.
Prompt 3: Events and content [TONIGHT, trimmed]
Create /content/events.ts with the events table from Section 5.
Each event: id, title, source badge, plain-language explanation for ages 7 to 
12,
optionA and optionB each with explicit benefit, cost, and engine effects,
and a one-sentence realWorldNote.
Create /content/glossary.ts for radiation, solar flare, CME, battery, sol.
The storm event must be built from the live or archived DONKI record at 
runtime and show its date.
Schedule events with the seeded RNG; the storm lands after its warning time.
Only include claims in realWorldNote that are true; if unsure write a TODO 
and tell me.
Nova's Moon Mission: Spec and Cursor Prompts
Page 15 of 20

Prompt 3b: OSDR data and greenhouse events [TONIGHT archived, LATER 
live]
Implement OSDR support using Section 4.3.
1) /data/osdr.ts calls /api/osdr (serverless proxy, no key in the client). 
The route searches
   https://osdr.nasa.gov/osdr/data/search?term=plant and reads one study from
   https://osdr.nasa.gov/osdr/data/osd/meta/{OSD-id}.
   Return {id, title, organism, mission, finding, url, source: "LIVE" | 
"ARCHIVED"}.
   First confirm the endpoints against NASA's OSDR API pages and tell me what 
you found.
2) /data/osdr-archive.json holds 3 real studies. Ask me to paste them, or 
fetch them and show me the IDs.
   Never invent IDs, titles, organisms or findings.
3) /content/greenhouse.ts builds the greenhouse event from the chosen study: 
kid-friendly wording, benefit and cost for both options,
   one finding in plain words, a link to the real study page, and a caution 
that ISS results may not match the Moon.
4) Add a "Why radiation matters" card after storm days that cites one real 
OSDR study.
5) Pick the study with the seeded random generator so replays differ.
6) On failure or empty result, use the archive and show an ARCHIVED badge.
Add tests with mocked fetch for success, empty and failure.
Prompt 4: UI [TONIGHT]
Build the screens in Section 7 using the engine and data layer.
Main base screen is a clean flat illustration (simple SVG or emoji icons are 
fine). Do not spend time on art.
Show resource bars, a "Today's real space weather" card with a badge and 
date,
a tap-to-assign power chips panel, the event card with visible benefit and 
cost on both options,
and a day-result screen with arrows showing what changed and why.
Every number has a source badge. Add the legend screen.
Responsive for desktop and tablet. No login. Handle loading and errors.
Nova's Moon Mission: Spec and Cursor Prompts
Page 16 of 20

Prompt 4b: Learning layer and plain language [TONIGHT]
Add the teaching layer from Sections 6c, 6d and 6e on top of the existing UI. 
Study the Henry's Farm Adventures dialogue style.
1) Training Day: three guided screens before Day 1, nothing scored.
2) Space Words: underline every unfamiliar word. Tap to see a 15-word-or-less 
definition and a small picture. Include a drawer listing all words.
3) Every decision card follows: What is happening, Why it matters, Options 
with benefit and cost shown before confirming,
   optional Predict, Result with arrows, What really happens.
4) Cost preview: tapping an option shows chips for what it adds and what it 
takes, before the player confirms.
5) Ask Nova hint button that explains the trade-off without naming the best 
choice.
6) Read-aloud button using the browser speechSynthesis API. No account, no 
external service.
7) No mode picker. Show real data as a picture and one plain line, using the 
table in Section 6e. Put the exact numbers behind a small "How do we know?" 
link.
8) Tone: friendly and short like Henry's Farm. Nova speaks in a dialogue box, 
one idea per line, click to continue. Never show the words in the banned list 
in Section 6e.
9) End report: cause and effect from the player's own log, a 3 question quick 
check built from what happened, and a rank.
Keep reading level short and plain. Tell me which words you could not explain 
in 15 words.
Prompt 5: Report and replay [TONIGHT if time, otherwise LATER]
Add the end report: resources by day chart, final score, exposure, a plain 
sentence on the
player's strategy (for example "you kept the recycler off and ran out of 
water on day 8"),
and a "Try a different strategy" button that starts a new seed.
Add a "What is real and what is simplified" page listing every dataset, its 
link, and its badge.
Nova's Moon Mission: Spec and Cursor Prompts
Page 17 of 20

Prompt 6: QA and polish [TONIGHT]
Play the game start to finish at least three ways (power-heavy science, safe 
and slow, balanced).
Confirm: no strategy is always best, nothing is free, losses feel fair,
DONKI failure falls back to ARCHIVED with a visible badge, and no API key 
appears in the client bundle.
Fix bugs. Then list every library, API, asset, and data source for the 
References field.
10. Submission checklist
11. 30 second video script
1. (0 to 5 s) "Nova needs to survive 10 days on the Moon." Show the base screen.
2. (5 to 12 s) "Today's real NASA space weather": show the DONKI card with its date and
badge.
3. (12 to 20 s) Make a choice: turn off the recycler to run science. Show the cost.
4. (20 to 26 s) Jump ahead: water is short on Day 8 and the player must choose.
5. (26 to 30 s) End report and "Real data. Real trade-offs."
All team members registered, same event, on the Members tab (team size 1 to 6;
Universal Event teams need at least 2).
All required fields completed, in English.
Demo: 30 second video (English subtitles if not English) or a 7 slide deck.
References field lists every library, API, font, icon, image and dataset. No copyrighted
music or images.
Both required checkboxes ticked.
Press Submit before the deadline. Saving is not submitting.
The game link works with no login.
References lists every OSDR study ID used, API and library. Add a short "Use of AI"
note and a "Limitations" note to the write-up (Section 13).
Nova's Moon Mission: Spec and Cursor Prompts
Page 18 of 20

12. Honesty line for your submission text
"Solar events and CME speeds come from NASA DONKI. Radiation exposure in the game
is a simplified model, not a measured Moon dose. Resource amounts are game
assumptions unless labeled REFERENCE."
"Plant and biology facts come from NASA OSDR studies. Experiments on the International
Space Station may not match conditions on the Moon."
13. What to copy from Henry's Farm Adventures, and the write-up
This is the example you shared, from a past Space Apps challenge. I have not checked the
award, so confirm that yourself before you cite it. It is a story tour of separate mini-games.
Ours is one connected simulation, which is the thing the Moon challenge actually asks for.
Copy its strengths, not its structure.
Write-up skeleton for the submission page
Summary: 3 sentences. Who the player is, what they manage, and which real NASA
data changes the game.
Demo and project link: the video and the live game.
What it did well What we do
A named guide and real places and events Nova plus real DONKI storms with their real
dates, and a real OSDR study each run
Real satellite images in a before and after
slider
One real NASA photo of the site on the pick-a-
site screen, credited exactly as the image
page says
A quiz after each lesson The 3 question quick check in the end report
A list of every NASA dataset with links The "What is real and what is simplified"
screen
A clear statement of its own limits A "Limitations" paragraph (below)
A note on how AI was used A "Use of AI" paragraph (below)
Demo video, live link and GitHub link 30 second video, a link that works with no
login, and the code on GitHub
Nova's Moon Mission: Spec and Cursor Prompts
Page 19 of 20

How it works: the daily loop, the three systems, and one example of a Day 3 choice
that changes Day 8.
Who benefits: kids 7 to 12, older siblings, parents and teachers.
NASA data used: DONKI (storm severity and warning time), OSDR (greenhouse
studies, with the study IDs), and the source for site sunlight. Say for each one
whether it is LIVE or ARCHIVED.
What is simplified: radiation exposure and resource amounts are game assumptions,
not measured Moon values.
Limitations: two sites, ten days, no real dose model, plant results from the ISS may not
match the Moon.
Use of AI: say honestly where you used AI tools to brainstorm, write code or debug,
and that you checked the data and facts yourselves.
References: every library, font, icon, image, API and study ID.
Nova's Moon Mission: Spec and Cursor Prompts
Page 20 of 20