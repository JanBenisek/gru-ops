"""nommer: track foods a toddler eats per day, plus any symptoms noted that day.

All state lives in one JSON file (NOMMER_DATA_FILE) so it fits on a plain PVC.
Every mutation takes a lock and writes atomically (tmp file + os.replace).
"""

import json
import os
import threading
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

DATA_FILE = Path(os.environ.get("NOMMER_DATA_FILE", "/data/nommer.json"))
VERSION = os.environ.get("NOMMER_VERSION", "dev")
STATIC_DIR = Path(__file__).parent / "static"

DEFAULT_ALLERGENS = [
    "Milk",
    "Egg",
    "Peanut",
    "Tree nut",
    "Wheat",
    "Soy",
    "Fish",
    "Shellfish",
    "Sesame",
]

MAX_NAME_LENGTH = 40

app = FastAPI(title="nommer", version=VERSION)
_lock = threading.Lock()


class NameIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class DayIn(BaseModel):
    date: str


class EatenIn(BaseModel):
    date: str
    allergen: str
    eaten: bool


class SymptomIn(BaseModel):
    date: str
    text: str = Field(max_length=1000)


def _load() -> dict:
    if not DATA_FILE.exists():
        return {"allergens": list(DEFAULT_ALLERGENS), "dates": [], "eaten": {}, "symptoms": {}}
    data = json.loads(DATA_FILE.read_text())
    data.setdefault("symptoms", {})
    return data


def _save(data: dict) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = DATA_FILE.with_name(DATA_FILE.name + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    os.replace(tmp, DATA_FILE)


def _clean_name(value: str) -> str:
    name = " ".join(value.split())
    if not 1 <= len(name) <= MAX_NAME_LENGTH:
        raise HTTPException(422, f"allergen name must be 1-{MAX_NAME_LENGTH} characters")
    return name


def _clean_day(value: str) -> str:
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError:
        raise HTTPException(422, f"invalid date: {value}")


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "version": VERSION}


@app.get("/api/state")
def get_state() -> dict:
    with _lock:
        return _load()


@app.post("/api/allergens", status_code=201)
def add_allergen(body: NameIn) -> dict:
    name = _clean_name(body.name)
    with _lock:
        data = _load()
        if any(a.casefold() == name.casefold() for a in data["allergens"]):
            raise HTTPException(409, f"{name} already exists")
        data["allergens"].append(name)
        _save(data)
        return data


@app.delete("/api/allergens")
def delete_allergen(name: str) -> dict:
    with _lock:
        data = _load()
        if name not in data["allergens"]:
            raise HTTPException(404, f"unknown allergen: {name}")
        data["allergens"].remove(name)
        for day in list(data["eaten"]):
            remaining = [a for a in data["eaten"][day] if a != name]
            if remaining:
                data["eaten"][day] = remaining
            else:
                del data["eaten"][day]
        _save(data)
        return data


@app.post("/api/dates", status_code=201)
def add_date(body: DayIn) -> dict:
    day = _clean_day(body.date)
    with _lock:
        data = _load()
        if day in data["dates"]:
            raise HTTPException(409, f"{day} already exists")
        data["dates"] = sorted([*data["dates"], day])
        _save(data)
        return data


@app.delete("/api/dates")
def delete_date(day: str) -> dict:
    day = _clean_day(day)
    with _lock:
        data = _load()
        if day not in data["dates"]:
            raise HTTPException(404, f"unknown date: {day}")
        data["dates"].remove(day)
        data["eaten"].pop(day, None)
        data["symptoms"].pop(day, None)
        _save(data)
        return data


@app.put("/api/eaten")
def set_eaten(body: EatenIn) -> dict:
    day = _clean_day(body.date)
    with _lock:
        data = _load()
        if day not in data["dates"]:
            raise HTTPException(404, f"unknown date: {day}")
        if body.allergen not in data["allergens"]:
            raise HTTPException(404, f"unknown allergen: {body.allergen}")
        eaten = set(data["eaten"].get(day, []))
        if body.eaten:
            eaten.add(body.allergen)
        else:
            eaten.discard(body.allergen)
        if eaten:
            data["eaten"][day] = [a for a in data["allergens"] if a in eaten]
        else:
            data["eaten"].pop(day, None)
        _save(data)
        return data


@app.put("/api/symptoms")
def set_symptoms(body: SymptomIn) -> dict:
    day = _clean_day(body.date)
    text = body.text.strip()
    with _lock:
        data = _load()
        if day not in data["dates"]:
            raise HTTPException(404, f"unknown date: {day}")
        if text:
            data["symptoms"][day] = text
        else:
            data["symptoms"].pop(day, None)
        _save(data)
        return data


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
