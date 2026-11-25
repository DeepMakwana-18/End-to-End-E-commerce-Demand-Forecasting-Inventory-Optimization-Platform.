I'm going through the remaining frames of your Titan AI landing page recording, then I'll list the problems.

I only reviewed what's in the recording: the hero section of the Titan AI landing page, 12 seconds, no scrolling. These are the problems I found, most serious first.

**Hero chart**

1. **The chart doesn't sit inside its card.** The raw-data dots and the start of the curve sit outside the card's left edge. The forecast band is cut off in a hard vertical line at the right edge, and the end-point dot sits on the border. The "Recommended action" chip hangs off the top-right corner. The card edge is so faint that all of this reads as a layout bug rather than a deliberate break-out. Either contain everything or make the overflow clearly intentional with a stronger card edge.
2. **The chart doesn't tell a readable story.** "+18.4% by W10" points at a node, but there is no time axis, so nobody can find W10. The unlabeled orange dots in the past data look like stockout markers, which confuses things. The "Reorder 320 units" chip has no leader line to the end point it refers to. Add a light axis or week ticks, and give the orange dots a meaning or remove them.
3. **Stray particles look like glitches.** At one point a blue dot floats off the line near the stockout chip, and at another a half-clipped orange ring sits against the right viewport edge by the scrollbar. Any animated element should follow the path or stay inside the card.
4. **The chips move, but they look clickable.** The chips and nodes float or drift, which makes them hard to hover. Nothing happens on hover and there is no tooltip. If they aren't interactive, remove the hover-like styling. If they are, add a hover state, a tooltip, and a steady hit area.
5. **The captions float loose.** "RAW SALES DATA" sits far below the dots, and the "ILLUSTRATIVE DEMO DATA · SKU-204" pill hangs bottom-right at a different height. Neither aligns to the card or to each other. Anchor both to the card, for example a caption row directly under it.

**Layout and alignment**

6. **The nav doesn't line up with the page grid.** The pill nav starts and ends well inside the hero content (headline at x≈68, card to x≈1223, nav from about 200 to 1068). Make the nav's inner edges match the content container.
7. **The nav background looks off.** It is warm and cream while the page is cool blue-grey, so it looks slightly dirty. Use a tint of the page colour with a blur, or a clean white.
8. **There is a faint rounded rectangle behind the hero.** It starts around x≈28 and looks like a section box or gradient banding. Remove it or make it a deliberate, clearly visible container.
9. **The hero is poorly balanced.** There is a wide dead gap between the text column and the chart, and the card itself is mostly empty because the data runs along one diagonal. The "Forecast · Detect · Decide" and "Scroll to explore" row sits only about 20px from the bottom of the view, so on a shorter laptop it will clip or collide with the buttons. Use min-height: 100svh with proper bottom padding, and tighten the chart's size and position against the headline.

**Components and details**

10. **The two CTAs repeat.** "Launch Titan AI" appears in the nav and in the hero in the same viewport, so the primary action competes with itself. Keep the nav one as a lighter or secondary style.
11. **"See how it works" has weak affordance.** It is a white button on an almost white background with a barely visible border. Strengthen the border or the fill.
12. **The primary button looks stuck.** In the frame where the cursor is over the secondary button, the primary one is still darker. That suggests a stuck hover or focus state. Check `:focus-visible` versus `:focus`, since a mouse click shouldn't leave a persistent focus look.
13. **The chart labels are tiny.** Labels like "RECOMMENDED ACTION", "DEMAND" and "STOCKOUT RISK" are about 10–11px, uppercase and widely tracked. The blue on pale blue and the brown on yellow are too low in contrast. Raise the size to at least 12px and darken those colours. The dashed leader lines are almost invisible; make them slightly stronger.
14. **The headline mixes two typefaces unevenly.** The serif italic "Stay ahead." looks lighter and optically larger than the grotesque lines above it. The leading is also very tight, with descenders nearly touching the next line. Match the x-height and weight, and open the line-height slightly.
15. **Motion needs checking.** I can't confirm from the video whether `prefers-reduced-motion` is respected. With this much continuous animation, it should be. Check it before shipping.

If you want, send me a recording that scrolls through the rest of the page and I'll review the other sections the same way.


