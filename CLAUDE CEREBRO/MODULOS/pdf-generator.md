# MÓDULO: pdf-generator

## Descripción

Generación de documentos PDF desde el backend usando WeasyPrint + Jinja2. Los PDFs se generan en el servidor, se guardan en Supabase Storage y se sirven con URLs firmadas. Usado en DM Cars (boleto, cotización, acta entrega) y APP.PRESTAMISTA (contratos, recibos, tabla amortización).

## Stack
D (FastAPI) — no aplica en Stack B directamente (Next.js puede usar react-pdf o similar)

## Proyectos que lo usan
- DM Cars (CONSECIONARIA.MD) — boleto de compraventa, cotización, acta de entrega, contratos taller
- APP.PRESTAMISTA — contratos de préstamo, recibos de pago, tabla de amortización, reporte de cartera

---

## Dependencias

```txt
# requirements.txt
weasyprint==61.0
jinja2==3.1.4
```

## Estructura de archivos

```
backend/
├── app/
│   ├── services/
│   │   └── pdf_service.py      # lógica de generación
│   ├── templates/
│   │   ├── base.html           # template base con estilos
│   │   ├── contrato.html       # template de contrato
│   │   ├── recibo.html         # template de recibo
│   │   └── amortizacion.html   # template de tabla
│   └── routers/
│       └── documentos.py       # endpoints PDF
```

---

## Implementación

### Servicio base

```python
# app/services/pdf_service.py
import io
from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader
from supabase import create_client
import os
from datetime import datetime

env = Environment(loader=FileSystemLoader("app/templates"))

def generar_pdf(template_name: str, datos: dict) -> bytes:
    """Genera PDF y retorna bytes."""
    template = env.get_template(template_name)
    html_str = template.render(**datos)
    pdf_bytes = HTML(string=html_str, base_url=".").write_pdf()
    return pdf_bytes

async def generar_y_guardar(
    template_name: str,
    datos: dict,
    nombre_archivo: str,
    carpeta: str = "documentos"
) -> str:
    """Genera PDF, lo sube a Supabase Storage y retorna URL firmada."""
    pdf_bytes = generar_pdf(template_name, datos)

    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )

    path = f"{carpeta}/{nombre_archivo}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

    supabase.storage.from_("documentos").upload(
        path=path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf"}
    )

    # URL firmada válida por 1 hora
    signed = supabase.storage.from_("documentos").create_signed_url(path, 3600)
    return signed["signedURL"]
```

### Router FastAPI

```python
# app/routers/documentos.py
from fastapi import APIRouter, Depends
from app.services.pdf_service import generar_y_guardar
from app.core.auth import get_current_user

router = APIRouter(prefix="/documentos", tags=["documentos"])

@router.post("/generar/{tipo}")
async def generar_documento(
    tipo: str,
    datos: dict,
    user=Depends(get_current_user)
):
    templates = {
        "contrato": "contrato.html",
        "recibo": "recibo.html",
        "amortizacion": "amortizacion.html",
    }
    if tipo not in templates:
        raise HTTPException(400, "Tipo de documento inválido")

    url = await generar_y_guardar(
        template_name=templates[tipo],
        datos=datos,
        nombre_archivo=f"{tipo}_{datos.get('id', 'doc')}"
    )
    return {"url": url, "tipo": tipo}
```

### Template HTML base (Jinja2)

```html
<!-- app/templates/base.html -->
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 2cm; size: A4; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #333; }
  .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
  .logo { font-size: 20pt; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; }
  th { background: #f5f5f5; font-weight: bold; }
  .firma { margin-top: 50px; border-top: 1px solid #333; width: 200px; text-align: center; }
</style>
</head>
<body>{% block content %}{% endblock %}</body>
</html>
```

---

## Variables de entorno requeridas

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=   # necesita acceso a Storage
```

## Setup Supabase Storage

```sql
-- Crear bucket 'documentos' en Supabase Dashboard
-- Policy para que el backend (service role) pueda subir
-- Policy para que usuarios autenticados puedan leer sus documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);
```

## Consideraciones

- WeasyPrint requiere dependencias del SO: `libpango`, `libcairo`, `libgdk-pixbuf` (incluir en Dockerfile)
- Para imágenes en el PDF: usar base64 o rutas absolutas
- El bucket de Storage debe ser **privado** — siempre servir con URLs firmadas
- Para PDFs grandes (reportes de cartera), la generación puede tardar 2-5 segundos — considerar background task
- Los PDFs son documentos legales — nunca modificar ni eliminar una vez generados (soft delete en tabla `documentos`)

```dockerfile
# Agregar en Dockerfile para WeasyPrint
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 libcairo2 libffi-dev \
    && rm -rf /var/lib/apt/lists/*
```

## Historial de cambios

| Fecha | Cambio | Proyecto origen |
|-------|--------|----------------|
| 2026-03-28 | Módulo creado consolidando DM Cars + APP.PRESTAMISTA | CEREBRO |

*Madurez: ★★★★☆*
