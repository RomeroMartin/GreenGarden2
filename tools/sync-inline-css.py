#!/usr/bin/env python3
"""Copia base.css + home.css (minificados) dentro de index.html.

La home lleva sus estilos dentro del propio HTML para que el navegador no tenga
que esperar dos archivos CSS antes de dibujar la página. Las demás páginas siguen
usando base.css y pages.css por link.

Uso (desde cualquier carpeta):  python3 tools/sync-inline-css.py
Ejecutalo cada vez que edites base.css o home.css.
"""
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
INICIO, FIN = '<!-- inline-css:start -->', '<!-- inline-css:end -->'


def minificar(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{};,])\s*', r'\1', css)
    return css.replace(';}', '}').strip()


def main():
    css = ''.join(minificar((RAIZ / f).read_text(encoding='utf-8')) for f in ('base.css', 'home.css'))
    index = RAIZ / 'index.html'
    html = index.read_text(encoding='utf-8')
    patron = re.compile(re.escape(INICIO) + r'.*?' + re.escape(FIN), re.S)
    if not patron.search(html):
        raise SystemExit('No encontré las marcas %s / %s en index.html' % (INICIO, FIN))
    bloque = '%s\n  <style>%s</style>\n  %s' % (INICIO, css, FIN)
    index.write_text(patron.sub(lambda _: bloque, html), encoding='utf-8')
    print('index.html actualizado (%d KB de CSS)' % (len(css) // 1024))


if __name__ == '__main__':
    main()
