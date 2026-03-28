# 📄 MÓDULO: Generación de PDF

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> **Implementado en:** APP.PRESTAMISTA, DM Cars

---

## DESCRIPCIÓN

Módulo para generación de documentos PDF en proyectos. Dos enfoques según el stack del proyecto.

---

## ENFOQUE A: WeasyPrint + Jinja2 (FastAPI)

**Usar cuando:** Stack FastAPI. Máxima flexibilidad y calidad para documentos complejos.

### Instalación

```bash
# requirements.txt
weasyprint==62.3
jinja2==3.1.4
```

### Estructura de archivos

```
backend/
├── templates/
│   └── pdf/
│       ├── base.html          ← Template base con CSS
│       ├── contrato.html      ← Template de contrato
│       └── estado_cuenta.html ← Estado de cuenta
├── services/
│   └── pdf_service.py
└── routers/
    └── documentos.py
```

### Servicio de PDF

```python
# services/pdf_service.py
from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader
import os

class PDFService:
    def __init__(self):
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates', 'pdf')
        self.env = Environment(loader=FileSystemLoader(template_dir))

    def generar(self, template_name: str, context: dict) -> bytes:
        template = self.env.get_template(template_name)
        html_content = template.render(**context)
        pdf = HTML(string=html_content).write_pdf()
        return pdf
```

### Endpoint para descarga

```python
# routers/documentos.py
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from app.services.pdf_service import PDFService

router = APIRouter()

@router.get("/prestamos/{id}/contrato")
async def descargar_contrato(
    id: str,
    current_user=Depends(get_current_user),
    pdf_service: PDFService = Depends()
):
    # Obtener datos del préstamo
    prestamo = await obtener_prestamo(id)

    # Generar PDF
    pdf_bytes = pdf_service.generar("contrato.html", {
        "prestamo": prestamo,
        "fecha": datetime.now()
    })

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=contrato_{id}.pdf"}
    )
```

### Template HTML base

```html
<!-- templates/pdf/base.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      color: #333;
    }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
    }
  </style>
</head>
<body>
  {% block content %}{% endblock %}
</body>
</html>
```

### Guardar en Supabase Storage

```python
# Guardar PDF generado en Supabase Storage
async def guardar_pdf(supabase_client, pdf_bytes: bytes, filename: str) -> str:
    bucket_name = "documentos"
    path = f"contratos/{filename}"

    supabase_client.storage.from_(bucket_name).upload(
        path,
        pdf_bytes,
        {"content-type": "application/pdf"}
    )

    # Obtener URL firmada (válida 7 días)
    signed_url = supabase_client.storage.from_(bucket_name).create_signed_url(
        path, expires_in=604800
    )
    return signed_url['signedURL']
```

---

## ENFOQUE B: React-PDF / Puppeteer (Next.js)

**Usar cuando:** Stack Next.js y PDFs son simples (facturas, resúmenes básicos).

### Opción recomendada: API Route + HTML to PDF

```typescript
// app/api/documentos/[id]/route.ts
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Obtener datos
  const datos = await obtenerDatos(params.id)

  // Generar HTML
  const html = generarHTML(datos)

  // Retornar HTML para imprimir desde el cliente
  // O usar una librería server-side
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
```

---

## ALMACENAMIENTO EN SUPABASE STORAGE

```sql
-- Storage bucket para documentos
-- Crear en Supabase Dashboard: Storage → New Bucket → "documentos"
-- Privado: acceso solo con signed URLs

-- Política RLS para storage
CREATE POLICY "authenticated_can_read"
  ON storage.objects FOR SELECT
  USING (auth.role() = 'authenticated');
```

---

## CHECKLIST DE IMPLEMENTACIÓN

**Para FastAPI (WeasyPrint):**
- [ ] WeasyPrint y Jinja2 instalados
- [ ] Templates HTML creados en `/templates/pdf/`
- [ ] `PDFService` implementado
- [ ] Bucket en Supabase Storage configurado
- [ ] Endpoints de descarga creados y protegidos
- [ ] URLs firmadas con expiración configurada

**Para Next.js:**
- [ ] Estrategia de generación definida
- [ ] Bucket en Supabase Storage configurado
- [ ] API Route para generación creada

---
*Módulo v1.0 — Basado en APP.PRESTAMISTA y DM Cars*
