# Syllabus conversion report

Source: `backend/data/syllabi`  
Output: `backend/data/syllabi_md`  
Extractor: pymupdf4llm (PyMuPDF) for PDF, python-docx for DOCX  
OCR: off. Every page below has a text layer, so it would only add noise.

## Totals

- Files found: 141
- Converted: 141
- Failed to convert: 0
- Parsed as offerings: 139
- Catalogs (not offerings, conversion only): 2
- Filenames that did not parse: 0
- Distinct course codes: 114
- **Distinct courses (code + title): 120**
- Courses offered more than once: 16
- Courses that have appeared under more than one code: 10
- Title pairs awaiting manual review: 30
- Distinct terms: 7
- Files with at least one page lacking a text layer: 0

## Failed to convert

None.

## Filenames that did not parse

None.

## Thin extractions (likely scanned or image-only)

Fewer than 500 characters of text.

None.

## Pages with no text layer

Scanned or image-only pages. Measured with plain PyMuPDF, before extraction.
Anything listed here needs a rerun with --ocr.

None.

## Terms

- FA25: 15
- FA26: 29
- SP25: 1
- SP26: 38
- SU25: 8
- SU26: 11
- WI26: 37

## Trailing qualifiers

- 8am: 1
- AM: 1
- Exec: 1
- FT: 1
- FW: 1
- PT: 1
- fully remote: 1

## Offerings with no instructor in the filename

- `MGTA 454 Business Analytics Capstone - SP26.pdf`

## Courses with more than one offering

16 of 120 courses recur. Terms are chronological.

- **MGT 403 / MGT 403R** — Business Analytics for Managers (3)
  - FA25 · MGT 403 · Erat · Business Analytics for Managers
  - FA25 · MGT 403 · Montgomery · Business Analytics for Managers
  - FA26 · MGT 403R · Zhang · Business Analytics for Managers
- **MGT 404 / MGT 404R** — Accounting (3)
  - FA25 · MGT 404 · FLoyd · Accounting
  - WI26 · MGT 404 · Perez Silva · Accounting
  - WI26 · MGT 404R · Floyd · Accounting
- **MGT 405 / MGT 405R** — Managerial Economics (2)
  - FA25 · MGT 405R · Serra-Garcia · Managerial Economics
  - FA26 · MGT 405 · Fragiadakis · Managerial Economics
- **MGT 406** — Leading People (2)
  - SU25 · MGT 406 · Oveis [PT] · Leading People
  - FA25 · MGT 406 · Oveis [Exec] · Leading People
- **MGT 409** — Leading in Networks & Organizations (2)
  - WI26 · MGT 409 · Campbell · Leading in Networks & Organizations
  - WI26 · MGT 409 · Kum · Leading in Networks & Organizations
- **MGT 410 / MGT 410R** — Strategy (2)
  - FA26 · MGT 410 · Fragiadakis · Strategy
  - FA26 · MGT 410R · Wellsjo · Strategy
- **MGT 412 / MGT 412R** — New Venture Design (2)
  - FA26 · MGT 412 · Meyer · New Venture Design
  - FA26 · MGT 412R · Meyer · New Venture Design
- **MGT 413 / MGT 413R** — Operations Management (3)
  - WI26 · MGT 413 · Montgomery · Operations Management
  - WI26 · MGT 413 · Shahsavand · Operations Management
  - WI26 · MGT 413R · Luo · Operations Management
- **MGT 414 / MGT 414R** — Rady Action Project (2)
  - SP26 · MGT 414 · Kenny · Rady Action Project
  - FA26 · MGT 414R · Kenny · Rady Action Project
- **MGT 420** — Negotiation (2)
  - SP26 · MGT 420 · Rai · Negotiation
  - FA26 · MGT 420 · Gneezy · Negotiation
- **MGT 452 / MGT 452R** — New Product Development (2)
  - WI26 · MGT 452 · Meyer, M · New Product Development
  - SP26 · MGT 452R · Meyer · New Product Development
- **MGT 453 / MGT 453R** — Supply Chain Management (2)
  - WI26 · MGT 453R · Shin · Supply Chain Management
  - SU26 · MGT 453 · Kim · Supply Chain Management
- **MGT 458 / MGT 458R** — Experiments in Firms (2)
  - FA25 · MGT 458 · Samek · Experiments in Firms
  - WI26 · MGT 458R · Sadoff · Experiments in Firms
- **MGTA 457** — Business Intelligence Systems (2)
  - FA25 · MGTA 457 · Schibler · Business Intelligence Systems
  - FA26 · MGTA 457 · Jambulapati · Business Intelligence Systems
- **MGTA 464** — SQL and ETL (2)
  - SU25 · MGTA 464 · Perols [FW] · SQL and ETL
  - SU26 · MGTA 464 · August · SQL and ETL
- **MGTP 401** — Professional Seminar (2)
  - SP26 · MGTP 401 · Jewett · Professional Seminar
  - FA26 · MGTP 401 · Girand · Professional Seminar

