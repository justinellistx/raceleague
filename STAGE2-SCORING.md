# Stage 2 Scoring — Lone Star Rubbin' League

Stage 2 = `stages.stage_number = 2` (race_number 13–24). All scoring lives in the
**Supabase project `awdzzzcbxeafakeilxfn`** as SQL functions. Stage 1 is never touched.

## Rules implemented

- **Finish points:** P1=45, P2=35, P3=30, then −1 per position (P4=29, P5=28 …). `lsrl_stage2_finish_points(pos)`
- **Per-race +2 bonuses:** most laps led, fastest lap, pole (lowest start position), lowest incidents. Ties: every tied driver earns it.
- **In-race stage points:** entered in `race_stage_results` (2 cautions/race, top 5 = +5/+4/+3/+2/+1). Summed into a driver's bonus for that race.
- **Incident penalty (uncapped):** −1 at 20, −2 at 30, −3 at 40, −4 at 50 … `lsrl_stage2_incident_penalty(inc)`
- **End-of-stage +3 bonuses:** most laps led, most fastest laps, lowest total incidents, most poles (across all Stage 2 races). Stored in `lsrl_stage_end_bonuses`, added to standings AFTER drops.
- **Drops:** worst 3 of 12 per stage (same as Stage 1), applied in `v_iracing_stage_standings`.
- **Teams:** Stage 2 teams live in `teams` with `stage_number = 2` (Ellis+Becker, Domino+Green, Carnes+Ramsey, Stancil+Kunnemann; Ronald Ramsey independent).

## Workflow per Stage 2 race

1. Insert the race into `races` with the Stage 2 `stage_id` and `race_number` 13–24.
2. Insert finishing results into `race_results` (finish_position, start_position, laps_led, incidents, fastest_lap_time …). Leave the point columns at 0.
3. Insert the two in-race stage top-5s into `race_stage_results`.
4. Score it: `select lsrl_recompute_stage2_race('<race_id>');`
5. At stage end (or any time): `select lsrl_recompute_stage2_end_bonuses();`

`select lsrl_recompute_all_stage2();` rescatters all Stage 2 races at once. All functions are
idempotent — safe to re-run after editing raw results.

## Notes / not yet built

- There is **no admin upload UI** in this repo (the plan's `UploadRace.jsx` doesn't exist here).
  Steps 1–3 above are done via SQL / the Supabase table editor until an entry UI is built.
- The race-detail page does not yet display in-race stage positions separately; per-race totals
  already include them via `total_points`.
- `.env.local` was repointed to this project for local dev. Update the same
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your Vercel project to deploy,
  and replace the stale `SUPABASE_SERVICE_ROLE_KEY` if the broadcast API route is used.
