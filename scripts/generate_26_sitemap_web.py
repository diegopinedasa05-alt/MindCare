from __future__ import annotations

import html
import math
import textwrap
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "docs" / "tesis" / "diagramas"
DRAWIO_DIR = BASE / "drawio"
PNG_DIR = BASE / "png"
SVG_DIR = BASE / "svg"
PDF_DIR = BASE / "pdf"
DOC_DIR = BASE / "documentacion"

W = 1654
H = 930

COLORS = {
    "ink": "#172033",
    "muted": "#64748B",
    "line": "#C3D1DF",
    "lane": "#F5F8FB",
    "blue": "#1D66D1",
    "blue_soft": "#EAF2FF",
    "teal": "#0B8178",
    "teal_soft": "#E7F7F4",
    "amber": "#B87516",
    "amber_soft": "#FFF4DF",
    "gray": "#7A8798",
    "gray_soft": "#F5F6F8",
    "green": "#15803D",
    "green_soft": "#F0FDF4",
    "red": "#C92A2A",
}


def node(node_id, label, x, y, w, h, state="active", kind="screen"):
    if kind == "lane":
        fill, stroke = COLORS["lane"], COLORS["line"]
    elif state == "orphan":
        fill, stroke = COLORS["gray_soft"], COLORS["gray"]
    elif state == "partial":
        fill, stroke = COLORS["amber_soft"], COLORS["amber"]
    elif state == "shared":
        fill, stroke = COLORS["teal_soft"], COLORS["teal"]
    elif state == "external":
        fill, stroke = COLORS["green_soft"], COLORS["green"]
    elif state == "auth":
        fill, stroke = COLORS["blue_soft"], COLORS["blue"]
    else:
        fill, stroke = "#FFFFFF", COLORS["blue"]
    return {
        "id": node_id,
        "label": label,
        "x": x,
        "y": y,
        "w": w,
        "h": h,
        "fill": fill,
        "stroke": stroke,
        "state": state,
        "kind": kind,
    }


def edge(edge_id, source, target, label="", dashed=False):
    return {
        "id": edge_id,
        "source": source,
        "target": target,
        "label": label,
        "dashed": dashed,
    }


def page_general():
    n = [
        node("p1-public", "Acceso público", 32, 128, 360, 366, kind="lane"),
        node("p1-login", "login.html\n/login.html\nPúblico", 55, 188, 314, 58, "auth"),
        node("p1-register", "registro.html\n/registro.html\nPúblico", 55, 258, 314, 58),
        node("p1-recover", "recuperar.html\n/recuperar.html\nPúblico", 55, 328, 314, 58),
        node("p1-terms", "terminos.html\n/terminos.html\nPúblico", 55, 398, 314, 58),
        node("p1-user", "Usuario autenticado", 420, 128, 360, 366, kind="lane"),
        node("p1-user-dashboard", "dashboard.html\n/dashboard.html\nUsuario + JWT", 440, 188, 150, 58, "auth"),
        node("p1-user-emotion", "registroEmocional.html\n/registroEmocional.html", 610, 188, 150, 58),
        node("p1-user-test", "test.html\n/test.html", 440, 266, 150, 58),
        node("p1-user-psych", "psicologos.html\n/psicologos.html", 610, 266, 150, 58),
        node("p1-user-appointments", "citas.html\n/citas.html\nConsulta", 440, 344, 150, 58),
        node("p1-user-history", "historialusuario.html\n?id={id}", 610, 344, 150, 58, "shared"),
        node("p1-psych", "Psicólogo", 808, 128, 360, 366, kind="lane"),
        node("p1-psych-dashboard", "dashboardPsicologo.html\n/psicologo/dashboardPsicologo.html\nPsicologo, Admin", 828, 188, 320, 58, "auth"),
        node("p1-psych-patient", "paciente.html\n/psicologo/paciente.html?id={id}\nRuta existente", 828, 266, 320, 58, "orphan"),
        node("p1-psych-appointments", "citas.html\n/psicologo/citas.html\nCrear por psicólogo", 828, 344, 320, 58, "orphan"),
        node("p1-admin", "Administrador", 1196, 128, 420, 366, kind="lane"),
        node("p1-admin-dashboard", "admin.html\n/admin.html\nAdmin + JWT", 1218, 188, 376, 58, "auth"),
        node("p1-admin-modal", "Nuevo Psicólogo\nModal interno de admin.html", 1218, 266, 180, 58, "shared"),
        node("p1-admin-high", "adminPsicologos.html\n/psicologo/adminPsicologos.html\nEnlace Alta detallada", 1414, 266, 180, 58),
        node("p1-admin-history", "historialusuario.html\n?id={id}\nConsulta administrativa", 1218, 344, 376, 58, "shared"),
        node("p1-auth", "POST /api/Auth/login\nGuarda JWT, usuarioId y rol", 55, 544, 250, 62, "auth", "process"),
        node("p1-route-user", "rol = Usuario\n→ dashboard.html", 70, 690, 280, 58, "auth"),
        node("p1-route-psych", "rol = Psicologo\n→ psicologo/dashboardPsicologo.html", 550, 690, 360, 58, "auth"),
        node("p1-route-admin", "rol = Admin\n→ admin.html", 1120, 690, 300, 58, "auth"),
        node("p1-boundary", "Límite del sitemap: páginas web reales de MindCare.\nLa API y PostgreSQL son consumidos por las pantallas; no son páginas.", 360, 820, 940, 52, "shared", "note"),
    ]
    e = [
        edge("p1-e-login-register", "p1-login", "p1-register", "crear cuenta"),
        edge("p1-e-login-recover", "p1-login", "p1-recover", "recuperar"),
        edge("p1-e-login-terms", "p1-login", "p1-terms", "legal"),
        edge("p1-e-register-terms", "p1-register", "p1-terms", "aceptar"),
        edge("p1-e-register-login", "p1-register", "p1-login", "volver"),
        edge("p1-e-recover-login", "p1-recover", "p1-login", "volver"),
        edge("p1-e-terms-login", "p1-terms", "p1-login", "volver"),
        edge("p1-e-login-auth", "p1-login", "p1-auth", "credenciales"),
        edge("p1-e-user-history", "p1-user-dashboard", "p1-user-history", "expediente"),
        edge("p1-e-admin-history", "p1-admin-dashboard", "p1-admin-history", "abrir expediente"),
        edge("p1-e-admin-high", "p1-admin-dashboard", "p1-admin-high", "Alta detallada"),
        edge("p1-e-admin-modal", "p1-admin-dashboard", "p1-admin-modal", "modal"),
        edge("p1-e-user-route", "p1-auth", "p1-route-user", "Usuario"),
        edge("p1-e-psych-route", "p1-auth", "p1-route-psych", "Psicologo"),
        edge("p1-e-admin-route", "p1-auth", "p1-route-admin", "Admin"),
    ]
    return n, e


