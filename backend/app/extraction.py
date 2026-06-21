import io
from typing import Optional

PLAIN_TEXT_TYPES = {"text/plain", "text/markdown"}
PDF_TYPE = "application/pdf"
DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def extract_text(content: bytes, content_type: str) -> str:
    return "\n".join(text for _, text in extract_pages(content, content_type))


def extract_pages(content: bytes, content_type: str) -> list[tuple[Optional[int], str]]:
    if content_type in PLAIN_TEXT_TYPES:
        return [(None, content.decode("utf-8"))]
    if content_type == PDF_TYPE:
        return _extract_pdf_pages(content)
    if content_type == DOCX_TYPE:
        return [(None, _extract_docx(content))]
    raise ValueError(f"Unsupported content type for extraction: {content_type}")


def _extract_pdf_pages(content: bytes) -> list[tuple[int, str]]:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(content))
    return [(i + 1, page.extract_text() or "") for i, page in enumerate(reader.pages)]


def _extract_docx(content: bytes) -> str:
    from docx import Document as DocxDocument

    doc = DocxDocument(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs)
