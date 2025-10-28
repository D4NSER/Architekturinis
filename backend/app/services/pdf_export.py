from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Iterable
import unicodedata

from fpdf import FPDF  # type: ignore[import-untyped]

from app.models.plan_purchase import PlanPurchase, PlanPurchaseItem

MEDIA_ROOT = Path("media")
PURCHASES_DIR = MEDIA_ROOT / "purchases"

DAY_LABELS = {
    "monday": "Pirmadienis",
    "tuesday": "Antradienis",
    "wednesday": "Trečiadienis",
    "thursday": "Ketvirtadienis",
    "friday": "Penktadienis",
    "saturday": "Šeštadienis",
    "sunday": "Sekmadienis",
}


def _sanitize_text(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    return normalized.encode("ascii", "ignore").decode("ascii")


class PlanPDF(FPDF):
    def header(self) -> None:  # pragma: no cover - presentation logic
        self.set_y(15)

    def footer(self) -> None:  # pragma: no cover - presentation logic
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(107, 114, 128)
        self.cell(0, 10, f"Puslapis {self.page_no()}", align="C")


def _section_title(pdf: FPDF, title: str) -> None:
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(55, 65, 81)
    pdf.set_fill_color(233, 238, 255)
    pdf.cell(0, 8, _sanitize_text(title.upper()), ln=True, fill=True)
    pdf.ln(2)


def _key_value(pdf: FPDF, label: str, value: str, label_width: float = 45.0) -> None:
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(label_width, 6, _sanitize_text(label))
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(17, 24, 39)
    pdf.cell(0, 6, _sanitize_text(value), ln=True)


def _draw_divider(pdf: FPDF) -> None:
    y = pdf.get_y() + 2
    pdf.set_draw_color(225, 229, 250)
    pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
    pdf.ln(6)


def _wrap_text(pdf: FPDF, text: str, width: float) -> None:
    pdf.multi_cell(width, 5, txt=_sanitize_text(text), align="L")


def render_purchase_pdf(
    purchase: PlanPurchase, items: Iterable[PlanPurchaseItem]
) -> str:
    """Generate PDF receipt and return relative path under media directory."""
    PURCHASES_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"purchase_{purchase.id}_{timestamp}.pdf"
    output_path = PURCHASES_DIR / filename

    pdf = PlanPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Branding & intro
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(37, 99, 235)
    pdf.cell(0, 10, _sanitize_text("FitBite"), ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(107, 114, 128)
    pdf.cell(0, 5, _sanitize_text("Subalansuoti mitybos planai kasdien"), ln=True)
    pdf.cell(
        0,
        5,
        _sanitize_text("www.fitbite.lt · info@fitbite.lt · +370 600 00000"),
        ln=True,
    )
    _draw_divider(pdf)

    # Payment metadata
    _section_title(pdf, "Apmokejimo duomenys")
    _key_value(pdf, "Kvito numeris", f"FIT-{purchase.id:06d}")
    _key_value(
        pdf,
        "Patvirtinta",
        (purchase.paid_at or purchase.created_at).strftime("%Y-%m-%d %H:%M"),
    )
    if purchase.transaction_reference:
        _key_value(pdf, "Transakcijos kodas", purchase.transaction_reference)
    status_label = {
        "paid": "Apmoketa",
        "pending": "Laukiama",
        "failed": "Nesekminga",
    }.get(purchase.status.lower(), purchase.status.title())
    _key_value(pdf, "Statusas", status_label)
    _draw_divider(pdf)

    # Buyer information
    _section_title(pdf, "Pirkėjo informacija")
    _key_value(pdf, "Vardas ir pavarde", purchase.buyer_full_name)
    _key_value(pdf, "El. pastas", purchase.buyer_email)
    if purchase.buyer_phone:
        _key_value(pdf, "Telefono numeris", purchase.buyer_phone)
    if purchase.invoice_needed:
        _key_value(pdf, "Saskaita faktura", "Taip")
        if purchase.company_name:
            _key_value(pdf, "Imone", purchase.company_name)
        if purchase.company_code:
            _key_value(pdf, "Imones kodas", purchase.company_code)
        if purchase.vat_code:
            _key_value(pdf, "PVM kodas", purchase.vat_code)
    else:
        _key_value(pdf, "Saskaita faktura", "Ne")
    _draw_divider(pdf)

    # Plan details
    _section_title(pdf, "Plano santrauka")
    _key_value(pdf, "Planas", purchase.plan_name_snapshot)
    _key_value(pdf, "Periodo trukme", f"{purchase.period_days} dienu")
    _key_value(pdf, "Mokejimo budas", purchase.payment_method.replace("_", " ").title())
    _key_value(pdf, "Bazine kaina", f"{purchase.base_price:.2f} {purchase.currency}")
    if purchase.discount_amount_cents:
        label = purchase.discount_label or "Nuolaida"
        discount_line = f"{label}: -{purchase.discount_amount:.2f} {purchase.currency}"
        if purchase.discount_code:
            discount_line += f" (kodas {purchase.discount_code})"
        _key_value(pdf, "Pritaikyta nuolaida", discount_line)
    price_per_day = None
    if purchase.period_days:
        price_per_day = purchase.total_price / purchase.period_days
    if price_per_day:
        _key_value(pdf, "Kaina dienai", f"{price_per_day:.2f} {purchase.currency}")
    pdf.set_fill_color(222, 247, 236)
    pdf.set_text_color(22, 101, 52)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(
        0,
        9,
        _sanitize_text(
            f"Galutinė suma: {purchase.total_price:.2f} {purchase.currency}"
        ),
        ln=True,
        fill=True,
        align="C",
    )
    pdf.ln(4)
    pdf.set_text_color(17, 24, 39)

    _section_title(pdf, "Savaites meniu")

    grouped: dict[str, list[PlanPurchaseItem]] = defaultdict(list)
    for item in items:
        grouped[item.day_of_week].append(item)

    for day in [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ]:
        day_items = grouped.get(day)
        if not day_items:
            continue

        pdf.set_font("Helvetica", "B", 11)
        pdf.set_fill_color(234, 234, 255)
        pdf.set_text_color(55, 48, 163)
        pdf.cell(
            0, 7, _sanitize_text(DAY_LABELS.get(day, day.title())), ln=True, fill=True
        )
        pdf.set_text_color(17, 24, 39)
        pdf.ln(1)

        for item in day_items:
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(
                0,
                5,
                _sanitize_text(f"{item.meal_type.title()}: {item.meal_title}"),
                ln=True,
            )
            if item.meal_description:
                pdf.set_font("Helvetica", "", 10)
                _wrap_text(pdf, item.meal_description, width=180)
            macro_chunks: list[str] = []
            if item.calories:
                macro_chunks.append(f"{item.calories} kcal")
            if item.protein_grams:
                macro_chunks.append(f"{item.protein_grams} g baltymų")
            if item.carbs_grams:
                macro_chunks.append(f"{item.carbs_grams} g angliavandenių")
            if item.fats_grams:
                macro_chunks.append(f"{item.fats_grams} g riebalų")
            if macro_chunks:
                pdf.set_font("Helvetica", "I", 9)
                pdf.set_text_color(107, 114, 128)
                pdf.cell(0, 5, _sanitize_text(" · ".join(macro_chunks)), ln=True)
                pdf.set_text_color(17, 24, 39)
            pdf.ln(1)
        pdf.ln(2)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(107, 114, 128)
    pdf.multi_cell(
        0,
        5,
        txt=_sanitize_text(
            "Sis dokumentas yra automatiskai sugeneruotas pirkimo patvirtinimas. Jei turite klausimu ar norite plano korekciju, rasykite info@fitbite.lt"
        ),
    )

    pdf.output(str(output_path))

    return str(output_path.relative_to(MEDIA_ROOT))