def page_user():
    n = [
        node("p2-access", "Acceso / autenticación", 40, 128, 280, 682, kind="lane"),
        node("p2-login", "login.html\nPúblico", 70, 230, 220, 64, "auth"),
        node("p2-auth", "POST /api/Auth/login\nJWT + rol", 70, 350, 220, 64, "auth", "process"),
        node("p2-user", "Navegación usuario autenticado", 350, 128, 1260, 682, kind="lane"),
        node("p2-dashboard", "dashboard.html\nInicio / panel usuario", 410, 235, 280, 80, "auth"),
        node("p2-menu", "Menú del dashboard\nInicio · Registro · Tests · Psicólogos · Mis citas · Expediente", 410, 500, 300, 82, "shared", "process"),
        node("p2-emotion", "registroEmocional.html\nRegistrar estado emocional", 780, 180, 300, 66),
        node("p2-test", "test.html\nPHQ-9 y estrés", 1140, 180, 300, 66),
        node("p2-psych", "psicologos.html\nDirectorio y contacto", 780, 350, 300, 66),
        node("p2-appointments", "citas.html\nMis citas: solo consulta", 1140, 350, 300, 66),
        node("p2-history", "historialusuario.html?id={id}\nExpediente propio", 780, 520, 300, 66, "shared"),
        node("p2-whatsapp", "WhatsApp\nhttps://wa.me/52...\nEnlace externo real", 1140, 520, 300, 66, "external"),
        node("p2-rule", "Regla de agenda\nEl usuario contacta al psicólogo.\nEl psicólogo asigna y crea la cita.", 600, 690, 660, 74, "shared", "note"),
    ]
    e = [
        edge("p2-e-login-auth", "p2-login", "p2-auth", "credenciales"),
        edge("p2-e-auth-dashboard", "p2-auth", "p2-dashboard", "rol Usuario"),
        edge("p2-e-dashboard-menu", "p2-dashboard", "p2-menu", "menú actual"),
        edge("p2-e-menu-emotion", "p2-menu", "p2-emotion", "Registro emocional"),
        edge("p2-e-menu-test", "p2-menu", "p2-test", "Evaluaciones"),
        edge("p2-e-menu-psych", "p2-menu", "p2-psych", "Psicólogos"),
        edge("p2-e-menu-appointments", "p2-menu", "p2-appointments", "Mis citas"),
        edge("p2-e-menu-history", "p2-menu", "p2-history", "Expediente"),
        edge("p2-e-psych-whatsapp", "p2-psych", "p2-whatsapp", "contactar", True),
        edge("p2-e-appointments-psych", "p2-appointments", "p2-psych", "contactar", True),
        edge("p2-e-rule", "p2-appointments", "p2-rule", "flujo clínico", True),
    ]
    return n, e


def page_psychologist():
    n = [
        node("p3-access", "Acceso / autenticación", 40, 128, 280, 682, kind="lane"),
        node("p3-login", "login.html\nPúblico", 70, 230, 220, 64, "auth"),
        node("p3-auth", "POST /api/Auth/login\nJWT + rol", 70, 350, 220, 64, "auth", "process"),
        node("p3-psych", "Navegación psicólogo", 350, 128, 1260, 682, kind="lane"),
        node("p3-dashboard", "psicologo/dashboardPsicologo.html\nPanel protegido\nPsicologo, Admin", 410, 215, 330, 82, "auth"),
        node("p3-tabs", "Vistas internas\nSeguimiento · Analítica · Pacientes y agenda", 410, 350, 330, 72, "shared", "process"),
        node("p3-history", "historialusuario.html?id={id}\nExpediente del paciente", 830, 215, 330, 82, "shared"),
        node("p3-appointment-modal", "Agenda integrada\nModal crearCita() del panel", 830, 350, 330, 72, "shared", "process"),
        node("p3-patient-legacy", "psicologo/paciente.html?id={id}\nArchivo existente\nSin enlace directo localizado", 830, 520, 330, 82, "orphan"),
        node("p3-appointments-legacy", "psicologo/citas.html\nCrear cita por psicólogo\nSin enlace directo localizado", 1230, 215, 330, 82, "orphan"),
        node("p3-note", "La navegación activa del panel usa expediente y agenda integrada.\nLas dos pantallas punteadas se conservan como rutas existentes.", 1200, 385, 360, 100, "shared", "note"),
    ]
    e = [
        edge("p3-e-login-auth", "p3-login", "p3-auth", "credenciales"),
        edge("p3-e-auth-dashboard", "p3-auth", "p3-dashboard", "rol Psicologo"),
        edge("p3-e-dashboard-tabs", "p3-dashboard", "p3-tabs", "cambiar vista"),
        edge("p3-e-dashboard-history", "p3-dashboard", "p3-history", "abrir expediente"),
        edge("p3-e-dashboard-modal", "p3-dashboard", "p3-appointment-modal", "crear cita"),
        edge("p3-e-note", "p3-dashboard", "p3-note", "rutas conservadas", True),
    ]
    return n, e


