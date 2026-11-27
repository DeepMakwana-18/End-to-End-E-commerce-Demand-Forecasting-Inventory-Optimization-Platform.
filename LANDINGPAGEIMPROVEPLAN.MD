You are working on the existing TITAN AI landing page as a senior frontend engineer and product designer with strong typography, colour, data-visualisation, and interaction-design skills.

Implement the following redesign in the existing repository. Read this complete brief before editing.

PROJECT AND USER CONTEXT

TITAN AI is a supply-chain intelligence product. Its landing page presents a workflow that takes sales history into demand forecasts, inventory awareness, anomaly investigation, scenario testing, and replenishment decisions reviewed by a human planner.

The intended visitor needs to understand four questions.

1. What demand is coming?
2. Which products need replenishment?
3. What changed unexpectedly?
4. What happens if planning assumptions change?

The existing landing page contains these sections.

- Floating navigation
- Hero
- TITAN at a glance
- Demand signals / Inventory awareness / Planner control cards
- From spreadsheet to decision comparison
- Explore Intelligence with Forecast, Inventory, Risk Radar, and Scenario Lab
- Capabilities grouped into Sense, Predict, and Decide
- FAQ
- Closing call to action and footer

The owner has authorised improvements across all landing-page sections, including component reconstruction where necessary. The requested outcome is a coherent, polished blue-accented landing page.

The owner has already spent time reviewing alternatives. Use the specific direction below and proceed through implementation and verification. Resolve ordinary design and implementation decisions yourself.

REFERENCE CONTEXT YOU MUST UNDERSTAND

The owner likes two references for different reasons.

Supabase supplied palette reference
A small white swatch card contains several near-white/light-grey circles and one saturated mint-green circle. The requested transferable quality is the neutral foundation and restrained accent use. For TITAN, the brand accent becomes cobalt blue.

DataVision reference
The previous review described a clear product journey with a concrete input, understandable intermediate steps, and an explainable result. Its useful qualities are readable product demonstrations, clear controls beside substantial result areas, controlled visual hierarchy, and alternating quiet explanation with product proof.

Treat these descriptions as reference context. Inspect actual reference assets if they exist in the repository or attachments. Report any additional reference that was unavailable.

The latest supplied TITAN screenshots are the current visual evidence. They show a cream-and-mint theme with green accents, broad background gradients, large editorial headings, floating navigation, and interactive product previews.

The owner wants a considered redesign grounded in TITAN’s purpose. Generic visual presets must yield to this brief.

START WITH REPOSITORY INSPECTION

Before editing, identify and inspect the following.

- Framework, package manager, routing, and existing run commands
- Landing-page entry point and every section component
- Global CSS, design tokens, Tailwind configuration if present, and theme providers
- Existing fonts and icon library
- Chart components, chart data, SVG definitions, and sizing logic
- Forecast, Inventory, Risk Radar, and Scenario Lab state
- Comparison-slider implementation
- FAQ and mobile navigation behaviour
- Launch CTA destinations and existing product entry routes
- Relevant repository instructions and existing checks

Run the current page if possible. Inspect the current implementation and compare it against this brief. If the repository has evolved beyond the screenshots, adapt the fix to the current evidence and explain the difference.

Use the existing stack and reusable components. Scope theme changes to the landing page where global tokens also affect the application.

Maintain working routes, authentication entry points, data integrations, analytics hooks, and existing product behaviour as you refactor the presentation.

VISUAL DIRECTION

Create a neutral, light interface with charcoal typography and deliberate cobalt-blue accents.

Most visible surface area should be white or cool neutral grey. Use blue for primary actions, active selections, forecast data, and carefully chosen emphasis. Use amber for a planning gap or investigation state.

Use a restrained dark-charcoal closing section to end the page.

Reduce broad coloured washes, excessive nested containers, repeated badges, and oversized interface headings. Establish hierarchy through layout, type, and spacing before adding decoration.

COLOUR TOKENS

Define semantic tokens using the repository’s existing styling system.

Page canvas                 #FAFAFB
Primary surface             #FFFFFF
Secondary surface           #F3F4F6
Primary text                #181B22
Secondary text              #525866
Decorative border           #E2E5EA
Primary blue                #2454D6
Primary hover               #1D43AC
Selected background         #EAF0FF
Selected text               #17398A
Forecast confidence fill    #DCE7FF
Warning background          #FFF3D6
Warning text                #854A0E
Critical background         #FDECEC
Critical text               #A32929
Dark closing background     #131820
Dark primary text           #FFFFFF
Dark accent text            #B9CEFF
Dark supporting text        #CBD0DA

Map colour by meaning.

