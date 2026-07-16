# Mistake Watch Product Context

## Register

product

## Platform

web

## Product Purpose

Mistake Watch is a polished, room-based watch and listen experience for synchronized direct media playback, host-led music queues, and shared presence. It is primarily a private, experimental product for friends and family, with room to grow deliberately without pretending to be a hardened commercial streaming platform.

## Primary Audience

- Friends and family who want to watch or listen together remotely.
- A host who needs clear authority over playback, queues, permissions, and room state.
- Guests who should be able to join quickly and understand the room without account or product-training friction.
- Later, desktop and headset participants sharing the same room through a spatial cinema presentation.

## Core Experience

The room is the product. Media remains visually primary while participants, queue state, transport controls, permissions, and synchronization status remain clear and compact. Supabase owns durable product data; SpacetimeDB owns latency-sensitive live room state. Every presentation mode should consume the same authoritative room and playback contracts rather than inventing a parallel product.

## Product Surfaces

- Standard synchronized watch room.
- Host-led listen room and shared queue.
- Dashboard and room-management surfaces.
- Uploaded-media management backed by Cloudflare R2 metadata and access controls.
- Later presentation modes: TV, desktop 3D cinema, and Quest WebXR cinema.
- Later shared remote browser mode as an isolated subsystem.

## Voice

Direct, calm, confident, and slightly cinematic. Labels should be concise and operational rather than promotional. Status, authority, permissions, failure, and recovery language must be honest and immediately understandable.

## Visual References

- A high-end private screening room: media-first, controlled, intimate, and low-distraction.
- A futuristic command centre: precise system status, purposeful hierarchy, and clear authority.
- The established Signal Aperture and Obsidian Lounge direction documented in `DESIGN.md`.
- Dark cinematic environments with restrained red signal accents and readable spatial controls.

Detailed visual tokens, typography, colour, spacing, responsive behaviour, and component rules remain governed by `DESIGN.md`.

## Anti-References

- A generic watch-together clone.
- A marketing-first landing page that delays entry to the room.
- Dashboard clutter or decorative panels without operational value.
- Unrelated SaaS styling applied to an entertainment experience.
- Generic AI-generated gradients, excessive glow, glassmorphism, or novelty controls.
- Fake data or UI states that imply capabilities the product does not support.
- Claims of DRM-protected or restricted third-party playback without technical and legal verification.

## Critical UX Principles

- Media first: protect the stage and keep supporting controls compact.
- Guest first: joining, orientation, and recovery should require minimal explanation.
- Authority visible: users must understand who can control playback, queues, and room capabilities.
- Stable and recoverable: controls should not jump, disappear unexpectedly, or hide failure states.
- Honest states: show loading, synchronization, permission, empty, unavailable, and error states accurately.
- Accessible and responsive: support keyboard use, readable contrast, clear focus, reduced-motion needs, and practical desktop/mobile layouts.
- One room model: presentation modes reuse shared identity, permissions, queue, presence, and playback contracts.
- Explicit data ownership: durable state belongs in Supabase; live authoritative session state belongs in SpacetimeDB; render-frame and comfort state remain local.
- Specs govern scope: approved task packets and acceptance criteria override design-tool suggestions.

## Product Boundaries

- The current product is private and experimental, not represented as a hardened commercial streaming service.
- Direct media and HLS are the first media foundation; YouTube is the preferred next provider integration.
- Spotify remains out of scope.
- Shared remote browser mode remains a later, isolated phase.
- Spatial cinema work is planned through `TASK-008` and must not silently change the existing non-spatial room experience.
- Full-body avatars, unrestricted public worlds, physics-heavy interaction, voice chat, and screen sharing are not assumed baseline spatial features.
- Provider, upload, privacy, and access behaviour must reflect real technical and legal capability.

## Assumptions Requiring Review

- Broader public-release positioning, monetization, and commercial operating requirements are not yet defined.
- Spatial themes and advanced social features should remain modular content decisions after the first spatial vertical slice proves comfort, synchronization, and device performance.