def page_admin():
    n = [
        node("p4-access", "Acceso / autenticación", 40, 128, 280, 682, kind="lane"),
        node("p4-login", "login.html\nPúblico", 70, 230, 220, 64, "auth"),
        node("p4-auth", "POST /api/Auth/login\nJWT + rol", 70, 350, 220, 64, "auth", "process"),
        node("p4-admin", "Navegación administrador", 350, 128, 1260, 682, kind="lane"),
        node("p4-dashboard", "admin.html\nPanel protegido\nOperaciones Admin", 410, 215, 330, 82, "auth"),
        node("p4-tabs", "Vistas internas\nResumen · Analítica IA · Gestión", 410, 350, 330, 72, "shared", "process"),
        node("p4-modal", "Nuevo Psicólogo\nModal interno de admin.html", 830, 215, 330, 82, "shared"),
        node("p4-high", "psicologo/adminPsicologos.html\n/psicologo/adminPsicologos.html\nAlta detallada enlazada", 1230, 215, 330, 82),
        node("p4-history", "historialusuario.html?id={id}\nAbrir expediente desde usuarios", 830, 350, 330, 72, "shared"),
        node("p4-note", "Acceso de pantalla: token local.\nLa autorización operativa se valida en la API con [Authorize(Roles = \"Admin\")].", 600, 520, 660, 74, "shared", "note"),
    ]
    e = [
        edge("p4-e-login-auth", "p4-login", "p4-auth", "credenciales"),
        edge("p4-e-auth-dashboard", "p4-auth", "p4-dashboard", "rol Admin"),
        edge("p4-e-dashboard-tabs", "p4-dashboard", "p4-tabs", "cambiar vista"),
        edge("p4-e-dashboard-modal", "p4-dashboard", "p4-modal", "abrir modal"),
        edge("p4-e-dashboard-high", "p4-dashboard", "p4-high", "Alta detallada"),
        edge("p4-e-dashboard-history", "p4-dashboard", "p4-history", "abrir expediente"),
        edge("p4-e-note", "p4-dashboard", "p4-note", "regla de acceso", True),
    ]
    return n, e


PAGES = [
    ("Sitemap general", page_general),
    ("Navegación del usuario", page_user),
    ("Navegación del psicólogo", page_psychologist),
    ("Navegación del administrador", page_admin),
]


def wrap_label(label, width_chars):
    lines = []
    for paragraph in label.split("\n"):
        if not paragraph:
            lines.append("")
        else:
            lines.extend(textwrap.wrap(paragraph, width=max(10, width_chars), break_long_words=False) or [""])
    return lines


def xml_value(label):
    return html.escape(label).replace("\n", "&lt;br&gt;")


def drawio_style(item):
    if item["kind"] == "lane":
        return f"rounded=1;whiteSpace=wrap;html=1;fillColor={item['fill']};strokeColor={item['stroke']};fontColor={COLORS['ink']};fontStyle=1;align=left;verticalAlign=top;spacingTop=12;spacingLeft=14;"
    dashed = "dashed=1;" if item["state"] == "orphan" else ""
    radius = "rounded=1;"
    if item["kind"] == "note":
        radius = "rounded=1;"
    return f"{radius}whiteSpace=wrap;html=1;fillColor={item['fill']};strokeColor={item['stroke']};fontColor={COLORS['ink']};fontSize=13;align=center;verticalAlign=middle;spacing=8;{dashed}"


def page_xml(index, name, nodes, edges):
    title_layer = f"title-layer-{index}"
    content_layer = f"content-layer-{index}"
    parts = [
        f'<diagram id="sitemap-{index}" name="{html.escape(name)}">',
        '<mxGraphModel dx="1654" dy="930" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="930" math="0" shadow="0">',
        "<root>",
        '<mxCell id="0"/>',
        f'<mxCell id="{content_layer}" value="Contenido" parent="0"/>',
        f'<mxCell id="{title_layer}" value="Título y leyenda" parent="0"/>',
        f'<mxCell id="title-{index}" value="{xml_value(f"26 · Sitemap web MindCare · {name}")}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontColor={COLORS["ink"]};fontSize=24;fontStyle=1;" vertex="1" parent="{title_layer}"><mxGeometry x="32" y="22" width="1000" height="34" as="geometry"/></mxCell>',
        f'<mxCell id="subtitle-{index}" value="{xml_value("Arquitectura de información derivada de archivos HTML, JavaScript y control de acceso real del repositorio")}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontColor={COLORS["muted"]};fontSize=12;" vertex="1" parent="{title_layer}"><mxGeometry x="34" y="58" width="1050" height="24" as="geometry"/></mxCell>',
    ]
    legend = [
        ("active", "Ruta implementada", COLORS["blue_soft"], COLORS["blue"]),
        ("shared", "Ruta compartida / vista interna", COLORS["teal_soft"], COLORS["teal"]),
        ("orphan", "Archivo existente sin enlace directo", COLORS["gray_soft"], COLORS["gray"]),
    ]
    lx = 1110
    for pos, (_, label, fill, stroke) in enumerate(legend):
        x = lx + pos * 174
        parts.append(f'<mxCell id="legend-box-{index}-{pos}" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};" vertex="1" parent="{title_layer}"><mxGeometry x="{x}" y="28" width="16" height="16" as="geometry"/></mxCell>')
        parts.append(f'<mxCell id="legend-text-{index}-{pos}" value="{xml_value(label)}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontColor={COLORS["muted"]};fontSize=10;" vertex="1" parent="{title_layer}"><mxGeometry x="{x+22}" y="24" width="145" height="24" as="geometry"/></mxCell>')

    for item in nodes:
        parts.append(f'<mxCell id="{item["id"]}" value="{xml_value(item["label"])}" style="{drawio_style(item)}" vertex="1" parent="{content_layer}"><mxGeometry x="{item["x"]}" y="{item["y"]}" width="{item["w"]}" height="{item["h"]}" as="geometry"/></mxCell>')
    for item in edges:
        dashed = "dashed=1;" if item["dashed"] else ""
        label = xml_value(item["label"])
        parts.append(f'<mxCell id="{item["id"]}" value="{label}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;strokeColor={COLORS["blue"]};strokeWidth=1.5;{dashed}" edge="1" parent="{content_layer}" source="{item["source"]}" target="{item["target"]}"><mxGeometry relative="1" as="geometry"/></mxCell>')

    parts.append(f'<mxCell id="footer-{index}" value="{xml_value("Nota. Elaboración propia a partir del repositorio real de MindCare. Las rutas punteadas son archivos existentes sin navegación activa localizada.")}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontColor={COLORS["muted"]};fontSize=10;" vertex="1" parent="{title_layer}"><mxGeometry x="34" y="890" width="1400" height="22" as="geometry"/></mxCell>')
    parts.extend(["</root>", "</mxGraphModel>", "</diagram>"])
    return "".join(parts)