- Observed data uses slate.
- Predicted or simulated data uses blue.
- A selected control uses a pale-blue fill, dark-blue label, and clear indicator.
- A target marker uses charcoal.
- A planning gap or investigation state uses amber with a written label.
- Critical red requires a defined urgent condition.
- Decorative separators use light grey.
- Interactive boundaries and keyboard focus use sufficiently strong contrast.

Use ordinary text labels and shape or line-style differences alongside colour. Rising demand and falling demand describe direction. Determine severity separately.

White text against the primary blue has approximately 6.34:1 contrast. Selected text against the selected background has approximately 9.26:1 contrast. Verify rendered combinations, including opacity, gradients, disabled states, and hover states.

TYPOGRAPHY AND GEOMETRY

Inspect the existing font pairing first. Retain it if it supports this direction and is implemented correctly. If replacement is necessary, use Geist for interface/body text and Instrument Serif italic for selected editorial phrases.

Concentrate editorial italic emphasis in the hero and closing statement. Product controls, chart labels, and numerical findings should use a clear sans serif.

Use tabular numerals for changing values and aligned data.

Starting desktop type targets
- Hero heading around 64–80px
- Section headings around 36–48px
- Product-panel finding around 24–30px
- Body copy around 16–18px
- Important chart labels around 13–14px

Adapt these to actual font metrics and responsive widths.

Use a consistent content width around 1200–1280px with fluid side padding. A product preview may need additional width, but align its surrounding section deliberately.

Use a small radius scale, approximately 24px for large previews, 16px for cards, and 8–12px for compact controls. Reserve pills for short controls.

Apply restrained neutral shadows to the floating navigation and major demonstrations. Static content can use spacing and separators.

SECTION 1 — FLOATING NAVIGATION

Retain the compact floating navigation concept.

- White surface with a fine neutral border and restrained shadow
- Charcoal brand text with a blue brand accent
- Existing navigation labels and working destinations
- Solid cobalt Launch Titan AI button
- Pale-blue active navigation state with dark-blue text
- Visible keyboard focus
- Correct section scroll offsets beneath the sticky navigation
- Single-colour blue scroll progress if that feature exists
- Neutral scrollbar styling

Make mobile navigation fully usable with labelled controls, keyboard support, predictable closing behaviour, and appropriate focus management.

SECTION 2 — HERO

Retain the headline.

“See what’s coming.”
“Stay ahead.”

Set the first phrase in charcoal and the italic second phrase in cobalt. Remove the underline from the italic phrase.

Preserve the meaningful composition of copy beside a demand signal.

Reduce the current combination of concentric rings, multiple translucent planes, yellow illumination, green haze, and floating labels.

Use one restrained ice-blue plane behind the forecast illustration. Keep the copy area near-white.

Illustration treatment
- Historical observations and historical line in slate
- Future forecast in cobalt
- Clear visual transition into the forecast
- White recommended-action card with blue indicator
- Pale-amber stock-risk callout with dark amber text
- Readable dark values in supporting callouts
- A small plain-text illustrative-data note

Retain existing illustrative values only after checking their source and context.

Keep the primary CTA solid cobalt. Give the secondary action a quiet white or text treatment.

On mobile, place the visual below the copy and simplify annotation positioning. Keep the labels readable rather than proportionally shrinking the entire desktop composition.

SECTION 3 — TITAN AT A GLANCE

The current large “4 planning views” card and five-step decision loop repeat information later explained in the demonstrations. The five-step sequence also wraps awkwardly.

Consolidate this section into a compact introduction to four planning questions.

Forecast — What demand is coming?
Inventory — Which products need replenishment?
Risk Radar — What changed unexpectedly?
Scenario Lab — What happens if assumptions change?

Use white surfaces on a subtle neutral background, charcoal titles, and restrained blue icons.

Where these items are interactive, selecting one should scroll to Explore Intelligence and activate the corresponding view. Ensure keyboard access and sensible focus behaviour.

Move workflow explanation into How It Works so this overview has a clear purpose.

SECTION 4 — BENEFIT CARDS

The current cards are Demand signals, Inventory awareness, and Planner control.

Their separate teal, yellow, and green backgrounds create unnecessary visual categories.

Use matching white surfaces and consistent blue icon treatment. Align titles, body text, and supporting lines.

Preserve the human-review message. Present it as concise explanatory copy with a modest check icon.

If this row remains repetitive after the overview is simplified, consolidate its useful copy into the overview. Preserve the three benefits in the page content.

SECTION 5 — FROM SPREADSHEET TO DECISION

Keep the input/output comparison as a substantial product demonstration.

Use a secondary-grey section background.

Spreadsheet side
- White cells
- Light-grey table header
- Neutral grid lines
- Readable column labels and values

