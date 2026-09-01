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
- Distinct terms: 8
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
- W26: 1
- WI26: 36

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

## Course codes with more than one offering

19 of 114 codes recur.

- **MGT 402** (2)
  - SU25 · Salovey · Management Comms
  - WI26 · Salovey · Data Driven Communications
- **MGT 403** (2)
  - FA25 · Erat · Business Analytics for Managers
  - FA25 · Montgomery · Business Analytics for Managers
- **MGT 404** (2)
  - FA25 · FLoyd · Accounting
  - WI26 · Perez Silva · Accounting
- **MGT 406** (3)
  - FA25 · Oveis [FT] · Leadership Skills -Tech Firms
  - FA25 · Oveis [Exec] · Leading People
  - SU25 · Oveis [PT] · Leading People
- **MGT 409** (2)
  - WI26 · Campbell · Leading in Networks & Organizations
  - WI26 · Kum · Leading in Networks & Organizations
- **MGT 413** (2)
  - WI26 · Montgomery · Operations Management
  - WI26 · Shahsavand · Operations Management
- **MGT 420** (2)
  - FA26 · Gneezy · Negotiation
  - SP26 · Rai · Negotiation
- **MGT 439** (3)
  - FA25 · Nissen · Topics in Org - Knowledge Mgt for Strategic Adv
  - SP26 · Salovey · Topics in org Behavior - Strategic Communications
  - SU26 · Meyer, A · Topics-Org Behavior - Leadership in Practice - Coaching & Inclusion
- **MGT 449** (3)
  - SP26 · Nijs & Teixeira · Topics in Operations & Techology - GenAI for Business
  - SU25 · Gopal · Topics in Ops & Tech - Global Chains - New Approaches
  - SU25 · Gopal · Topics in Ops & Tech - Supply Chain Finance
- **MGT 453** (2)
  - SU26 · Yorkston · Brand Management
  - SU26 · Kim · Supply Chain Management
- **MGT 459** (2)
  - SP26 · Gneezy · Topics in International Business - Bringing Product to US Market (SD Immersion))
  - WI26 · Krishnan · Topics in Innovation - Venture Innovation & Growth Strategy
- **MGT 489** (2)
  - SP26 · Shachar · Topics in Marketing - Skills of the Future
  - SU25 · Yorkston · Topics in Marketing_ Brand Management
- **MGT 495** (2)
  - SP26 · Ghezzi · Topics in Finance - Machine Learning and AI in Finance
  - SU26 · Warachka · International Finance
- **MGTA 457** (2)
  - FA25 · Schibler · Business Intelligence Systems
  - FA26 · Jambulapati · Business Intelligence Systems
- **MGTA 459** (2)
  - FA25 · Schurr · Mangerial Judg Decis Making
  - FA26 · Rottenstreich · Managerial Judg-Decis Making
- **MGTA 464** (2)
  - SU25 · Perols [FW] · SQL and ETL
  - SU26 · August · SQL and ETL
- **MGTA 495** (4)
  - SP26 · Nijs · Special Topics - GenAI for Business
  - SP26 · Kazemian · Special Topics in Business Analytics - Healthcare Analytics
  - SP26 · Yavorsky · Special Topics in Business Analytics - Marketing Analytics
  - WI26 · Kazemian · Spc Topics in Business Analytics - AI & Prescriptive Analytics
- **MGTF 495** (3)
  - SP26 · Ghezzi · Special Topics - AI in Finance
  - SP26 · Girand & Bhatt · Special Topics - Fixed Income
  - W26 · Vallod · Special Topics - Digital Finance
- **MGTP 401** (2)
  - FA26 · Girand · Professional Seminar
  - SP26 · Jewett · Professional Seminar

## Distinct course codes

MGT 402 (2), MGT 403 (2), MGT 403R (1), MGT 404 (2), MGT 404R (1), MGT 405 (1), MGT 405R (1), MGT 406 (3), MGT 407 (1), MGT 408 (1), MGT 409 (2), MGT 410 (1), MGT 410R (1), MGT 412 (1), MGT 412R (1), MGT 413 (2), MGT 413R (1), MGT 414 (1), MGT 414R (1), MGT 415 (1), MGT 417 (1), MGT 420 (2), MGT 421 (1), MGT 428 (1), MGT 429 (1), MGT 430 (1), MGT 431R (1), MGT 433 (1), MGT 439 (3), MGT 446 (1), MGT 449 (3), MGT 450 (1), MGT 451R (1), MGT 452 (1), MGT 452R (1), MGT 453 (2), MGT 453R (1), MGT 455R (1), MGT 456 (1), MGT 458 (1), MGT 458R (1), MGT 459 (2), MGT 461R (1), MGT 470 (1), MGT 471 (1), MGT 473 (1), MGT 477R (1), MGT 482 (1), MGT 486R (1), MGT 487 (1), MGT 488R (1), MGT 489 (2), MGT 490 (1), MGT 491 (1), MGT 492R (1), MGT 493R (1), MGT 495 (2), MGTA 402 (1), MGTA 403 (1), MGTA 415 (1), MGTA 444 (1), MGTA 451 (1), MGTA 452 (1), MGTA 453 (1), MGTA 454 (1), MGTA 456 (1), MGTA 457 (2), MGTA 458 (1), MGTA 459 (2), MGTA 460 (1), MGTA 463R (1), MGTA 464 (2), MGTA 466 (1), MGTA 479 (1), MGTA 495 (4), MGTF 401 (1), MGTF 402 (1), MGTF 403 (1), MGTF 404 (1), MGTF 405 (1), MGTF 406 (1), MGTF 407 (1), MGTF 408 (1), MGTF 410 (1), MGTF 413 (1), MGTF 415 (1), MGTF 416 (1), MGTF 417 (1), MGTF 418 (1), MGTF 419 (1), MGTF 420 (1), MGTF 421 (1), MGTF 422 (1), MGTF 423 (1), MGTF 424 (1), MGTF 430 (1), MGTF 490 (1), MGTF 495 (3), MGTP 401 (2), MGTP 414 (1), MGTP 416 (1), MGTP 421 (1), MGTP 422 (1), MGTP 424 (1), MGTP 425 (1), MGTP 429 (1), MGTP 432 (1), MGTP 433 (1), MGTP 434 (1), MGTP 435 (1), MGTP 443 (1), MGTP 444 (1), MGTP 452 (1), MGTP 495 (1)