def build_drawio():
    pages = []
    for index, (name, factory) in enumerate(PAGES, start=1):
        nodes, edges = factory()
        pages.append(page_xml(index, name, nodes, edges))
    return (
        '<mxfile host="app.diagrams.net" modified="2026-07-20T00:00:00.000Z" agent="MindCare documentation generator" version="24.7.17" type="device">'
        + "".join(pages)
        + "</mxfile>"
    )


def svg_text(x, y, label, size=13, color=None, weight="400", width_chars=30, anchor="middle"):
    color = color or COLORS["ink"]
    lines = wrap_label(label, width_chars)
    line_height = size + 3
    start_y = y - ((len(lines) - 1) * line_height) / 2
    tspans = []
    for index, line in enumerate(lines):
        tspans.append(f'<tspan x="{x}" dy="{0 if index == 0 else line_height}">{html.escape(line)}</tspan>')
    return f'<text x="{x}" y="{start_y}" text-anchor="{anchor}" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="{size}px" font-weight="{weight}" fill="{color}">{"".join(tspans)}</text>'


def make_svg(nodes, edges, title):
    by_id = {item["id"]: item for item in nodes}
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
    out.append(f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>')
    out.append(svg_text(32, 34, f"26 · Sitemap web MindCare · {title}", 24, COLORS["ink"], "700", 100, "start"))
    out.append(svg_text(34, 69, "Arquitectura de información derivada de archivos HTML, JavaScript y control de acceso real del repositorio", 12, COLORS["muted"], "400", 120, "start"))
    lx = 1110
    for pos, (label, fill, stroke) in enumerate([
        ("Ruta implementada", COLORS["blue_soft"], COLORS["blue"]),
        ("Ruta compartida / vista interna", COLORS["teal_soft"], COLORS["teal"]),
        ("Archivo sin enlace directo", COLORS["gray_soft"], COLORS["gray"]),
    ]):
        x = lx + pos * 174
        out.append(f'<rect x="{x}" y="28" width="16" height="16" rx="3" fill="{fill}" stroke="{stroke}"/>')
        out.append(svg_text(x + 22, 36, label, 10, COLORS["muted"], "400", 22, "start"))
    out.append('<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#1D66D1"/></marker></defs>')

    # Draw swimlane backgrounds before connectors so the arrows remain visible.
    for item in nodes:
        if item["kind"] != "lane":
            continue
        out.append(f'<rect x="{item["x"]}" y="{item["y"]}" width="{item["w"]}" height="{item["h"]}" rx="10" fill="{item["fill"]}" stroke="{item["stroke"]}" stroke-width="1.4"/>')
        out.append(svg_text(item["x"] + 14, item["y"] + 20, item["label"], 14, COLORS["ink"], "700", 36, "start"))

    for item in edges:
        a, b = by_id[item["source"]], by_id[item["target"]]
        x1, y1 = a["x"] + a["w"] / 2, a["y"] + a["h"] / 2
        x2, y2 = b["x"] + b["w"] / 2, b["y"] + b["h"] / 2
        if abs(x2 - x1) >= abs(y2 - y1):
            sx = a["x"] + (a["w"] if x2 > x1 else 0)
            sy = y1
            tx = b["x"] + (0 if x2 > x1 else b["w"])
            ty = y2
            mid = (sx + tx) / 2
            path = f"M {sx} {sy} L {mid} {sy} L {mid} {ty} L {tx} {ty}"
            lx2, ly2 = mid, (sy + ty) / 2 - 4
        else:
            sx = x1
            sy = a["y"] + (a["h"] if y2 > y1 else 0)
            tx = x2
            ty = b["y"] + (0 if y2 > y1 else b["h"])
            mid = (sy + ty) / 2
            path = f"M {sx} {sy} L {sx} {mid} L {tx} {mid} L {tx} {ty}"
            lx2, ly2 = (sx + tx) / 2, mid - 4
        dash = ' stroke-dasharray="7 5"' if item["dashed"] else ""
        out.append(f'<path d="{path}" fill="none" stroke="#1D66D1" stroke-width="1.6" marker-end="url(#arrow)"{dash}/>')
        if item["label"]:
            out.append(svg_text(lx2, ly2, item["label"], 9, COLORS["muted"], "400", 22))
    for item in nodes:
        if item["kind"] == "lane":
            continue
        rx = 12 if item["kind"] != "lane" else 10
        dash = ' stroke-dasharray="7 5"' if item["state"] == "orphan" else ""
        out.append(f'<rect x="{item["x"]}" y="{item["y"]}" width="{item["w"]}" height="{item["h"]}" rx="{rx}" fill="{item["fill"]}" stroke="{item["stroke"]}" stroke-width="1.4"{dash}/>')
        width_chars = max(14, int(item["w"] / 8.2))
        out.append(svg_text(item["x"] + item["w"] / 2, item["y"] + item["h"] / 2, item["label"], 13 if item["w"] < 250 else 14, COLORS["ink"], "600", width_chars))
    out.append(svg_text(34, 901, "Nota. Elaboración propia a partir del repositorio real de MindCare. Las rutas punteadas son archivos existentes sin navegación activa localizada.", 10, COLORS["muted"], "400", 150, "start"))
    out.append("</svg>")
    return "".join(out)


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def render_png(nodes, edges, title, path):
    scale = 3
    image = Image.new("RGB", (W * scale, H * scale), "white")
    draw = ImageDraw.Draw(image)
    regular_path = r"C:\Windows\Fonts\segoeui.ttf"
    bold_path = r"C:\Windows\Fonts\segoeuib.ttf"
    f_title = font(bold_path, 24 * scale)
    f_sub = font(regular_path, 12 * scale)
    f_lane = font(bold_path, 14 * scale)
    f_node = font(bold_path, 13 * scale)
    f_small = font(regular_path, 10 * scale)
    by_id = {item["id"]: item for item in nodes}

    def sx(value):
        return int(value * scale)

    draw.text((sx(32), sx(19)), f"26 · Sitemap web MindCare · {title}", fill=COLORS["ink"], font=f_title)
    draw.text((sx(34), sx(57)), "Arquitectura de información derivada de archivos HTML, JavaScript y control de acceso real del repositorio", fill=COLORS["muted"], font=f_sub)
    for pos, (label, fill, stroke) in enumerate([
        ("Ruta implementada", COLORS["blue_soft"], COLORS["blue"]),
        ("Ruta compartida / vista interna", COLORS["teal_soft"], COLORS["teal"]),
        ("Archivo sin enlace directo", COLORS["gray_soft"], COLORS["gray"]),
    ]):
        x = 1110 + pos * 174
        draw.rounded_rectangle((sx(x), sx(28), sx(x + 16), sx(44)), radius=sx(3), fill=fill, outline=stroke, width=sx(1))
        draw.text((sx(x + 22), sx(26)), label, fill=COLORS["muted"], font=f_small)

    # Draw swimlane backgrounds before connectors so the arrows remain visible.
    for item in nodes:
        if item["kind"] != "lane":
            continue
        box = (sx(item["x"]), sx(item["y"]), sx(item["x"] + item["w"]), sx(item["y"] + item["h"]))
        draw.rounded_rectangle(box, radius=sx(10), fill=item["fill"], outline=item["stroke"], width=sx(2))
        draw.text((sx(item["x"] + 14), sx(item["y"] + 8)), item["label"], fill=COLORS["ink"], font=f_lane)

    def draw_arrow(a, b, dashed=False):
        x1, y1 = a["x"] + a["w"] / 2, a["y"] + a["h"] / 2
        x2, y2 = b["x"] + b["w"] / 2, b["y"] + b["h"] / 2
        if abs(x2 - x1) >= abs(y2 - y1):
            sx1, sy1 = a["x"] + (a["w"] if x2 > x1 else 0), y1
            tx, ty = b["x"] + (0 if x2 > x1 else b["w"]), y2
            mid = (sx1 + tx) / 2
            points = [(sx(sx1), sx(sy1)), (sx(mid), sx(sy1)), (sx(mid), sx(ty)), (sx(tx), sx(ty))]
            label_x, label_y = mid, (sy1 + ty) / 2 - 8
        else:
            sx1, sy1 = x1, a["y"] + (a["h"] if y2 > y1 else 0)
            tx, ty = x2, b["y"] + (0 if y2 > y1 else b["h"])
            mid = (sy1 + ty) / 2
            points = [(sx(sx1), sx(sy1)), (sx(sx1), sx(mid)), (sx(tx), sx(mid)), (sx(tx), sx(ty))]
            label_x, label_y = (sx1 + tx) / 2, mid - 8
        draw.line(points, fill=COLORS["blue"], width=sx(2), joint="curve")
        end_x, end_y = points[-1]
        draw.polygon([(end_x, end_y), (end_x - sx(7), end_y - sx(4)), (end_x - sx(7), end_y + sx(4))], fill=COLORS["blue"])
        if dashed:
            # A solid route is retained in the raster export for readability; the node border carries the legacy marker.
            pass

    for item in edges:
        draw_arrow(by_id[item["source"]], by_id[item["target"]], item["dashed"])

    for item in nodes:
        if item["kind"] == "lane":
            continue
        box = (sx(item["x"]), sx(item["y"]), sx(item["x"] + item["w"]), sx(item["y"] + item["h"]))
        radius = sx(10 if item["kind"] == "lane" else 12)
        draw.rounded_rectangle(box, radius=radius, fill=item["fill"], outline=item["stroke"], width=sx(2))
        lines = wrap_label(item["label"], max(14, int(item["w"] / 8.2)))
        line_height = 16 * scale
        total = len(lines) * line_height
        y = sx(item["y"] + item["h"] / 2) - total / 2
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=f_node)
            x = sx(item["x"] + item["w"] / 2) - (bbox[2] - bbox[0]) / 2
            draw.text((x, y), line, fill=COLORS["ink"], font=f_node)
            y += line_height
    draw.text((sx(34), sx(890)), "Nota. Elaboración propia a partir del repositorio real de MindCare. Las rutas punteadas son archivos existentes sin navegación activa localizada.", fill=COLORS["muted"], font=f_small)
    image.save(path, dpi=(300, 300))


