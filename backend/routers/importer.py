"""Importação de planilhas (CSV/XLSX) para produtos e clientes.

Aceita cabeçalhos em português com ou sem acento (Nome/Preço/CNPJ…) e valores
formatados em pt-BR ("1.234,56"). Retorna contagem de criados/ignorados.
"""

import io
import unicodedata
from typing import Any, Dict

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from lib.db import db
from models.entities import Client, Product
from routers.common import get_company

router = APIRouter()

PRODUCT_COLUMNS: Dict[str, str] = {
    "nome": "name",
    "produto": "name",
    "sku": "sku",
    "codigo": "sku",
    "categoria": "category",
    "preco": "price",
    "preco de venda": "price",
    "valor": "price",
    "custo": "cost",
    "estoque": "stock",
    "quantidade": "stock",
    "estoque minimo": "min_stock",
    "minimo": "min_stock",
}

CLIENT_COLUMNS: Dict[str, str] = {
    "nome": "name",
    "cliente": "name",
    "razao social": "name",
    "tipo": "kind",
    "pessoa": "kind",
    "documento": "document",
    "cpf": "document",
    "cnpj": "document",
    "cpf/cnpj": "document",
    "email": "email",
    "e-mail": "email",
    "telefone": "phone",
    "celular": "phone",
    "cidade": "city",
    "uf": "state",
    "estado": "state",
}


class ImportOut(BaseModel):
    created: int
    skipped: int
    total: int


def _norm(col: Any) -> str:
    s = unicodedata.normalize("NFD", str(col))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower().strip()
    return " ".join(s.split())


def _to_float(v: Any) -> float | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip().replace("R$", "").replace("%", "").strip()
    if not s:
        return None
    if "," in s:  # pt-BR: 1.234,56 → 1234.56
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _to_int(v: Any) -> int:
    f = _to_float(v)
    return int(f) if f is not None else 0


def _read_frame(content: bytes, filename: str) -> pd.DataFrame:
    if filename.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(content))
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            return pd.read_csv(io.BytesIO(content), sep=None, engine="python", encoding=encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(status_code=422, detail="Não foi possível ler o arquivo — use CSV ou XLSX.")


@router.post("/import/{entity}", response_model=ImportOut)
async def import_rows(entity: str, file: UploadFile = File(...)) -> ImportOut:
    company = await get_company()
    if entity not in {"products", "clients"}:
        raise HTTPException(status_code=404, detail="Entidade de importação desconhecida.")

    frame = _read_frame(await file.read(), file.filename or "arquivo.csv")
    mapping = PRODUCT_COLUMNS if entity == "products" else CLIENT_COLUMNS
    cols = {_norm(c): str(c) for c in frame.columns if _norm(c) in mapping}

    if "name" not in {mapping[k] for k in cols}:
        raise HTTPException(status_code=422, detail="A planilha precisa de uma coluna 'Nome'.")

    created, skipped = 0, 0
    for _, row in frame.iterrows():
        data = {mapping[norm]: row[original] for norm, original in cols.items()}
        name = str(data.get("name", "")).strip()
        if entity == "products":
            price = _to_float(data.get("price"))
            if not name or price is None:
                skipped += 1
                continue
            product = Product(
                company_id=company.id,
                name=name,
                sku=str(data.get("sku") or "").strip(),
                category=str(data.get("category") or "").strip() or "Geral",
                price=price,
                cost=_to_float(data.get("cost")) or 0.0,
                stock=_to_int(data.get("stock")),
                min_stock=_to_int(data.get("min_stock")),
            )
            await db.products.insert_one(product.model_dump())
        else:
            if not name:
                skipped += 1
                continue
            kind = str(data.get("kind") or "").strip().upper()
            client = Client(
                company_id=company.id,
                name=name,
                kind=kind if kind in {"PF", "PJ"} else "PF",
                document=str(data.get("document") or "").strip(),
                email=str(data.get("email") or "").strip(),
                phone=str(data.get("phone") or "").strip(),
                city=str(data.get("city") or "").strip(),
                state=str(data.get("state") or "").strip()[:2].upper(),
            )
            await db.clients.insert_one(client.model_dump())
        created += 1
    return ImportOut(created=created, skipped=skipped, total=int(len(frame)))
