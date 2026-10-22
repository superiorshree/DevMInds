# Pull request

## What changed

<!-- 1–3 sentences. Focus on why. -->

## Area

- [ ] Backend
- [ ] Extension
- [ ] Docs
- [ ] Config / CI

## How to test

<!-- Exact steps a reviewer can follow. -->

1.
2.

## Checklist

- [ ] `uvicorn app.main:app --reload` starts and `GET /health` returns `ok` (backend changes)
- [ ] `npm run build` succeeds and the extension loads unpacked (extension changes)
- [ ] I tested the steps above locally
- [ ] Screenshots / GIF attached (UI changes)
- [ ] **Touches the shared contract?** (types, schemas, `core/modes.py`) — Yes / No
        - If Yes: the whole team has been notified in the group chat
- [ ] No secrets, tokens or `.env` values committed
- [ ] Every new `.py` / `.ts` / `.tsx` file has the mandatory header comment

## PR size

- [ ] Under ~300 lines of diff (ping the lead if not)