def render_pdf(page_data, path):
    page_w, page_h = landscape(A3)
    pdf = canvas.Canvas(str(path), pagesize=(page_w, page_h))
    scale_x, scale_y = page_w / W, page_h / H
    regular = r"C:\Windows\Fonts\segoeui.ttf"
    bold = r"C:\Windows\Fonts\segoeuib.ttf"
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        pdfmetrics.registerFont(TTFont("SegoeUI", regular))
        pdfmetrics.registerFont(TTFont("SegoeUI-Bold", bold))
        regular_name, bold_name = "SegoeUI", "SegoeUI-Bold"
    except Exception:
        regular_name, bold_name = "Helvetica", "Helvetica-Bold"

    def px(x): return x * scale_x
    def py(y): return page_h - y * scale_y

    for title, (nodes, edges) in page_data:
        pdf.setFillColor(colors.white)
        pdf.rect(0, 0, page_w, page_h, fill=1, stroke=0)
        pdf.setFillColor(colors.HexColor(COLORS["ink"]))
        pdf.setFont(bold_name, 18)
        pdf.drawString(px(32), py(38), f"26 · Sitemap web MindCare · {title}")
        pdf.setFillColor(colors.HexColor(COLORS["muted"]))
        pdf.setFont(regular_name, 8.5)
        pdf.drawString(px(34), py(70), "Arquitectura de información derivada de archivos HTML, JavaScript y control de acceso real del repositorio")
        by_id = {item["id"]: item for item in nodes}

        # Draw swimlane backgrounds before connectors so the arrows remain visible.
        for item in nodes:
            if item["kind"] != "lane":
                continue
            pdf.setFillColor(colors.HexColor(item["fill"]))
            pdf.setStrokeColor(colors.HexColor(item["stroke"]))
            pdf.roundRect(px(item["x"]), py(item["y"] + item["h"]), px(item["w"]), px(item["h"]), 6, fill=1, stroke=1)
            pdf.setFillColor(colors.HexColor(COLORS["ink"]))
            pdf.setFont(bold_name, 10)
            pdf.drawString(px(item["x"] + 14), py(item["y"] + 20), item["label"])

        for item in edges:
            a, b = by_id[item["source"]], by_id[item["target"]]
            x1, y1 = a["x"] + a["w"] / 2, a["y"] + a["h"] / 2
            x2, y2 = b["x"] + b["w"] / 2, b["y"] + b["h"] / 2
            pdf.setStrokeColor(colors.HexColor(COLORS["blue"]))
            pdf.setLineWidth(.7)
            if abs(x2 - x1) >= abs(y2 - y1):
                sx1, sy1 = a["x"] + (a["w"] if x2 > x1 else 0), y1
                tx, ty = b["x"] + (0 if x2 > x1 else b["w"]), y2
                mid = (sx1 + tx) / 2
                points = [(sx1, sy1), (mid, sy1), (mid, ty), (tx, ty)]
            else:
                sx1, sy1 = x1, a["y"] + (a["h"] if y2 > y1 else 0)
                tx, ty = x2, b["y"] + (0 if y2 > y1 else b["h"])
                mid = (sy1 + ty) / 2
                points = [(sx1, sy1), (sx1, mid), (tx, mid), (tx, ty)]
            pdf.line(px(points[0][0]), py(points[0][1]), px(points[1][0]), py(points[1][1]))
            pdf.line(px(points[1][0]), py(points[1][1]), px(points[2][0]), py(points[2][1]))
            pdf.line(px(points[2][0]), py(points[2][1]), px(points[3][0]), py(points[3][1]))
            ex, ey = points[-1]
            pdf.setFillColor(colors.HexColor(COLORS["blue"]))
            pdf.circle(px(ex), py(ey), 1.5, fill=1, stroke=0)
        for item in nodes:
            if item["kind"] == "lane":
                continue
            pdf.setFillColor(colors.HexColor(item["fill"]))
            pdf.setStrokeColor(colors.HexColor(item["stroke"]))
            pdf.roundRect(px(item["x"]), py(item["y"] + item["h"]), px(item["w"]), px(item["h"]), 6, fill=1, stroke=1)
            pdf.setFillColor(colors.HexColor(COLORS["ink"]))
            pdf.setFont(bold_name, 8)
            lines = wrap_label(item["label"], max(14, int(item["w"] / 8.2)))
            line_height = 10
            start = item["y"] + item["h"] / 2 + (len(lines) - 1) * line_height / 2
            for line in lines:
                text_w = stringWidth(line, bold_name, 8)
                pdf.drawString(px(item["x"] + item["w"] / 2) - text_w * scale_x / 2, py(start), line)
                start -= line_height
        pdf.setFillColor(colors.HexColor(COLORS["muted"]))
        pdf.setFont(regular_name, 7)
        pdf.drawString(px(34), py(903), "Nota. Elaboración propia a partir del repositorio real de MindCare. Las rutas punteadas son archivos existentes sin navegación activa localizada.")
        pdf.showPage()
    pdf.save()


