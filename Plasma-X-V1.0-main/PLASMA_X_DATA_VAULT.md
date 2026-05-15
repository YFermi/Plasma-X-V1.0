# PLASMA-X Data Backup Strategy

Below is the structure and configuration for the `plasma-x-database` GitHub repository to serve as a permanent data vault.

## 1. Folder Structure

```text
plasma-x-database/
├── README.md
├── LICENSE (CC0 - public domain dedication)
├── metadata/
│   ├── database_info.json
│   └── coverage_report.json
├── atomic/
│   ├── master_atomic_database.json  (all 145 lines combined)
│   ├── by_element/
│   │   ├── H.json
│   │   ├── He.json
│   │   ├── Ar.json
│   │   ├── N.json
│   │   ├── O.json
│   │   ├── Ne.json
│   │   ├── Kr.json
│   │   ├── Xe.json
│   │   ├── C.json
│   │   └── Fe.json
│   └── by_ion_stage/
│       ├── neutral_I.json
│       ├── singly_ionized_II.json
│       └── doubly_ionized_III.json
├── molecular/
│   ├── master_molecular_database.json
│   ├── OH.json
│   ├── N2.json
│   ├── N2+.json
│   ├── NO.json
│   ├── CH.json
│   ├── C2.json
│   └── CN.json
├── stark/
│   └── stark_broadening.json
└── .github/
    └── workflows/
        └── nist_sync.yml  (weekly automated update)
```

## 2. metadata/database_info.json

```json
{
  "name": "PLASMA-X Spectroscopic Database",
  "version": "2.0.0",
  "description": "A curated, offline-first spectral database for optical emission spectroscopy in plasma diagnostics. Serving as a permanent public-domain data vault.",
  "created": "2024",
  "license": "CC0",
  "sources": [
    "NIST Atomic Spectra Database (ASD)",
    "Kurucz Database",
    "LIFBASE",
    "DIATOMIC"
  ],
  "atomic_lines": 145,
  "molecular_bands": 20,
  "elements": [
    "H", "He", "Ar", "N", "O", "Ne", "Kr", "Xe", "C", "Fe"
  ],
  "last_updated": "2024-05-12T00:00:00Z",
  "nist_asd_version": "5.11",
  "contact": "PLASMA-X Open Science Initiative",
  "citation": "When using this database, please cite the original NIST ASD and this repository as your offline source."
}
```

## 3. .github/workflows/nist_sync.yml

```yaml
name: NIST ASD Weekly Sync

on:
  schedule:
    # Runs at 00:00 UTC every Sunday
    - cron: '0 0 * * 0'
  workflow_dispatch:
    # Allows manual triggering

jobs:
  sync_database:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install Dependencies
        run: npm install
        
      - name: Run NIST Sync Script
        run: node scripts/sync_nist_asd.js
        env:
          NIST_API_ENDPOINT: "https://physics.nist.gov/cgi-bin/ASD/lines1.pl"
          
      - name: Check for Data Changes
        id: git-check
        run: |
          git diff --exit-code || echo "changes=true" >> $GITHUB_OUTPUT
          
      - name: Commit and Push Updates
        if: steps.git-check.outputs.changes == 'true'
        run: |
          git config --global user.name "plasma-x-bot"
          git config --global user.email "bot@plasma-x.org"
          git add atomic/
          git commit -m "chore(data): weekly automated NIST ASD synchronization"
          git push
          
      - name: Send Summary Report
        if: always()
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.gmail.com
          server_port: 465
          username: ${{ secrets.EMAIL_USERNAME }}
          password: ${{ secrets.EMAIL_PASSWORD }}
          subject: "PLASMA-X NIST Sync Report: ${{ job.status }}"
          body: |
            The automated NIST ASD weekly sync has completed.
            Status: ${{ job.status }}
            Changes detected: ${{ steps.git-check.outputs.changes == 'true' && 'Yes' || 'No' }}
            See the workflow run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
          to: admin@plasma-x.org
          from: GitHub Actions
```
