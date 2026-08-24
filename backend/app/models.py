from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)
    file_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("DatasetItem", back_populates="dataset", cascade="all, delete-orphan")


class DatasetItem(Base):
    __tablename__ = "dataset_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    address = Column(String(500), nullable=False)
    label = Column(String(255), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    sido = Column(String(100), nullable=True)
    sigugun = Column(String(100), nullable=True)
    dong = Column(String(100), nullable=True)
    road_name = Column(String(200), nullable=True)
    building_no = Column(String(50), nullable=True)
    ok = Column(Boolean, default=False)
    ev_nearby = Column(Boolean, default=False)

    dataset = relationship("Dataset", back_populates="items")


class Place(Base):
    __tablename__ = "places"

    address = Column(String(500), primary_key=True)
    memo = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    photos = relationship("Photo", back_populates="place", cascade="all, delete-orphan")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    address = Column(String(500), ForeignKey("places.address"), nullable=False)
    file_path = Column(String(500), nullable=False)
    original_name = Column(String(255), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    place = relationship("Place", back_populates="photos")


class EvStation(Base):
    __tablename__ = "ev_stations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    address = Column(String(500), nullable=False)
    name = Column(String(255), nullable=True)
    source_file = Column(String(255), nullable=True)
    loaded_at = Column(DateTime, default=datetime.utcnow)
