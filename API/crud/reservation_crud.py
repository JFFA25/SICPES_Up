from sqlalchemy.orm import Session
from models.reservation_model import ReservationModel
from schemas.reservation_schema import ReservationCreate


def get_all_reservations(db: Session):
    return db.query(ReservationModel).all()


def create_reservation(db: Session, res_data: ReservationCreate):
    db_res = ReservationModel(**res_data.model_dump())
    db.add(db_res)
    db.commit()
    db.refresh(db_res)
    return db_res


def get_reservation(db: Session, res_id: int):
    return db.query(ReservationModel).filter(ReservationModel.id == res_id).first()


def update_reservation(db: Session, res_id: int, res_data):
    db_res = db.query(ReservationModel).filter(ReservationModel.id == res_id).first()
    if db_res:
        if res_data.fecha_ingreso is not None: db_res.fecha_ingreso = res_data.fecha_ingreso
        if res_data.tipo is not None: db_res.tipo = res_data.tipo
        if res_data.piso is not None: db_res.piso = res_data.piso
        if res_data.habitacion is not None: db_res.habitacion = res_data.habitacion
        if res_data.monto is not None: db_res.monto = res_data.monto
        if res_data.estado is not None: db_res.estado = res_data.estado
        if res_data.motivo_rechazo is not None: db_res.motivo_rechazo = res_data.motivo_rechazo
        db.commit()
        db.refresh(db_res)
    return db_res


def delete_reservation(db: Session, res_id: int):
    db_res = db.query(ReservationModel).filter(ReservationModel.id == res_id).first()
    if db_res:
        db.delete(db_res)
        db.commit()
    return db_res