Titan result side
- Very pale blue backing
- White result cards
- Charcoal headline values
- Blue contribution bars

Comparison control
- Cobalt divider and handle
- Accessible name and keyboard operation
- Touch support
- Neutral instruction text with a blue interaction cue
- Initial position that reveals meaningful input and output

Keep Upload → Map → Forecast → Act as a compact workflow beneath the demonstration. Use consistent surfaces for all four stages.

At narrow widths, provide a Spreadsheet / Titan’s view switch or another accessible full-width presentation.

Verify existing claims such as CSV limits, forecasting methods, and explanation features against the actual product before changing their wording.

SECTION 6 — EXPLORE INTELLIGENCE SHARED STRUCTURE

Retain all four views.

The current outer sidebar takes excessive room and the inner panels repeat category labels, questions, decision pills, metadata badges, and explanatory headings.

Build a compact, clearly selected navigation control and a spacious result panel.

Each result panel should lead with
- The planning finding
- The relevant metric or comparison
- The chart or table
- The explanation and next review action

Use one shared illustrative-data note where appropriate.

Desktop navigation may use a narrower rail. Mobile navigation should use accessible tabs that remain reachable without page overflow.

Use semantic tab behaviour, active-state attributes, keyboard navigation, and visible focus. Keep the product preview stable when changing views while allowing content to grow at smaller sizes.

SECTION 6A — FORECAST

Suggested finding
“Demand is forecast to peak in week 10.”

Use the actual dataset to determine the displayed finding.

Chart rules
- Slate solid historical line
- Cobalt dashed forecast line
- Pale-blue confidence band
- Neutral grid
- Readable slate axes
- Forecast boundary aligned with its direct label
- Selected forecast point with blue fill and white outline

Generate the curve, selected marker, peak value, interval, week label, and tooltip from the same data source.

The supplied screenshot’s 1,840 peak annotation appears inconsistent with the plotted position. Investigate and correct the underlying mismatch.

Verify what “+18.4%” compares against. Identify that baseline in the explanation.

Give the chart useful space by reducing the introductory text above it.

SECTION 6B — INVENTORY

Lead with the SKU needing attention.

The supplied example shows SKU-204 with 11 days of cover against an 18-day target and a 320-unit recommendation.

Remove the oversized gap between the header and rows. Increase useful row height and action-text readability.

Display aligned fields for
- SKU and product name
- Days of cover
- Target
- Coverage visual
- Recommended action and timing

Use one common scale for days of cover. If the existing chart uses coverage-to-target ratios, label that ratio explicitly and apply it consistently.

Use charcoal target markers, grey tracks, blue ordinary coverage, and amber shortfall treatment.

Apply severity consistently across the row, action, and notice. Keep urgency grounded in the available data.

Provide a stacked mobile presentation with equivalent information.

SECTION 6C — RISK RADAR

Reconstruct this panel’s internal hierarchy.

The current screenshot has nested frames, a second selection column, small evidence text, and overlapping Day 23 labels.

Suggested selected finding
“Day 14 demand was 48% above baseline.”

Place the comparison directly below it
89 observed · 60 expected · +3.2σ

Use the verified values and consistent rounding.

Keep Day 08, Day 14, and Day 23 selectable using compact controls. Their selected state uses blue. Their investigation status uses separately labelled severity styling.

Give the deviation plot sufficient width. Keep labels outside collision zones and position them responsively.

Use a neutral expected-range band and charcoal baseline. Show threshold breaches with clear markers, labels, and appropriate warning colour.

Present the selected explanation below the chart in readable body text.

Retain uncertainty about causes. A promotion or channel change may be something to investigate. An anomaly alone does not establish its cause.

Selecting an event must update the headline, values, plot emphasis, evidence, and suggested investigation together.

SECTION 6D — SCENARIO LAB

Reconstruct the panel around the control and business consequence.

Suggested promotion finding
“A 20% demand increase reduces stock cover to 9.2 days.”

Show
- Baseline demand
- Simulated demand
- Available inventory
- Baseline and simulated coverage
- Planning threshold
- Additional quantity required under the stated assumptions

The supplied example uses
Available inventory = 660 units
Baseline demand = 60 units/day
Promotion uplift = 20%
Simulated demand = 72 units/day
Baseline cover = 11 days
Simulated cover = 660 / 72 ≈ 9.2 days
Planning threshold = 13 days
Additional quantity = 13 × 72 − 660 = 276 units

Keep calculation precision internally and round only for display.

Show baseline coverage, simulated coverage, and the target on the same scale.

Use grey for baseline, blue for simulation, charcoal for the threshold, and amber for the gap.

Place “276 additional units would restore 13 days of cover” beside the comparison.