Still going through the second recording (I'm about a third of the way in, at the "From spreadsheet to decision" section). Next I'll view the remaining sections.

Almost done with the review; I'm checking the FAQ and footer area, then I'll write up the problems.

This recording covers the full page: the hero, the four-cards section, the spreadsheet-to-decision slider, Explore Intelligence, "Not more dashboards", the FAQ and the footer. I haven't repeated the hero issues from the first video. These are the new problems, most serious first.

**Page-wide**

1. **The sticky nav is see-through.** Headline text shows through the pill and collides with the logo (around 6 s, "Stay ahead." overlaps TITAN AI). In the FAQ, "Before you" is clipped behind it. Give it a blurred backdrop and a near-opaque background, or hide it on scroll down.
2. **The section headings are inconsistent.**
   - Some sections have an eyebrow label (HOW IT WORKS, WHAT YOU GET, TITAN AT A GLANCE) and Explore Intelligence and the FAQ don't.
   - Explore Intelligence is centred while every other heading is left-aligned.
   - Some headings use the serif-italic accent and "Four planning questions" and "Explore Intelligence" are all sans.
   - Heading sizes also vary. Set one H2 pattern and use it everywhere.
3. **Three sections say the same thing.** "Four planning questions" shows four cards, then a second row of three (Demand signals, Inventory awareness, Planner control) that restates them. "Not more dashboards" then repeats it again as Sense, Predict and Decide. The four-column and three-column rows in the same section also don't share a grid. Merge or cut.
4. **The faint rounded panel behind the Explore and FAQ sections** (edges near x≈28) is the same ghost box as in the hero. The section backgrounds also alternate between near-white and cool grey with a hairline, and the two tones are too close to read as intentional.

**Spreadsheet-to-decision slider**

5. **The default handle position hides the data.** The divider cuts the column header to "UNI" and the values to half-visible digits, so the one column that matters is unreadable. A white sliver with a stray grey bar sits between the divider and the Titan card, which looks like a leftover element. Start at 50/50 and clip at a column boundary.
6. **The cursor and the handle don't match.** The resize cursor shows over the whole panel, even on the Titan card's text, while the only visible affordance is the small handle. When the pointer is on the handle, the cursor's arrows sit on top of the handle's own arrows, so they double up. Check keyboard support too (role="slider", arrow keys).

**Explore Intelligence**

7. **The header is cramped and the tabs are inconsistent.** The heading and subtitle are only about 10 px apart. The inactive "Forecast" tab shows a leftover outline, which looks like a transition lag.
8. **The inventory bars have no common scale.** The target ticks sit at different positions in each row (roughly 50%, 52% and 65%), so bar lengths can't be compared. The 34-day "surplus" bar uses the same blue as "on track". The recommendation sentence is long, grey and hard to parse ("…upon Day 8 arrival (180 units remain at delivery)"). Make it a highlighted callout with the action first.
9. **The Risk Radar view is under-used.** The Day 08, Day 14 and Day 23 buttons and the axis labels are tiny, and the chart is small inside a big card with a lot of empty space. The second dip near Day 23 is unlabeled.
10. **The "Decision workspace preview ×" toast** appears at the bottom-right during this section. Its purpose is unclear, it has no action, and the close target is about 16 px. Remove it or give it a job.

**Cards, FAQ and footer**

11. **The hover and reveal behaviour is inconsistent.** The "Predict" card jumps about 8 px on hover while the "Four planning questions" cards move about 2 px. In one frame the "Connected by design" strip is stuck half-faded. FAQ rows shift text and icon a few px right on hover, which is a layout shift. The previously hovered row also keeps its grey fill while the cursor is already on the next one.
12. **The FAQ heading is oversized.** It wraps to four lines in a narrow column, leaves a large empty area below it, and the open item's blue bar sits square against a rounded card.
13. **The footer is hard to read.** The dark CTA band starts abruptly under the FAQ. The footer links are about 11 px in low-contrast grey on navy. "Privacy & Terms · FAQs" reads as one link, and the bottom padding is cramped.

I didn't evaluate mobile or tablet layouts, keyboard focus states, or reduced-motion behaviour, since the recording is desk   top-only.+