SCREENS = [
    ("login.html", "/login.html", "Público", "login.html", "dashboard.html / psicologo/dashboardPsicologo.html / admin.html", "Público", "IMPLEMENTADO", "wwwroot/login.html; wwwroot/js/login.js"),
    ("registro.html", "/registro.html", "Público", "login.html", "login.html", "Público", "IMPLEMENTADO", "wwwroot/registro.html; wwwroot/js/registro.js"),
    ("recuperar.html", "/recuperar.html", "Público", "login.html", "login.html", "Público", "IMPLEMENTADO", "wwwroot/recuperar.html; wwwroot/js/recuperar.js"),
    ("terminos.html", "/terminos.html", "Público", "login.html / registro.html", "login.html", "Público", "IMPLEMENTADO", "wwwroot/terminos.html"),
    ("dashboard.html", "/dashboard.html", "Usuario", "login.html", "registroEmocional.html / test.html / psicologos.html / citas.html / historialusuario.html", "JWT + usuarioId; API protege datos", "IMPLEMENTADO", "wwwroot/dashboard.html; wwwroot/js/dashboard.js"),
    ("registroEmocional.html", "/registroEmocional.html", "Usuario", "dashboard.html", "dashboard.html", "JWT en solicitudes API", "IMPLEMENTADO", "wwwroot/registroEmocional.html; wwwroot/js/registroEmocional.js"),
    ("test.html", "/test.html", "Usuario", "dashboard.html", "dashboard.html", "JWT en solicitudes API", "IMPLEMENTADO", "wwwroot/test.html; wwwroot/js/test.js"),
    ("psicologos.html", "/psicologos.html", "Usuario autenticado", "dashboard.html", "dashboard.html / WhatsApp", "JWT; UsuariosController requiere [Authorize]", "IMPLEMENTADO", "wwwroot/psicologos.html; wwwroot/js/psicologos.js; Controllers/UsuariosController.cs"),
    ("citas.html", "/citas.html", "Usuario", "dashboard.html", "dashboard.html / psicologos.html", "JWT + usuarioId; consulta Citas/usuario/{id}", "IMPLEMENTADO", "wwwroot/citas.html; wwwroot/js/citasUsuario.js; wwwroot/css/citasUsuario.css"),
    ("historialusuario.html", "/historialusuario.html?id={id}", "Usuario / Psicólogo / Admin", "dashboard.html / dashboardPsicologo.html / admin.html", "pantalla de origen", "JWT + CanReadUserData(id)", "IMPLEMENTADO", "wwwroot/historialusuario.html; wwwroot/js/historialUsuario.js; Controllers/ExpedienteClinicoController.cs"),
    ("admin.html", "/admin.html", "Admin", "login.html", "historialusuario.html / adminPsicologos.html", "JWT; operaciones API requieren Admin", "IMPLEMENTADO", "wwwroot/admin.html; wwwroot/js/admin.js; Controllers/AdminController.cs"),
    ("dashboardPsicologo.html", "/psicologo/dashboardPsicologo.html", "Psicologo / Admin", "login.html", "historialusuario.html; vistas internas; agenda integrada", "JWT + Psicologo/Admin en API", "IMPLEMENTADO", "wwwroot/psicologo/dashboardPsicologo.html; wwwroot/js/dashboardPsicologo.js; Controllers/PsicologoDashboardController.cs"),
    ("paciente.html", "/psicologo/paciente.html?id={id}", "Psicologo / Admin", "ruta directa", "dashboardPsicologo.html", "JWT/API; sin enlace directo localizado", "IMPLEMENTADO · RUTA HUÉRFANA", "wwwroot/psicologo/paciente.html; wwwroot/psicologo/paciente.js"),
    ("citas.html (psicólogo)", "/psicologo/citas.html", "Psicologo / Admin", "ruta directa", "dashboardPsicologo.html", "JWT/API; sin enlace directo localizado", "IMPLEMENTADO · RUTA HUÉRFANA", "wwwroot/psicologo/citas.html; wwwroot/js/citas.js"),
    ("adminPsicologos.html", "/psicologo/adminPsicologos.html", "Admin", "admin.html", "admin.html", "JWT + rol Admin; enlace Alta detallada", "IMPLEMENTADO", "wwwroot/psicologo/adminPsicologos.html; wwwroot/js/adminPsicologos.js"),
]


