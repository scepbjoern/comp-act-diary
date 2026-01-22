# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

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

## [1.4.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v1.3.0...v1.4.0) (2025-10-15)


### Features

* copy previous phase when creating new day entry ([88a7c0e](https://github.com/scepbjoern/fairment_Darmkur_App/commit/88a7c0e93a94e1b188fd4bc41702fa346ac5b493))

## [1.3.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v1.2.0...v1.3.0) (2025-09-19)


### Features

* add color-coded sparklines for symptom and stool tracking visualizations ([a92af71](https://github.com/scepbjoern/fairment_Darmkur_App/commit/a92af710adff97145714d9dcce63665cc433d7e4))
* add stool-specific color scheme to sparkline visualization ([bc1212d](https://github.com/scepbjoern/fairment_Darmkur_App/commit/bc1212d0b206e8562adb269618838b644ea2d646))


### Bug Fixes

* treat bristol value 99 as "no stool" and exclude from analytics calculations ([ed8e7f1](https://github.com/scepbjoern/fairment_Darmkur_App/commit/ed8e7f1d6babdcf394e7234deededbd24d37e549))

## [1.2.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v1.1.0...v1.2.0) (2025-09-17)


### Features

* add icon support for habits and symptoms with default icons and per-user overrides ([df783a2](https://github.com/scepbjoern/fairment_Darmkur_App/commit/df783a2ff3d0c55cb57742664fbf0cd4c5b2ab5b))
* add icons to page headers and section titles ([e3e5161](https://github.com/scepbjoern/fairment_Darmkur_App/commit/e3e51616d58fdcde921d012b6c3458df1acddc78))
* add sparklines and yesterday values to symptoms, stool and habits ([eee0243](https://github.com/scepbjoern/fairment_Darmkur_App/commit/eee0243001c3005dca7abb4cfe9e6c3c8c6bd18d))
* add sparklines, yesterday indicators, and icon customization to help page ([62c41ae](https://github.com/scepbjoern/fairment_Darmkur_App/commit/62c41ae949aadd041da4d820f4b07fca696f6140))
* add sticky save bar and toast notifications for unsaved changes ([1e169d7](https://github.com/scepbjoern/fairment_Darmkur_App/commit/1e169d7af7c1150188f5d717f2464c9bcfc99a9c))
* improve save feedback with inline confirmation and green buttons ([22367d1](https://github.com/scepbjoern/fairment_Darmkur_App/commit/22367d1ca7925cdf6dc127442c883e8fd3e9f5d6))
* **ui:** enhance symptoms and habits organization ([6adbbe7](https://github.com/scepbjoern/fairment_Darmkur_App/commit/6adbbe705155e06977b0e36661415378afda56f5))

## [1.1.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v1.0.1...v1.1.0) (2025-09-15)


### Features

* add DELETE endpoints and clear functionality for day entries and symptoms ([365f16d](https://github.com/scepbjoern/fairment_Darmkur_App/commit/365f16d2ebf6593fe0d93d69fa82ee75be43a27a))
* add draft state and manual save for symptom tracking ([2bf0d66](https://github.com/scepbjoern/fairment_Darmkur_App/commit/2bf0d6605c98e69da1d61169986af0860bc08c1c))
* add optional weight tracking to reflections with decimal precision ([887c814](https://github.com/scepbjoern/fairment_Darmkur_App/commit/887c8143faa6e9b67b63751990b489901e1b1a95))

## [1.0.1](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v1.0.0...v1.0.1) (2025-09-12)


### Features

* add OpenAI transcription env vars to docker-compose config ([06e70a3](https://github.com/scepbjoern/fairment_Darmkur_App/commit/06e70a35c7ff59a00d5fa84425db4eafb75365f0))


### Bug Fixes

* use createRequire instead of JSON import assertions for better compatibility ([d717333](https://github.com/scepbjoern/fairment_Darmkur_App/commit/d717333f5efcf67ff35dc1f320a6bd4fc1984812))

## [1.0.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v0.3.0...v1.0.0) (2025-09-12)


### Features

* add edit mode and delete functionality for remarks section ([0fa6c89](https://github.com/scepbjoern/fairment_Darmkur_App/commit/0fa6c893708b05a77b48ff7e6b7c8cf33ad923ab))
* add mobile user avatar menu with profile and logout options ([0cd21c6](https://github.com/scepbjoern/fairment_Darmkur_App/commit/0cd21c6661fb6346f6a07712f277ce913b6e429a))
* add voice transcription inputs with OpenAI API integration ([ceed4ee](https://github.com/scepbjoern/fairment_Darmkur_App/commit/ceed4ee34749f8f01044c9939e9d2d226508f710))

## [1.0.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v0.4.0...v1.0.0) (2025-09-12)
Main release after
refactor: use getPrisma() factory instead of direct prisma import
feat(nav): vereinheitlichte Farben Light/Dark + Hover
feat(mobile): Links-Submenü collapsible + text-sm
fix(profile-menu): Outside-Click schließt Menü nicht vor Click-Handlern
feat(day): Titel „Tagebuch D.M.YYYY“ (ohne führende Nullen)

## [0.4.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v0.3.0...v0.4.0) (2025-09-12)


### Features

* add edit mode and delete functionality for remarks section ([0fa6c89](https://github.com/scepbjoern/fairment_Darmkur_App/commit/0fa6c893708b05a77b48ff7e6b7c8cf33ad923ab))
* add mobile user avatar menu with profile and logout options ([0cd21c6](https://github.com/scepbjoern/fairment_Darmkur_App/commit/0cd21c6661fb6346f6a07712f277ce913b6e429a))
* add voice transcription inputs with OpenAI API integration ([ceed4ee](https://github.com/scepbjoern/fairment_Darmkur_App/commit/ceed4ee34749f8f01044c9939e9d2d226508f710))

## [0.3.0](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v0.2.1...v0.3.0) (2025-09-12)


### Features

* add version number and social links to app footer ([5a9bcfc](https://github.com/scepbjoern/fairment_Darmkur_App/commit/5a9bcfc074d790c4c8ad6f69c2d4d28d3d150c0d))

## [0.2.1](https://github.com/scepbjoern/fairment_Darmkur_App/compare/v0.2.0...v0.2.1) (2025-09-10)

## 0.2.0 (2025-09-10)


### Features

* add automated database backup service with retention policy ([ebb8775](https://github.com/scepbjoern/fairment_Darmkur_App/commit/ebb8775a9ccd2b8b215633abeec0cb5a426fa45e))
* add camera capture option for photo uploads alongside gallery picker ([6fa93ef](https://github.com/scepbjoern/fairment_Darmkur_App/commit/6fa93ef10ae44c40358dd975080d660caa60ab4d))
* add configurable compression options for database backups ([7f737e6](https://github.com/scepbjoern/fairment_Darmkur_App/commit/7f737e6d30754df21af269b91d09d3e4497226ae))
* add edit and delete functionality for notes and reflections ([fea9eb0](https://github.com/scepbjoern/fairment_Darmkur_App/commit/fea9eb054d49310d1516ed0b1033e5905d421066))
* add explanatory link to Bristol stool scale documentation ([aeec210](https://github.com/scepbjoern/fairment_Darmkur_App/commit/aeec2101e96fae00b2633d6c05ad42517d26a1f1))
* add PWA install prompt button to site navigation ([b75fb45](https://github.com/scepbjoern/fairment_Darmkur_App/commit/b75fb457b9b982c8f583f10534e38857facb59ad))
* add support for user-defined custom symptoms tracking ([f18f658](https://github.com/scepbjoern/fairment_Darmkur_App/commit/f18f658391c58dee7a0cc20a57e71f1c3ec20b6e))
* add user profile image support with avatar upload and cropping UI ([9387638](https://github.com/scepbjoern/fairment_Darmkur_App/commit/93876385eff04fd20b576d55b889e5ed30307dbb))
* add user-defined links with submenu in navigation ([d6cb212](https://github.com/scepbjoern/fairment_Darmkur_App/commit/d6cb21234616b5d302b70220a411578ba23ec452))
* implement analytics dashboard with weekly, phase and overall views ([fd3d717](https://github.com/scepbjoern/fairment_Darmkur_App/commit/fd3d71782cb6a27af9b6e87b1e39e50fd396794d))
* implement PDF export with daily entries, notes and optional photos ([8dc1728](https://github.com/scepbjoern/fairment_Darmkur_App/commit/8dc1728f4b13819b4a18d32715d279ca50a3627f))
* implement persistent theme switching with SSR support and cookie fallback ([15ed5ef](https://github.com/scepbjoern/fairment_Darmkur_App/commit/15ed5eff304ebb40da089becca68614c7e04d184))
* improve postgres backup script with logging, error handling, and immediate backup on start ([764dbef](https://github.com/scepbjoern/fairment_Darmkur_App/commit/764dbefdfd615ac09f55103c1457f3d3807709ce))


### Bug Fixes

* add null checks for symptoms data and update app icons with proper PWA support ([dac5fee](https://github.com/scepbjoern/fairment_Darmkur_App/commit/dac5fee14cda705da085b66343dcfdf96bf0f897))
* escape shell variables with double $ in backup service script ([2987b6d](https://github.com/scepbjoern/fairment_Darmkur_App/commit/2987b6dbd194b4c0438f6b612f0f1e885a0cd13f))
* escape timestamp variable in backup script to prevent shell expansion ([7982355](https://github.com/scepbjoern/fairment_Darmkur_App/commit/79823555972f6957e33228dde8cd84dea19b2347))
