# Changelog

## [1.2.0](https://github.com/scepbjoern/comp-act-diary/compare/v1.1.0...v1.2.0) (2026-02-25)


### Features

* add audio attachment support to journal entries with transcript persistence ([298d9c7](https://github.com/scepbjoern/comp-act-diary/commit/298d9c70736b90ca4fdbed58fef5d14982792e84))
* add bundled migration script for orphaned audio attachments ([af69fad](https://github.com/scepbjoern/comp-act-diary/commit/af69fad5bca9ac0f6963c1179fb1ab98c739e218))
* add JournalEntryType CRUD API and UI management with template system integration ([152ceb4](https://github.com/scepbjoern/comp-act-diary/commit/152ceb42b3ac075bf77db614ec4aba781ae958ed))
* add multi-audio support to journal entries with per-attachment transcripts ([04e5dbf](https://github.com/scepbjoern/comp-act-diary/commit/04e5dbfbb8ccae4c1aebe6e28f8a5b9e570cd7ba))
* add photo lightbox and improve journal entry card display ([f31ab97](https://github.com/scepbjoern/comp-act-diary/commit/f31ab976037bfadc60886c787aa96fdd40872e54))
* add pipeline step selection modal and image generation to AI pipeline ([faddbe1](https://github.com/scepbjoern/comp-act-diary/commit/faddbe1ede084aa847fdd2ed87cd2dfdefc0b4d3))
* add system template sync to entrypoint and expand sync-system-types.sql ([bee542f](https://github.com/scepbjoern/comp-act-diary/commit/bee542f8cd3c59ac7d51afa4ad2844a3c8562670))
* implement automatic script bundling for all scripts ([4279d05](https://github.com/scepbjoern/comp-act-diary/commit/4279d05ec8577f887ab4f8317783a56e9071f134))
* implement unified journal entry system (Phases 1-2) ([de9346d](https://github.com/scepbjoern/comp-act-diary/commit/de9346de2e2638110b50ec207a77075e39f07650))
* integrate Phase 2+3 features into journal page - tasks, modals, and template-based AI config ([e0b810c](https://github.com/scepbjoern/comp-act-diary/commit/e0b810c45a172dd2337ef89acc4a63a89b97190f))
* **journal:** Dynamic Templates Feature Complete ([628e0a0](https://github.com/scepbjoern/comp-act-diary/commit/628e0a00534de68ebeabdcf0a5e244f2839dd13a))
* **journal:** Phase 4-5 Audio-Konsolidierung & Phase 6 UX-Verbesserungen ([530f50d](https://github.com/scepbjoern/comp-act-diary/commit/530f50dae21ac556ab127fbb56e0596afbff4663))
* migrate home page to unified journal entries (Phase 6) ([c5b6300](https://github.com/scepbjoern/comp-act-diary/commit/c5b63007fe9e9976fd1fa12cd88c24495e8c3cad))
* migrate journal pages to unified JournalService API ([bfcdd68](https://github.com/scepbjoern/comp-act-diary/commit/bfcdd68c1743d5f64b89824730d4bf863b4a78e6))
* rebuild DiarySection as self-contained component with full Journal parity ([fc9cae3](https://github.com/scepbjoern/comp-act-diary/commit/fc9cae3c9996e6a9a2e31a869dd99e97fb94cff4))


### Bug Fixes

* add .js extension to journalEntryAccessService import in migration script ([be267b6](https://github.com/scepbjoern/comp-act-diary/commit/be267b6b11a4717049d2957c80bfacd86f5fc1e8))
* add lib directory to Docker image for migration script dependencies ([9c7a2ca](https://github.com/scepbjoern/comp-act-diary/commit/9c7a2ca664bb2b643171ec09a664f3c6d0c805af))
* four homepage bugs after Phase 6 migration ([5379720](https://github.com/scepbjoern/comp-act-diary/commit/537972098b4a0c2ef347a4709ba40a127e031a28))
* P2 collapse/expand and P3 OCR image path ([d20cc29](https://github.com/scepbjoern/comp-act-diary/commit/d20cc294a8f66bfcce76ddadcb151b05066facb9))
* photo thumbnails, collapse toggle, referenceDate TimeBox resolution ([df4b1c4](https://github.com/scepbjoern/comp-act-diary/commit/df4b1c41cae1b2071a87145a816e2118ce7b314e))
* remove .js extensions from relative imports in journalEntryAccessService ([8562966](https://github.com/scepbjoern/comp-act-diary/commit/856296623245abae191a3ab300892fe7b3c57153))
* resolve merge conflicts and implement audio transcription with drag-and-drop field ordering ([08f3a05](https://github.com/scepbjoern/comp-act-diary/commit/08f3a0570ad5588448f4ac3694c298a543426378))
* switch script bundler from ESM to CommonJS format ([01874eb](https://github.com/scepbjoern/comp-act-diary/commit/01874eb15f4d6b6c781bcf200004270db61a20ad))
* update bundled script file extension from .js to .cjs in documentation and build script ([e93c1f3](https://github.com/scepbjoern/comp-act-diary/commit/e93c1f3dc7a9d3155baf0b558c314d7acb626fdc))

## [1.1.0](https://github.com/scepbjoern/comp-act-diary/compare/v1.0.0...v1.1.0) (2026-01-28)


### Features

* add originalTranscriptModel field to track transcription model used ([44ce18c](https://github.com/scepbjoern/comp-act-diary/commit/44ce18c704d155a713983a2ef19666447ea3ae3c))


### Bug Fixes

* add complete Prisma CLI dependency tree to production Dockerfile ([b226bfa](https://github.com/scepbjoern/comp-act-diary/commit/b226bfa96843469cbab1ca1c6204af4be36f8175))
* add missing c12 transitive dependencies to production Dockerfile ([525c2f9](https://github.com/scepbjoern/comp-act-diary/commit/525c2f9666a19e110c581235311585d9667dcfca))
* add transcriptionModel field to user settings and improve image generation settings persistence ([4cba8e9](https://github.com/scepbjoern/comp-act-diary/commit/4cba8e9df6b7e8c314a919b18ab99a70cfc27ded))
* improve Prisma CLI setup in Dockerfile and streamline test environment documentation ([113ba86](https://github.com/scepbjoern/comp-act-diary/commit/113ba865968824f7ac05207ad3cfcd10035646c0))

## 1.0.0 (2026-01-22)

### Features

* add AI image generation with Flux models and customizable prompts ([f8266ef](https://github.com/scepbjoern/comp-act-diary/commit/f8266ef3d81140352374994ea3063fe083bc04b4))
* add alternative names support for mention detection in contacts ([9079835](https://github.com/scepbjoern/comp-act-diary/commit/907983536bf4bda4a01c379d82c266dcc0c10363))
* add audio input level meter and cancel button to microphone recording interface ([0880220](https://github.com/scepbjoern/comp-act-diary/commit/08802205df571eb289551e3f21f3b4234202e6a2))
* add batch mention detection to batch processing system ([0e76f8a](https://github.com/scepbjoern/comp-act-diary/commit/0e76f8aaf2549d42eb00d22008a7198a1654df4c))
* add calendar event visibility toggle and inline editing with location autocomplete and AI regex helper ([1bfe42b](https://github.com/scepbjoern/comp-act-diary/commit/1bfe42bb8d8d73dda079c8943adc788cb91256f3))
* add comprehensive task management with inline editing, filtering, and grouping ([1b37508](https://github.com/scepbjoern/comp-act-diary/commit/1b37508b0173c5cf6256d6a0c692b64633e42635))
* add Deepgram Nova-3 transcription support with per-model language configuration ([02d7c88](https://github.com/scepbjoern/comp-act-diary/commit/02d7c88a3f9285283c025ed88b9f73ea5209dcd9))
* add edge navigation bars for date navigation on main page ([e8b6b61](https://github.com/scepbjoern/comp-act-diary/commit/e8b6b6117815536895843ad780f4486d48b3a099))
* add global search with full-text search support and result highlighting ([c2259df](https://github.com/scepbjoern/comp-act-diary/commit/c2259df6caf7f7ad538baf71683d9e4993938d21))
* add Google Contacts sync foundation and expand PRM data model ([98a6870](https://github.com/scepbjoern/comp-act-diary/commit/98a68709025f9e7209b1690db6269c0a762ebf8d))
* add location tracking with OwnTracks, Google Timeline import, and Mapbox geocoding ([9d695b0](https://github.com/scepbjoern/comp-act-diary/commit/9d695b0cc92646765bc8596aa8bf746d4793b3ea))
* add locations page link to navigation menu ([b3ff056](https://github.com/scepbjoern/comp-act-diary/commit/b3ff056c0e06c85a43b00da1032f535b59251fb9))
* add occurredAt and capturedAt timestamp fields to journal entries and media assets ([077d998](https://github.com/scepbjoern/comp-act-diary/commit/077d9980c202bdf639eb3113df87dfa56ff27708))
* add OCR support with Mistral Pixtral for image and PDF text extraction ([c261f92](https://github.com/scepbjoern/comp-act-diary/commit/c261f92e0c7db2ca2f0d607ab32a333c06c4f3e3))
* add one-time V2 production migration with manual SQL steps and originalTranscript field ([1146efb](https://github.com/scepbjoern/comp-act-diary/commit/1146efbebae959339477c27ced177df70561978a))
* add original text preservation with portal z-index fix - Use React portal for modal rendering - Add OriginalTextButton component - Implement copy to clipboard - Allow restoring original text ([06447c1](https://github.com/scepbjoern/comp-act-diary/commit/06447c1a44dbeb3cf2701810a66027edbe8523c0))
* add passcode protection with configurable timeout and automatic pause during recording ([35adbe1](https://github.com/scepbjoern/comp-act-diary/commit/35adbe1868e3b8f317ebb5dee554e81e37b2c726))
* add read mode toggle to hide editing controls across the application ([b3f2a35](https://github.com/scepbjoern/comp-act-diary/commit/b3f2a355de2b9bdc236e62dbd23585eea4644457))
* add task deletion with confirmation and improve journal entry linking ([9aa8d79](https://github.com/scepbjoern/comp-act-diary/commit/9aa8d7952953c7e631d4d832ac417d8aa9d6a0ec))
* **audio:** add time tracking, re-transcription, and improved audio lifecycle management ([09da619](https://github.com/scepbjoern/comp-act-diary/commit/09da619f38802103d0912be650cba12a2ba84844))
* calendar-sync first implementation and refactor: LocationWebhook to WebhookTokenService ([bc3201b](https://github.com/scepbjoern/comp-act-diary/commit/bc3201b8e47fac946941e7d708318a5bc2aeb88c))
* **coach:** add speech input, diary context, and Together model picker ([6134c07](https://github.com/scepbjoern/comp-act-diary/commit/6134c07f3a1f158eb714dbb481d405cc44c37df3))
* **deploy:** add configurable environment variables for LLM, image, and audio processing ([cdb7908](https://github.com/scepbjoern/comp-act-diary/commit/cdb7908139a7fd60720b3b9c2c9463eb8f514ae5))
* **diary:** add rich text editor, auto-title generation, and improved file organization ([656eecd](https://github.com/scepbjoern/comp-act-diary/commit/656eecdba4c00b9722cb26c87e0d2130c02c3361))
* **diary:** add title field with auto-generation, improve editor UX, and enhance image handling ([6444c27](https://github.com/scepbjoern/comp-act-diary/commit/6444c272c4ae3a3f185caaac2469725efee5a5fb))
* **docker:** add dynamic UID/GID support and enhance audio upload debugging ([f411280](https://github.com/scepbjoern/comp-act-diary/commit/f4112800c968daffdd0607ef2c45e5ed40ebe421))
* **editor:** add fullscreen mode, improve MDX styling, and persist transcription model in DB ([0a5513d](https://github.com/scepbjoern/comp-act-diary/commit/0a5513dcc82090e924145444ceff45418911a3ce))
* **editor:** fix spoiler directive rendering and add title field to notes API ([f74c8b6](https://github.com/scepbjoern/comp-act-diary/commit/f74c8b6dce0bb29d6dc45dbbe88cecf2ea3a43b4))
* fix mention interaction dates to use TimeBox startAt instead of entry createdAt ([9277715](https://github.com/scepbjoern/comp-act-diary/commit/92777159e948507529a68b85bd54bea3950b1dfe))
* fix modal z-index stacking issues with portal rendering and CSS overrides ([a0bfc8c](https://github.com/scepbjoern/comp-act-diary/commit/a0bfc8c11baef83077b327a10f2499c7ed934702))
* fix search navigation to update date state when navigating to diary entries ([37fa1a7](https://github.com/scepbjoern/comp-act-diary/commit/37fa1a7d84b08631dccd0ac01cf35865786b54d6))
* implement Contacts feature ([902a3de](https://github.com/scepbjoern/comp-act-diary/commit/902a3de4c1d00f95622cb40e40b3778f8f61c1e9))
* migrate LLM model management from env vars to database with multi-provider support ([66deb6b](https://github.com/scepbjoern/comp-act-diary/commit/66deb6bcec4c54f6ae9788db11c6ab2c030a0651))
* redesign original transcript as section below editor - Fix portal modal rendering (use explicit styling instead of modal-box) - Move original transcript from toolbar to dedicated section below editor - Add inline actions: Anzeigen, Kopieren, Wiederherstellen - Style similar to audio section for consistency ([455451a](https://github.com/scepbjoern/comp-act-diary/commit/455451a047fc308d4c9f1df0fac3efdff93a1134))
* refactor navigation to icon-only layout with visual grouping and add coach button to header ([149ab1c](https://github.com/scepbjoern/comp-act-diary/commit/149ab1c3333ac8a21027e30f1a53eb2d03bf776f))


### Bug Fixes

* add @types/react-dom for React portal type definitions ([63dcc51](https://github.com/scepbjoern/comp-act-diary/commit/63dcc51b5b68f24e54e3d1689895f5d2a5083583))
* add z-index to modal and debug logging for Übernehmen button ([9c232a4](https://github.com/scepbjoern/comp-act-diary/commit/9c232a4b8bc4545c8f8c96ce9a4ff1d1327f8554))
* connect originalDiaryText prop to existing state management in parent component ([c6ae085](https://github.com/scepbjoern/comp-act-diary/commit/c6ae085b63800ddb921b969207e4999800393f09))
* copy .prisma directory containing WASM files for runtime ([b7ee264](https://github.com/scepbjoern/comp-act-diary/commit/b7ee264551a1114a5119684923f1371c341fd068))
* copy Prisma CLI to runtime stage for migrations ([bbdcd3d](https://github.com/scepbjoern/comp-act-diary/commit/bbdcd3d321cfb2c69537ded65b6e2bed1915bdd0))
* correct API response key for text improvement (improved vs improvedText) ([d72ed5c](https://github.com/scepbjoern/comp-act-diary/commit/d72ed5c46d9ca40c1c14efcf53fba40793820971))
* defer editor key increment to ensure state update completes first ([9c82bf1](https://github.com/scepbjoern/comp-act-diary/commit/9c82bf1e5af930316204f35bb49d8b92b24eee2d))
* improve initial page load performance and handle auth edge cases ([e7c3614](https://github.com/scepbjoern/comp-act-diary/commit/e7c3614825e4febbfd151b406b1f379302edbcd0))
* install Prisma directly in Alpine to ensure all runtime files are available ([64b479a](https://github.com/scepbjoern/comp-act-diary/commit/64b479a6c6533dd1d08cf1e11591271596dd21c8))
* properly configure Mapbox token as build-time environment variable ([f1b72cd](https://github.com/scepbjoern/comp-act-diary/commit/f1b72cd2b7bc74daa078b459b8845ef22a7dfc0f))
* remove --legacy-peer-deps from second npm ci in build stage (ROOT CAUSE) ([8aeb9e1](https://github.com/scepbjoern/comp-act-diary/commit/8aeb9e1543eb9846ecad77e16bbac48c1e92db3a))
* remove --legacy-peer-deps to test if it's causing Prisma version override ([97f0f5c](https://github.com/scepbjoern/comp-act-diary/commit/97f0f5c8075d704b825c2e9e317e11a8c1d94f34))
* remove git debug command (not installed in container) ([c2247c3](https://github.com/scepbjoern/comp-act-diary/commit/c2247c35c8e2d3ea2922f2820f794cccf6ca8d6d))
* resolve final TypeScript return type mismatch for onRetranscribeAudio ([75e4523](https://github.com/scepbjoern/comp-act-diary/commit/75e45234b6bcbc6992921cd057914fe38a8b667e))
* resolve TypeScript lint errors - convert null to undefined - fix onRetranscribeAudio signature mismatch ([c88cf21](https://github.com/scepbjoern/comp-act-diary/commit/c88cf2188b83c9de60c14ce0865a14bc8117b81b))
* standardize icon sizes and improve audio recording UI consistency ([c94f1cb](https://github.com/scepbjoern/comp-act-diary/commit/c94f1cbb217a96b13649c08bd701422feccca9c8))
* use local Prisma from node_modules instead of npx cache (REAL ROOT CAUSE) ([088d11d](https://github.com/scepbjoern/comp-act-diary/commit/088d11da246f40afa03c2f71e79adf737ba22a93))
