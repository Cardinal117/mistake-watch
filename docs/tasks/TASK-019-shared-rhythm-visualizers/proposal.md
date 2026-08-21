---
id: TASK-019
status: in-progress
type: full-packet
related: [MW-FEAT-008, MW-FEAT-006, MW-BUG-009, TASK-018]
created: 2026-08-21
updated: 2026-08-21
---

# Host-Authoritative Shared Rhythm Visualizers

## Problem

TASK-018 proves local audio analysis and approved renderers in a private Rhythm
Lab, but the production Listen room cannot consume that data. Participants also
have no bounded room rhythm profile tied to the synchronized playback clock.

## Goal

Connect the private companion to its captured Mistake Watch tab, render the
approved visualizers in the Listen room, and let the host publish stable rhythm
timing through SpacetimeDB for compatible participant visuals.

## Value

- Song-reactive visuals appear in the product instead of a separate lab.
- The analyser host gets full local fidelity without uploading audio data.
- Participants can share beat timing without installing the extension.
- Static Artwork remains efficient and fully functional without the companion.

## Scope

- Stable private extension identity and exact-origin external connection.
- Bounded extension-to-tab status, rhythm, and local visual-frame protocol.
- Host-only SpacetimeDB rhythm profile, reducer, subscription, and expiry rules.
- Media-relative phase mapping tied to YouTube ID and playback occurrence.
- Listen-room adapters for Mirror Spectrum, Siri Ribbon, Dot Waves, Signal
  Bloom, and Constellation with capability and power labels.
- Focused desktop, narrow-layout, multi-device, privacy, and resource QA.

## Non-Goals

- No captured audio, PCM, FFT, waveform, onset, or energy publication.
- No Supabase schema, RLS, API route, recommendation, queue, or upload change.
- No public extension-store distribution or claim of YouTube policy approval.
- No automatic capture start, microphone access, native host, or BPM API.
- No guest or delegated-analyser room publication in the first release.
- No redesign of the Listen room or Personalization panel.

## Success

The host can explicitly enable capture, see a clear connection/lock state, and
run the promoted visualizers in Listen mode. Compatible participant visuals use
the same room beat phase. Stale, spoofed, unauthorized, or wrong-media updates
cannot change room rhythm state, and the application remains unchanged when the
extension is absent.

## Dependency Gate

Satisfied. TASK-018 PR #5 merged into `main` as `f65d94c`. This branch was then
rebased onto that remote main before Batch A implementation continued.
