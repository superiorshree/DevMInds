# Demo Checklist

Rehearse this end to end before you're on stage. Aim for a smooth 5-minute run.

## 1. Choose the demo repo

Pick **one small public repo** that is easy to explain:

- [ ] Clear, short `README.md`
- [ ] A handful of open issues (so good-first-issues look real)
- [ ] At least one merged PR to show contribution history
- [ ] Small enough that the architecture diagram isn't a hairball
  (< ~30 files is ideal)
- [ ] Analysis completes in a few seconds on stage

Record your choice here:

```
Demo repo:  <owner>/<name>
URL:        https://github.com/<owner>/<name>
```

> The repo is still a TODO — confirm it once the analyzer works, then fill in
> the block above.

## 2. Company-mode fixtures

- [ ] A matching **Jira project** (a few issues linked to the demo repo).
- [ ] A matching **Confluence space** (one onboarding page).
- [ ] A **Slack channel** you can post the architecture summary to
  (e.g. `#demo`), and the bot invited to it.
- [ ] A **private repo** the signed-in account can actually access.

## 3. Test the real sign-in flow

- [ ] GitHub OAuth sign-in works in a fresh browser profile.
- [ ] `GET /api/auth/me` returns the signed-in user.
- [ ] The **private repo** loads through the real sign-in flow (not mocks).
- [ ] Logging out clears the session.

## 4. Test panel widths

The side panel must look good anywhere from ~350px to ~75% of the screen.

- [ ] Narrow (~350px): no clipped text, no horizontal scroll, diagram still readable.
- [ ] Default width: comfortable reading, tabs wrap sensibly.
- [ ] Wide (~75%): layout stretches with flex/grid, not fixed widths.

## 5. Keep a GitHub-only fallback

Demo day wifi dies. Prepare for it:

- [ ] Extension is built (`npm run build`) and loads unpacked.
- [ ] Tabs render from `extension/src/mocks/mockData.ts` with no backend.
- [ ] A second demo repo that is **public only**, no Jira/Confluence/Slack needed.
- [ ] Backend already running locally (`uvicorn app.main:app --reload`) so a
      restart is one command.
- [ ] Screenshots / a short GIF of the company-mode features as a last resort.

## 6. Demo script (in order)

**Part A — Open Contributor mode (public repo, GitHub only)**

1. Open the demo repo on github.com, click the DevMinds icon → side panel opens.
2. Show the **Overview** tab: what this repo is, in one plain-English paragraph.
3. Show the **Architecture** tab: technologies, entry points, the diagram.
4. Show the **Contribute** tab: setup steps, rules, good-first-issues, maintainers.
5. Ask a question in **Ask AI** ("where do I add a route?") and show the answer
   with its source cards.

**Part B — Company Employee mode (private repo + integrations)**

6. Switch to **Company Employee** with the mode switcher. Note the tabs change:
   Contribute disappears, Context appears, the integration drawer appears.
7. Open a **private repo** and show its analysis (sign-in flow already done).
8. Show the **Context** tab: Jira issues + Confluence pages linked to the repo.
9. Open **Integration Settings**, show connection status.
10. Use **Slack share** to post the architecture summary to `#demo`.
11. Close on the golden rule: *the backend verifies facts, the AI explains them,
    the extension just displays them.*

## 7. Pre-demo checklist (day of)

- [ ] Full run-through at least twice, timed.
- [ ] Backend up, extension built and reloaded in Chrome.
- [ ] Signed in to GitHub, Jira, Confluence, Slack.
- [ ] Demo repo analysis cached (run it once before going on stage).
- [ ] Fallback repo + screenshots ready.
- [ ] Laptop on power, Chrome window pre-opened, phone hotspot as backup wifi.
- [ ] Team knows who drives and who talks.
