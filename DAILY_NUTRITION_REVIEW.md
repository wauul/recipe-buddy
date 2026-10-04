# Daily nutrition and target review

Added in response to the request for daily dietary assessment and therapeutic targets, 4 October 2026.

Implemented: private actual-portion composition, six nutrient totals, explicit complete-day confirmation, automatic invalidation after recorded food/portion/composition changes, below/within/above comparisons with active bounds, provenance/expiry, prescribed-target guards for children/pregnancy/breastfeeding/declared conditions, removal/export/withdrawal integration, web/native controls.

This compares the recorded day and supported nutrients. It does not establish long-term adequacy or diagnose deficiency. Unknown entries/nutrients remain unknown; an empty diary cannot be confirmed as a complete zero-intake day. Labelled zero is preserved. Prescription references are user declarations, not independently verified. Vitamin/mineral adequacy and automatic clinical prescriptions are not delivered.

## Primary sources checked

- [USDA NAL DRI Calculator for Healthcare Professionals](https://www.nal.usda.gov/human-nutrition-and-food-safety/dri-calculator): individual reference recommendations use the National Academies framework. The professional tool does not validate Recipe Buddy.
- [HHS/USDA Dietary Guidelines for Americans 2025–2030](https://cdn.realfood.gov/DGA.pdf), [current official guidance](https://realfood.gov/): current US food-pattern guidance differs from DRI requirements and therapeutic prescriptions. Recipe Buddy does not substitute a generic 2,000 kcal pattern for individual requirements.
- ANSES [reference report](https://anses.fr/fr/system/files/NUT2018SA0238Ra.pdf) and [population guidance report](https://www.anses.fr/fr/system/files?file=NUT2017SA0143.pdf): applicability needs France-specific age/population review. Adult targets are not applied to child/clinical profiles automatically.

## Required review

Named reviewers must assess intended purpose/regulatory implications, units/bounds, prescription attestation/expiry, country/age/clinical combinations, label versus cooked composition, missing-data behaviour, longer-term interpretation and privacy. No reviewer has approved these modules. Capability status remains unreviewed until actual review and implementation revalidation are recorded.

Tests cover daily confirmation, changed/added-food invalidation, unknown versus zero, expired/inverted bounds, clinical/child guards, replay/ownership, actual labelled-portion composition and future-day rejection. Integration uses only labelled isolated fixtures, not real health histories.
