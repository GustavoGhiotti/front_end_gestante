import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Medicamento(Base, TimestampMixin):
    __tablename__ = "medicamentos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    gestante_id: Mapped[str] = mapped_column(String(36), ForeignKey("gestantes.id"), nullable=False, index=True)
    medico_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)

    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    dosagem: Mapped[str] = mapped_column(String(120), nullable=False)
    frequencia: Mapped[str] = mapped_column(String(120), nullable=False)
    data_inicio: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    data_fim: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lembrete_ativo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    horario_lembrete: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    tomado_hoje: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tomado_hoje_em: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    ultimo_lembrete_enviado_em: Mapped[Optional[datetime]] = mapped_column(nullable=True)