## Courses that have appeared under more than one code

The key contains the base code, so this can only ever be section variants
(`403` and `403R`). A course that was *renumbered* keeps its title but changes
base code, which makes it two keys — see `same_title_different_code` below.

- **Business Analytics for Managers** — MGT 403, MGT 403R (FA25, FA26)
- **Accounting** — MGT 404, MGT 404R (FA25, WI26)
- **Managerial Economics** — MGT 405, MGT 405R (FA25, FA26)
- **Strategy** — MGT 410, MGT 410R (FA26)
- **New Venture Design** — MGT 412, MGT 412R (FA26)
- **Operations Management** — MGT 413, MGT 413R (WI26)
- **Rady Action Project** — MGT 414, MGT 414R (SP26, FA26)
- **New Product Development** — MGT 452, MGT 452R (WI26, SP26)
- **Supply Chain Management** — MGT 453, MGT 453R (WI26, SU26)
- **Experiments in Firms** — MGT 458, MGT 458R (FA25, WI26)

## Title review list

Course pairs that may be the same course. **Nothing here has been merged.**
Grouping is on exact normalised titles; these are for manual confirmation.

### same_title_different_code (6)

- similarity 1.000
  - `MGT 402` 'Data Driven Communications' (WI26)
  - `MGTA 402` 'Data Driven Communications' (FA26)
- similarity 1.000
  - `MGT 428` 'Managerial Judg-Decis Making' (SP26)
  - `MGTA 459` 'Managerial Judg-Decis Making' (FA26)
- similarity 1.000
  - `MGT 453` 'Brand Management' (SU26)
  - `MGT 482` 'Brand Management' (SU26)
- similarity 1.000
  - `MGT 486R` 'Real Estate Finance' (SP26)
  - `MGTF 408` 'Real Estate Finance' (SP25)
- similarity 1.000
  - `MGT 487` 'Valuation in Corporate Finance' (FA26)
  - `MGTF 407` 'Valuation in Corporate Finance' (WI26)
- similarity 1.000
  - `MGT 493R` 'New Venture Finance' (FA26)
  - `MGTF 410` 'New Venture Finance' (WI26)

### near_identical_title (2)

- similarity 0.982
  - `MGT 428` 'Managerial Judg-Decis Making' (SP26)
  - `MGTA 459` 'Mangerial Judg Decis Making' (FA25)
- similarity 0.962
  - `MGTF 423` 'Data Science for Finance I' (WI26)
  - `MGTF 424` 'Data Science for Finance - M' (SP26)

### same_code_different_title (22)

- similarity 0.982
  - `MGTA 459` 'Managerial Judg-Decis Making' (FA26)
  - `MGTA 459` 'Mangerial Judg Decis Making' (FA25)
- similarity 0.885
  - `MGTA 495` 'Special Topics in Business Analytics - Healthcare Analytics' (SP26)
  - `MGTA 495` 'Special Topics in Business Analytics - Marketing Analytics' (SP26)
- similarity 0.828
  - `MGTF 495` 'Special Topics - AI in Finance' (SP26)
  - `MGTF 495` 'Special Topics - Digital Finance' (WI26)
- similarity 0.814
  - `MGTA 495` 'Spc Topics in Business Analytics - AI & Prescriptive Analytics' (WI26)
  - `MGTA 495` 'Special Topics in Business Analytics - Marketing Analytics' (SP26)
- similarity 0.790
  - `MGTA 495` 'Spc Topics in Business Analytics - AI & Prescriptive Analytics' (WI26)
  - `MGTA 495` 'Special Topics in Business Analytics - Healthcare Analytics' (SP26)
- similarity 0.764
  - `MGTF 495` 'Special Topics - AI in Finance' (SP26)
  - `MGTF 495` 'Special Topics - Fixed Income' (SP26)
- similarity 0.702
  - `MGT 449` 'Topics in Ops & Tech - Global Chains - New Approaches' (SU25)
  - `MGT 449` 'Topics in Ops & Tech - Supply Chain Finance' (SU25)
- similarity 0.702
  - `MGTF 495` 'Special Topics - Digital Finance' (WI26)
  - `MGTF 495` 'Special Topics - Fixed Income' (SP26)
- similarity 0.667
  - `MGT 453` 'Brand Management' (SU26)
  - `MGT 453/MGT 453R` 'Supply Chain Management' (WI26, SU26)
- similarity 0.630
  - `MGT 439` 'Topics in org Behavior - Strategic Communications' (SP26)
  - `MGT 439` 'Topics in Org - Knowledge Mgt for Strategic Adv' (FA25)
- similarity 0.604
  - `MGT 449` 'Topics in Operations & Techology - GenAI for Business' (SP26)
  - `MGT 449` 'Topics in Ops & Tech - Supply Chain Finance' (SU25)
