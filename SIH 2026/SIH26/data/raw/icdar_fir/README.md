# ICDAR 2023 Indian FIR Dataset

## Official Source & Metadata
- **Dataset Name:** ICDAR 2023 Competition on Document Understanding for Indian Legal & Police Documents (FIRs)
- **Year:** 2023
- **Collection Period:** 2018–2022
- **Domain:** Indian Law Enforcement (First Information Reports)
- **Official Host:** ICDAR 2023 Workshop / Research Repositories
- **License:** Research & Academic Non-Commercial Use Only
- **Intended Purpose:** Document classification, OCR recognition, legal entity extraction, incident date/time parsing, and jurisdictional location extraction.

## Download & Setup Instructions
1. Download the document corpus (PDF/Scanned images and annotation JSON/XML) from the official ICDAR benchmark repository.
2. Place the raw files in `data/raw/icdar_fir/`.
3. Expected structure:
   - `data/raw/icdar_fir/documents/*.pdf` or `*.png`
   - `data/raw/icdar_fir/annotations.json`
4. Run the adapter via the UI or backend endpoint `/api/datasets/process/icdar_fir`.

## Data Ethics & Isolation Rule
- **Dataset Namespace:** `PUBLIC_ICDAR:`
- Do NOT merge subjects from this dataset with individuals from other datasets.
- Extracted dates preserve the actual incident/registration date from the source text.
