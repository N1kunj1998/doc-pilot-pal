from sqlalchemy import Column, Integer, create_engine
from sqlalchemy.orm import DeclarativeBase, Session

from app.db_types import Vector


class Base(DeclarativeBase):
    pass


class Sample(Base):
    __tablename__ = "vector_samples"
    id = Column(Integer, primary_key=True)
    embedding = Column(Vector(3))


class TestVectorType:
    def test_round_trips_a_list_of_floats_on_sqlite(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)

        with Session(engine) as session:
            session.add(Sample(id=1, embedding=[0.1, 0.2, 0.3]))
            session.commit()

        with Session(engine) as session:
            row = session.get(Sample, 1)
            assert row.embedding == [0.1, 0.2, 0.3]

    def test_round_trips_none(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)

        with Session(engine) as session:
            session.add(Sample(id=1, embedding=None))
            session.commit()

        with Session(engine) as session:
            row = session.get(Sample, 1)
            assert row.embedding is None

    def test_converts_postgres_numpy_floats_to_plain_python_floats(self):
        import numpy as np

        class FakePostgresDialect:
            name = "postgresql"

        result = Vector(3).process_result_value(np.array([0.1, 0.2, 0.3], dtype=np.float32), FakePostgresDialect())

        assert result == [
            float(np.float32(0.1)),
            float(np.float32(0.2)),
            float(np.float32(0.3)),
        ]
        assert all(type(v) is float for v in result)

    def test_cosine_distance_compiles_to_the_pgvector_operator(self):
        from sqlalchemy.dialects import postgresql

        expr = Sample.embedding.cosine_distance([0.1, 0.2, 0.3])
        compiled = str(expr.compile(dialect=postgresql.dialect()))

        assert "<=>" in compiled
