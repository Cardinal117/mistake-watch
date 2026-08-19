# Attribution And Review Asset Restrictions

This inventory records concept references and verification status. It does not
assert a license that has not been independently confirmed.

| Item                          | Use in showcase                                                            | Source                                                       | Verification status                                                                           |
| ----------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Awesome Audio Visualization   | Discovery collection and terminology                                       | https://github.com/willianjusten/awesome-audio-visualization | Collection referenced; licenses of linked projects vary and must be checked individually      |
| Responsive/configurable waves | Earlier visual direction reference                                         | https://codepen.io/jh3y/pen/poEvKxo                          | Concept reference only; license not verified                                                  |
| Dot Waves                     | Candidate concept reference                                                | https://codepen.io/iondrimba/pen/KXypwx                      | Concept reference only; license not verified                                                  |
| Siri-style visualizer         | Candidate replacement concept for Signal Ribbon                            | https://codepen.io/fgnass/pen/LWeKNq                         | Concept reference only; license not verified                                                  |
| Signal Bloom                  | Original Mistake Watch adaptation informed by radial audio-player patterns | Local renderer                                               | No third-party source copied as part of this modularization                                   |
| Siri Ribbon                   | Original bounded curve adaptation informed by Siri-style signal patterns   | Local renderer                                               | No CodePen source copied; exact concept license remains recorded before production            |
| Dot Waves                     | Original fixed-density field adaptation informed by dot-wave patterns      | Local renderer                                               | No CodePen source copied; exact concept license remains recorded before production            |
| Silk Nebula                   | Original Mistake Watch adaptation informed by Silk/Audiograph concepts     | Local renderer                                               | Underlying concept sources require separate review before production attribution is finalized |
| Mirror Spectrum               | Original Mistake Watch mirrored FFT adaptation                             | Local renderer                                               | audioMotion was reviewed as inspiration; production attribution decision remains open         |
| Obsidian Grid                 | Original Mistake Watch perspective-grid experiment                         | Local renderer                                               | Concept sources require separate review before production attribution is finalized            |
| Constellation                 | Original Mistake Watch bounded particle-network experiment                 | Local renderer                                               | p5.js visualizer concepts were reviewed; exact source/license mapping remains open            |

## Owner-supplied audio

`assets/ezios-family.mp3` and `assets/arylls-theme.mp3` are owner-supplied
local review assets. They are restricted to this private evaluation workflow.
Do not redistribute, publish, package into production, or treat them as
licensed fixtures without separate rights verification.

Automated production tests should eventually replace these tracks with
synthetic or explicitly licensed fixtures.

## Production gate

Before adopting any external implementation:

1. Verify the exact source revision and license.
2. Record required attribution and redistribution obligations.
3. Prefer implementing the approved visual concept against the local stable
   renderer interface instead of copying an uncertain CodePen implementation.
4. Keep any approved notice beside the production renderer source.
