# Releasing

The nine npm packages (`@acunsoft/datatable-core`, `-http`, `-server`,
`-dom`, `-export`, `-vue`, `-react`, `-import` and `@acunsoft/datatable`) are released
together with one version, using
[Changesets](https://github.com/changesets/changesets). Nothing is published
automatically.

## For every user-visible change

```bash
npx changeset
```

Choose the bump (`patch`, `minor`; while the version is below 1.0 a breaking
change is a `minor`, see SPEC "Planned release approach") and describe the
change for users. Commit the generated `.changeset/*.md` with the change.

## Cutting a release

1. On an up-to-date `main`:

   ```bash
   npm run version-packages
   ```

   This applies the changesets: bumps the versions, updates the internal
   dependency versions and the lockfile, and writes each package's
   `CHANGELOG.md`. Review the diff, move the matching notes out of
   "Unreleased" in the root `CHANGELOG.md`, and commit
   (`chore: release 0.x.y`) through a pull request so CI runs.
2. Start the **Release** workflow by hand (Actions → Release → Run workflow,
   on `main`). A read-only job refuses to run while unversioned changesets
   exist and runs the end-to-end tests in Chromium, Firefox and WebKit (PHP
   too, for Livewire); then a second job, the only one with the publish
   rights, installs without install scripts and runs `npm run release` (check, test, build,
   `changeset publish` through npm trusted publishing, with provenance) and
   pushes the `@acunsoft/…@x.y.z` tags. No npm token is involved.

To publish from a machine instead: `npm login` (with 2FA), then
`npm run release`, then `git push --tags`. Use `npx changeset pack` to inspect
the exact tarballs first.

### First release (once)

npm trusted publishing can only be set up for a package that exists, so the
first version is published from a machine:

1. `npm run version-packages`, review, commit and push (`chore: release 0.1.0`).
2. `npm login` as `acunsoft` (2FA), then `npm run release` and `git push --tags`.
3. On npmjs.com, for each package: Settings → Trusted Publisher →
   GitHub Actions, organization or user `Acunsoft-Yazilim`, repository
   `acun-datatable`, workflow `release.yml`. (The repository moved from
   `kemaloskan` to `Acunsoft-Yazilim`: packages set up before the move must
   be changed to the new owner, or npm refuses the Release workflow.) Then set "Publishing access" to
   require 2FA and disallow tokens.

A trusted publisher that is created or changed stays "Pending validation"
until the Release workflow publishes through it, and npm drops it if that does
not happen within a few days (the deadline is shown next to it). So set up or
change trusted publishers on release day, right before running the Release
workflow, not ahead of time. A dropped one is simply created again.

Every later release goes through the Release workflow.

A package added later is in the same position: its first version is
published from a machine as above, and its trusted publisher is set up
afterwards. `@acunsoft/datatable` and `@acunsoft/datatable-server` went this
way with 0.5.0 (`npm run release` published all eight packages), and
`@acunsoft/datatable-import` with 0.6.0.

## Laravel package (Packagist)

Packagist reads `composer.json` from a repository root, so the
**Laravel package split** workflow mirrors `packages/adapter-laravel`, with its
history, to the read-only repository
[Acunsoft-Yazilim/datatable-laravel](https://github.com/Acunsoft-Yazilim/datatable-laravel)
on every push to `main` that touches it. Never commit there directly.

To release a Composer version, tag the monorepo and push the tag:

```bash
git tag laravel-v0.1.0 && git push origin laravel-v0.1.0
```

The workflow turns it into the tag `v0.1.0` in the split repository, which
Packagist reads as the version.

## One-time setup

- [x] The `@acunsoft` npm scope belongs to the project owner.
- [x] `repository`, `homepage`, `bugs` and `author` in each `package.json` and
      `composer.json`.
- [x] npm account `acunsoft` owns the `@acunsoft` scope (2FA with a security key).
- [x] First release from a machine: 0.2.0 on 2026-10-23. With a security key,
      `npm run release` opens a browser approval for the first package; tick
      "skip 2FA for 5 minutes" and the rest follow.
- [x] Trusted publishers on npmjs.com for all six packages ("Allow npm
      publish" on; publishing access: 2FA required, bypass tokens disallowed).
      Validated by 0.2.1, the first release from the Release workflow, with
      provenance. No `NPM_TOKEN` secret.
- [x] `@acunsoft/datatable` and `@acunsoft/datatable-server`: first publish
      (0.5.0, from a machine) on 2026-11-02.
- [ ] Trusted publishers for `Acunsoft-Yazilim/acun-datatable`: the six
      packages set up before the move still name `kemaloskan`, and the two
      new ones (and `-import`, first published with 0.6.0) have none. Do all nine on the next release day (see "First
      release" above) and publish through the Release workflow the same day;
      until then, release from a machine.
- [x] `SPLIT_TOKEN` repository secret: a fine-grained GitHub token owned by
      the `Acunsoft-Yazilim` organization, with "Contents: read and write" on
      `Acunsoft-Yazilim/datatable-laravel` only. Renewed there on 2026-11-02
      after the move.
- [x] `acunsoft/datatable-laravel` on Packagist, auto-updated from the
      mirror; first version v0.2.0 (tag `laravel-v0.2.0`) on 2026-10-23.
- [x] Packagist: repository URL set to `Acunsoft-Yazilim/datatable-laravel`
      after the move; v0.6.0 read from it on 2026-11-02.