Keep Promotion surge, Price adjustment, and Supplier delay available. Inspect and preserve their real models. Each scenario must update the relevant result and assumptions coherently.

The supplied upper chart says weekly demand while its labels use units/day. Correct the unit definition and plotting consistently.

Label the slider with its actual parameter and current value. Support keyboard input and readable limits. Announce updated summaries accessibly without excessive repeated announcements.

SECTION 7 — CAPABILITIES

Retain the Sense / Predict / Decide grouping and verified feature content.

Use three aligned white columns on a neutral surface. Set group titles in charcoal and use restrained blue stage indicators.

Remove the partially hidden circular connectors.

Align corresponding titles and feature rows. Apply consistent visual treatment across all features.

The supplied Reports & exports row is uniquely highlighted. Inspect whether this represents hover, selection, or decoration and implement a consistent state rule.

Consolidate repetitive “Connected by design” copy where it duplicates the section introduction.

SECTION 8 — FAQ

Retain the split composition and genuine FAQ content.

Reduce the display heading to a normal section scale.

Use
- White accordion surface
- Charcoal questions
- Slate answers
- Neutral dividers
- Subtle blue expanded-state indicator
- Plus and minus controls

Use semantic buttons, aria-expanded, associated answer regions, visible focus, and comfortable touch targets.

Remove the large gradient treatment inside the open answer.

Preserve verified facts about uploads, forecasts, scenarios, exports, and illustrative data.

SECTION 9 — CLOSING CTA AND FOOTER

Retain the message.

“Less guessing.”
“Better decisions.”

Use charcoal #131820 behind it. Set the first line white and the italic second line #B9CEFF.

Use readable light-grey supporting copy and a cobalt launch button.

Remove the broad green glow. Keep the headline scale balanced with the action beneath it.

Consolidate the three tiny benefit chips into a useful sentence if they repeat information already demonstrated.

Use readable light-grey footer links, a neutral divider, and the updated logo accent. Verify all destinations.

DATA CONSISTENCY

Review the relationship between these existing examples.

- 320-unit replenishment recommendation
- 276-unit promotion scenario gap
- 18-day coverage target
- 13-day review threshold
- 8-day lead time
- 5-day safety allowance

These can describe different assumptions. State their meaning close to the result and derive values from the relevant model.

Find the source of the 320-unit recommendation. Preserve it when justified by its example. If it is arbitrary or conflicts with the displayed assumptions, correct the illustrative example and explain the change.

Use explicit labels for historical observations, predictions, simulated outcomes, recommendations, and illustrative data.

RESPONSIVE AND ACCESSIBILITY REQUIREMENTS

Review at 375px, 768px, 1024px, and 1440px widths.

- Prevent page-level horizontal overflow
- Preserve legible chart labels and explanatory text
- Collapse multi-column content sensibly
- Keep every tab and scenario reachable
- Provide comfortable touch targets, preferably 44px for primary controls
- Support keyboard navigation throughout
- Keep visible focus on light and dark surfaces
- Respect reduced-motion preferences
- Ensure sticky navigation clears anchor targets
- Provide chart text summaries or accessible equivalents
- Verify contrast for ordinary text and meaningful control boundaries
- Ensure content remains usable with zoom and longer text

Use short purposeful transitions. Keep primary content visible if animation scripts fail. Avoid adding motion dependencies when existing CSS or utilities are sufficient.

IMPLEMENTATION AND VERIFICATION

Work through the page in this sequence.

1. Inspect the repository and run the current landing page.
2. Establish scoped colour, type, spacing, and component tokens.
3. Update shared navigation and controls.
4. Implement the hero.
5. Rebuild the four Intelligence views and verify their data.
6. Refine overview, benefits, comparison, capabilities, FAQ, and closing section.
7. Review responsive layouts and interactions.
8. Run appropriate existing checks and the production build.
9. Capture and inspect the completed sections.
10. Fix visible defects before reporting completion.

Search for residual emerald, mint, cream, yellow-gradient, and deep-green brand styling in the landing page, including SVG fills, inline styles, shadows, progress indicators, and chart constants. Replace each according to its role.

Keep legitimate warning colours tied to actual warning states.

Use existing chart libraries and icons where they are suitable. Keep precise charts and interactive interfaces implemented in code.

Treat screenshot concerns as evidence to investigate. Report which were confirmed in the current implementation.

COMPLETION REQUIREMENTS

Provide a concise implementation report containing
- The sections changed and their concrete improvements
- Modified files
- Verified interactions
- Data or copy corrections
- Build and check results
- Desktop and mobile screenshots or available preview evidence
- Any remaining limitation with its specific cause

The finished result should communicate TITAN’s planning workflow clearly, use the specified neutral-and-blue colour system consistently, and make each interactive demonstration readable and usable.