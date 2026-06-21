import json

from sqlalchemy.types import Text, TypeDecorator


class Vector(TypeDecorator):
    """A pgvector column in Postgres, JSON-encoded text everywhere else.

    pgvector's own SQLAlchemy type only renders on the postgresql dialect,
    but tests/local dev run on SQLite — this lets the same model column
    work on both without duplicating the schema.
    """

    impl = Text
    cache_ok = True

    def __init__(self, dim: int, *args, **kwargs):
        self.dim = dim
        super().__init__(*args, **kwargs)

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from pgvector.sqlalchemy import Vector as PGVector

            return dialect.type_descriptor(PGVector(self.dim))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            # pgvector returns a numpy array of float32 — convert to plain
            # Python floats so chunks behave like normal data everywhere
            # else (JSON serialization, equality checks, etc.).
            return [float(v) for v in value]
        return json.loads(value)
