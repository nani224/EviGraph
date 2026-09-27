# IEEE-CIS Fraud Detection Dataset

## Official Source & Metadata
- **Dataset Name:** IEEE Computational Intelligence Society Fraud Detection Benchmark (Vesta Corp)
- **Year:** 2019
- **Domain:** E-commerce & Digital Payment Transactions (590,540 Transactions)
- **Official Host:** IEEE-CIS / Kaggle Competition Platform / Vesta Corporation
- **License:** Open Research & Competition Data License
- **Intended Purpose:** Transaction anomaly detection, feature engineering, card/device mismatch detection, isolation forest / autoencoder validation.

## Important Note on Timestamps
- The dataset provides `TransactionDT` as a relative timedelta from a reference point (in seconds).
- The adapter preserves `original_timedelta_sec` and marks `timestamp_status = "relative"`.
- We do **NOT** invent arbitrary calendar dates for public research transactions.
- **Dataset Namespace:** `PUBLIC_IEEECIS:`
- **NEVER** label transaction holders as criminals.