def build_markdown():
    rows = []
    for i, (name, route, role, source, target, condition, state, files) in enumerate(SCREENS, start=1):
        rows.append(f"| {i:02d} | {name} | `{files.split(';')[0].replace('wwwroot/', '')}` | `{route}` | {role} | {source} | {target} | {condition} | {state} |")
    return f"""# Sitemap web MindCare

## Nombre del diagrama

**26. Sitemap o arquitectura de información de la aplicación web MindCare**

## Objetivo

Representar la navegación web que existe en el repositorio: páginas HTML, rutas relativas, redirecciones, menús, vistas internas de dashboards y condiciones de acceso observables en JavaScript y en la API.

## Alcance

Este sitemap cubre exclusivamente `AppTesisAPI/wwwroot` y las reglas de autorización de los controladores que respaldan sus pantallas. No agrega pantallas futuras ni trata la API o Neon PostgreSQL como páginas.

## Reglas verificadas

- `wwwroot/js/login.js` guarda `usuarioId`, `nombre`, `rol` y `token`, y redirige según `Admin`, `Psicologo` o usuario.
- `wwwroot/js/config.js` adjunta el Bearer token a las solicitudes `/api` y redirige a `login.html` ante HTTP 401.
- `AdminController.cs` exige `[Authorize(Roles = "Admin")]`.
- `PsicologoDashboardController.cs` exige `[Authorize(Roles = "Psicologo,Admin")]`.
- `UsuariosController.cs` exige `[Authorize]` para consultar psicólogos y `[Authorize(Roles = "Psicologo,Admin")]` para pacientes.
- `CitasController.cs` mantiene la creación de citas para psicólogo o administrador; el usuario consulta sus citas mediante `GET /api/Citas/usuario/{{id}}`.
- `citas.html` fue corregida para consulta: el usuario contacta al psicólogo y no crea la cita desde su panel.
- `adminPsicologos.html` quedó enlazada desde `admin.html` mediante **Alta detallada** y protegida por rol Admin en su JavaScript.

## Matriz de pantallas y navegación

| ID | Nombre | Archivo | Ruta | Rol | Pantalla de origen | Pantalla de destino | Condición de acceso | Estado |
|---|---|---|---|---|---|---|---|---|
{chr(10).join(rows)}

## Organización por áreas

### Acceso público

`login.html`, `registro.html`, `recuperar.html` y `terminos.html`.

### Usuario autenticado

`dashboard.html`, `registroEmocional.html`, `test.html`, `psicologos.html`, `citas.html` e `historialusuario.html?id={{id}}`.

### Psicólogo

`psicologo/dashboardPsicologo.html` y sus vistas internas. `psicologo/citas.html` y `psicologo/paciente.html?id={{id}}` se conservan como rutas existentes, pero no tienen enlace directo localizado en la navegación actual; se muestran punteadas en el diagrama.

### Administrador

`admin.html`, su modal interno de alta y `psicologo/adminPsicologos.html`, ahora enlazada desde el botón **Alta detallada**.

### Rutas compartidas y protegidas

`historialusuario.html?id={{id}}` es compartida por usuario, psicólogo y administrador, y sus datos dependen de `CanReadUserData(id)`. Las operaciones sensibles se autorizan en la API, aunque algunas páginas históricas solo realizan la comprobación de token en el cliente.

## Flujos principales

1. El visitante entra a `login.html`.
2. Puede crear cuenta, recuperar contraseña o consultar los términos.
3. Al iniciar sesión, `Auth/login` devuelve JWT y rol.
4. El cliente redirige al dashboard correspondiente.
5. El usuario registra emociones, responde evaluaciones, consulta psicólogos, contacta al profesional y revisa sus citas asignadas.
6. El psicólogo consulta pacientes, expedientes, alertas y agenda desde su panel; la creación de cita se realiza con el perfil profesional.
7. El administrador consulta indicadores, gestiona usuarios, psicólogos, citas, alertas y consentimientos.

## Flujos alternativos y errores visibles

- Credenciales incompletas o inválidas: mensaje en `login.html` y no se realiza redirección.
- Recuperación: `enviar-codigo` muestra el código demo solo en desarrollo; después de `recuperar`, vuelve a `login.html`.
- JWT ausente o expirado: `config.js` conduce a `/login.html` ante 401.
- Usuario sin permiso para datos ajenos: la API responde `Forbid()` en consultas protegidas.
- Ruta de expediente sin `id`: las pantallas dependientes regresan a su dashboard cuando su JavaScript lo contempla.
- Citas del usuario sin registros: `citasUsuario.js` muestra estado vacío y ofrece contacto con psicólogos.

## Archivos analizados

- `AppTesisAPI/wwwroot/*.html` y `AppTesisAPI/wwwroot/psicologo/*.html`.
- `AppTesisAPI/wwwroot/js/login.js`, `config.js`, `dashboard.js`, `citasUsuario.js`, `dashboardPsicologo.js`, `admin.js`, `adminPsicologos.js`, `historialUsuario.js`, `psicologos.js`, `test.js` y `registroEmocional.js`.
- `AppTesisAPI/Controllers/AuthController.cs`, `AdminController.cs`, `PsicologoDashboardController.cs`, `UsuariosController.cs`, `CitasController.cs`, `IAController.cs` y `ExpedienteClinicoController.cs`.

## Requerimientos e historias relacionadas

| Trazabilidad | Relación localizada |
|---|---|
| RF-01 | Acceso y autenticación de usuarios por correo y contraseña. |
| RF-02 | Registro de cuenta y aceptación de términos. |
| RF-03 | Recuperación de contraseña mediante código. |
| RF-04 | Registro emocional y evaluaciones psicológicas. |
| RF-05 | Consulta de psicólogos y contacto externo por WhatsApp. |
| RF-06 | Consulta de historial y citas según identidad y rol. |
| RF-07 | Gestión administrativa de usuarios, psicólogos, citas, alertas y consentimientos. |
| Scrum | Las pantallas reflejan módulos entregados y vistas internas de los dashboards; no se inventan sprints que no estén localizados en el repositorio. |

## Limitaciones y diferencias

- El control de rol más fuerte está en la API; no todas las páginas HTML tienen un guard de rol propio antes de renderizar.
- `psicologo/paciente.html` y `psicologo/citas.html` son archivos funcionales existentes, pero no se encontró un enlace directo desde el dashboard actual; por eso aparecen como rutas huérfanas punteadas.
- El SVG y el PNG entregados corresponden a la **Página 1: Sitemap general**. El archivo Draw.io y el PDF contienen las cuatro páginas.

## Ubicación recomendada en la tesis

Capítulo de análisis y diseño, apartado **Arquitectura de información y navegación del sistema**, antes de las capturas de las interfaces web.

## Formato para la tesis

**Figura 26**

**Sitemap o arquitectura de información de la aplicación web MindCare**

*Nota.* Elaboración propia mediante Draw.io a partir del análisis del repositorio de MindCare. La figura representa las páginas web implementadas, sus rutas, redirecciones y condiciones de acceso por perfil.
"""


