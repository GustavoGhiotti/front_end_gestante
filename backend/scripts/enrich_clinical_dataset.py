from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.clinical_dataset_enrichment import enrich_clinical_dataset
from app.db.init_db import init_db
from app.db.session import SessionLocal


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        counters = enrich_clinical_dataset(db)
        db.commit()
        print("Dataset clinico enriquecido.")
        for key, value in counters.items():
            print(f"{key}: {value}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
