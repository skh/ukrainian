from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import get_or_404
from app.database import get_db
from app.models.drill_config import DrillConfig
from app.schemas.drill_config import DrillConfigCreate, DrillConfigRead, DrillConfigUpdate

router = APIRouter(tags=["drill_configs"])


@router.get("/api/drill-configs", response_model=list[DrillConfigRead])
def list_drill_configs(db: Session = Depends(get_db)):
    return db.execute(select(DrillConfig).order_by(DrillConfig.name)).scalars().all()


@router.post("/api/drill-configs", response_model=DrillConfigRead, status_code=201)
def create_drill_config(data: DrillConfigCreate, db: Session = Depends(get_db)):
    cfg = DrillConfig(name=data.name, config=data.config)
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.put("/api/drill-configs/{config_id}", response_model=DrillConfigRead)
def update_drill_config(config_id: int, data: DrillConfigUpdate, db: Session = Depends(get_db)):
    cfg = get_or_404(db, DrillConfig, config_id)
    if data.name is not None:
        cfg.name = data.name
    if data.config is not None:
        cfg.config = data.config
    db.commit()
    db.refresh(cfg)
    return cfg


@router.delete("/api/drill-configs/{config_id}", status_code=204)
def delete_drill_config(config_id: int, db: Session = Depends(get_db)):
    cfg = get_or_404(db, DrillConfig, config_id)
    db.delete(cfg)
    db.commit()