def main():
    for directory in (DRAWIO_DIR, PNG_DIR, SVG_DIR, PDF_DIR, DOC_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    name = "26_sitemap_web"
    drawio_path = DRAWIO_DIR / f"{name}.drawio"
    png_path = PNG_DIR / f"{name}.png"
    svg_path = SVG_DIR / f"{name}.svg"
    pdf_path = PDF_DIR / f"{name}.pdf"
    md_path = DOC_DIR / f"{name}.md"

    drawio_path.write_text(build_drawio(), encoding="utf-8")
    page_data = []
    for title, factory in PAGES:
        page_data.append((title, factory()))
    svg_path.write_text(make_svg(page_data[0][1][0], page_data[0][1][1], page_data[0][0]), encoding="utf-8")
    render_png(page_data[0][1][0], page_data[0][1][1], page_data[0][0], png_path)
    render_pdf(page_data, pdf_path)
    md_path.write_text(build_markdown(), encoding="utf-8")

    # Parse the generated XML as a final structural check before reporting success.
    ET.fromstring(drawio_path.read_text(encoding="utf-8"))
    print(f"Generated: {drawio_path}")
    print(f"Generated: {png_path}")
    print(f"Generated: {svg_path}")
    print(f"Generated: {pdf_path}")
    print(f"Generated: {md_path}")


if __name__ == "__main__":
    main()
