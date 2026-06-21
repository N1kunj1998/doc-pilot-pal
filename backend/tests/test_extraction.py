import io

from app.extraction import extract_text


class TestExtractText:
    def test_extracts_plain_text(self):
        content = b"Hello world, this is plain text."
        assert extract_text(content, "text/plain") == "Hello world, this is plain text."

    def test_extracts_markdown_as_plain_text(self):
        content = b"# Heading\n\nSome **bold** text."
        assert extract_text(content, "text/markdown") == "# Heading\n\nSome **bold** text."

    def test_extracts_text_from_pdf(self):
        from pypdf import PdfWriter

        writer = PdfWriter()
        page = writer.add_blank_page(width=200, height=200)
        page.merge_page(_pdf_page_with_text("Hello from PDF"))
        buf = io.BytesIO()
        writer.write(buf)
        content = buf.getvalue()

        text = extract_text(content, "application/pdf")
        assert "Hello from PDF" in text

    def test_extracts_text_from_docx(self):
        from docx import Document as DocxDocument

        doc = DocxDocument()
        doc.add_paragraph("Hello from DOCX")
        buf = io.BytesIO()
        doc.save(buf)
        content = buf.getvalue()

        text = extract_text(content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        assert "Hello from DOCX" in text

    def test_raises_for_unsupported_content_type(self):
        import pytest

        with pytest.raises(ValueError):
            extract_text(b"data", "application/x-msdownload")


def _pdf_page_with_text(text: str):
    from reportlab.pdfgen import canvas
    from pypdf import PdfReader

    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(50, 100, text)
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]
