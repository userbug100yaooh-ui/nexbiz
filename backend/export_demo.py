"""Gera `frontend/src/lib/demo-data.ts` a partir do Mongo já semeado por seed.py.

Uso:  cd /app/backend && python seed.py && python export_demo.py

O bundle espelha exatamente o formato das respostas da API (datas ISO, campos
snake_case) e alimenta o modo demonstração offline do frontend — quando o
backend não responde (ex.: preview estático sem API), as telas usam estes dados.
"""

import asyncio
import json
from pathlib import Path
from typing import Any, Dict, List

from fastapi.encoders import jsonable_encoder

from lib.db import client, db

OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "lib" / "demo-data.ts"


async def docs(collection: str, sort_field: str, direction: int) -> List[Dict[str, Any]]:
    out = []
    async for d in db[collection].find().sort(sort_field, direction):
        d.pop("_id", None)
        out.append(jsonable_encoder(d))
    return out


async def bundle() -> Dict[str, Any]:
    company_doc = await db.companies.find_one()
    if not company_doc:
        raise SystemExit("Nenhuma empresa no banco — execute python seed.py primeiro.")
    company_doc.pop("_id", None)
    return {
        "company": jsonable_encoder(company_doc),
        "users": await docs("users", "name", 1),
        "products": await docs("products", "name", 1),
        "clients": await docs("clients", "name", 1),
        "services": await docs("services", "name", 1),
        "service_orders": await docs("service_orders", "created_at", -1),
        "sales": await docs("sales", "created_at", -1),
        "transactions": await docs("transactions", "due_date", -1),
    }


async def main() -> None:
    data = await bundle()
    header = (
        "// AUTO-GERADO por backend/export_demo.py — não editar à mão.\n"
        "// Espelho offline do seed: alimenta o modo demonstração quando o backend não responde.\n"
        'import type { DemoBundle } from "./types";\n\n'
    )
    OUT.write_text(header + f"export const demoData: DemoBundle = {json.dumps(data, ensure_ascii=False, indent=2)};\n", encoding="utf-8")
    print(f"export_demo: escrito em {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
    client.close()
