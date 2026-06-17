# Deploying

The game is plain static files (ES modules, relative paths), so it serves
correctly from any origin root with no build tooling.

## tailor.zone (SSO-gated, recommended)

> Requires this environment's **Network access** to be **Custom** with
> `tailor.zone` and `*.tailor.zone` in **Allowed domains** (keep the default
> package-manager list checked). Network policy is read at **session start**,
> so apply the change, then run this from a **fresh** session.

```sh
sh build.sh                                   # assembles ./site
curl -fsSL https://tailor.zone/cli/tailor.sh | sh
TAILOR_TOKEN=<your-token> tailor deploy ./site
# -> https://<name>.tailor.zone  (auto Google-SSO gated to Teamtailor accounts)
```

If `tailor` wants the token differently, `tailor deploy --help` shows the
flag (likely `--token` or the `TAILOR_TOKEN` env var). If a deploy fails on an
extra host (e.g. an object-storage upload URL), the error names it — add that
one line to **Allowed domains** too.

You can also skip the CLI and **drag a zip of `./site` onto the tailor.zone
upload page**.

## GitHub Pages (fallback)

`.github/workflows/deploy.yml` publishes to GitHub Pages on push. It needs a
one-time repo setting: **Settings → Pages → Build and deployment → Source:
"GitHub Actions"**. After that, re-run the workflow → `https://rikardwissing.github.io/maniac/`.