- similarity 0.596
  - `MGT 449` 'Topics in Operations & Techology - GenAI for Business' (SP26)
  - `MGT 449` 'Topics in Ops & Tech - Global Chains - New Approaches' (SU25)
- similarity 0.589
  - `MGT 439` 'Topics in org Behavior - Strategic Communications' (SP26)
  - `MGT 439` 'Topics-Org Behavior - Leadership in Practice - Coaching & Inclusion' (SU26)
- similarity 0.579
  - `MGT 489` 'Topics in Marketing_ Brand Management' (SU25)
  - `MGT 489` 'Topics in Marketing - Skills of the Future' (SP26)
- similarity 0.562
  - `MGTA 495` 'Special Topics - GenAI for Business' (SP26)
  - `MGTA 495` 'Special Topics in Business Analytics - Marketing Analytics' (SP26)
- similarity 0.556
  - `MGTA 495` 'Special Topics - GenAI for Business' (SP26)
  - `MGTA 495` 'Special Topics in Business Analytics - Healthcare Analytics' (SP26)
- similarity 0.476
  - `MGT 402` 'Data Driven Communications' (WI26)
  - `MGT 402` 'Management Comms' (SU25)
- similarity 0.448
  - `MGT 459` 'Topics in Innovation - Venture Innovation & Growth Strategy' (WI26)
  - `MGT 459` 'Topics in International Business - Bringing Product to US Market (SD Immersion))' (SP26)
- similarity 0.442
  - `MGTA 495` 'Spc Topics in Business Analytics - AI & Prescriptive Analytics' (WI26)
  - `MGTA 495` 'Special Topics - GenAI for Business' (SP26)
- similarity 0.436
  - `MGT 439` 'Topics in Org - Knowledge Mgt for Strategic Adv' (FA25)
  - `MGT 439` 'Topics-Org Behavior - Leadership in Practice - Coaching & Inclusion' (SU26)
- similarity 0.381
  - `MGT 406` 'Leadership Skills -Tech Firms' (FA25)
  - `MGT 406` 'Leading People' (SU25, FA25)
- similarity 0.274
  - `MGT 495` 'International Finance' (SU26)
  - `MGT 495` 'Topics in Finance - Machine Learning and AI in Finance' (SP26)


## Distinct course codes

MGT 402 (2), MGT 403 (2), MGT 403R (1), MGT 404 (2), MGT 404R (1), MGT 405 (1), MGT 405R (1), MGT 406 (3), MGT 407 (1), MGT 408 (1), MGT 409 (2), MGT 410 (1), MGT 410R (1), MGT 412 (1), MGT 412R (1), MGT 413 (2), MGT 413R (1), MGT 414 (1), MGT 414R (1), MGT 415 (1), MGT 417 (1), MGT 420 (2), MGT 421 (1), MGT 428 (1), MGT 429 (1), MGT 430 (1), MGT 431R (1), MGT 433 (1), MGT 439 (3), MGT 446 (1), MGT 449 (3), MGT 450 (1), MGT 451R (1), MGT 452 (1), MGT 452R (1), MGT 453 (2), MGT 453R (1), MGT 455R (1), MGT 456 (1), MGT 458 (1), MGT 458R (1), MGT 459 (2), MGT 461R (1), MGT 470 (1), MGT 471 (1), MGT 473 (1), MGT 477R (1), MGT 482 (1), MGT 486R (1), MGT 487 (1), MGT 488R (1), MGT 489 (2), MGT 490 (1), MGT 491 (1), MGT 492R (1), MGT 493R (1), MGT 495 (2), MGTA 402 (1), MGTA 403 (1), MGTA 415 (1), MGTA 444 (1), MGTA 451 (1), MGTA 452 (1), MGTA 453 (1), MGTA 454 (1), MGTA 456 (1), MGTA 457 (2), MGTA 458 (1), MGTA 459 (2), MGTA 460 (1), MGTA 463R (1), MGTA 464 (2), MGTA 466 (1), MGTA 479 (1), MGTA 495 (4), MGTF 401 (1), MGTF 402 (1), MGTF 403 (1), MGTF 404 (1), MGTF 405 (1), MGTF 406 (1), MGTF 407 (1), MGTF 408 (1), MGTF 410 (1), MGTF 413 (1), MGTF 415 (1), MGTF 416 (1), MGTF 417 (1), MGTF 418 (1), MGTF 419 (1), MGTF 420 (1), MGTF 421 (1), MGTF 422 (1), MGTF 423 (1), MGTF 424 (1), MGTF 430 (1), MGTF 490 (1), MGTF 495 (3), MGTP 401 (2), MGTP 414 (1), MGTP 416 (1), MGTP 421 (1), MGTP 422 (1), MGTP 424 (1), MGTP 425 (1), MGTP 429 (1), MGTP 432 (1), MGTP 433 (1), MGTP 434 (1), MGTP 435 (1), MGTP 443 (1), MGTP 444 (1), MGTP 452 (1), MGTP 495 (1)

