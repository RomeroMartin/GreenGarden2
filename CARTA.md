# Carta en HTML: guía de mantenimiento

La carta de **menu.html** ya no usa fotos de las hojas del PDF. Cada hoja es HTML real: Google puede leer cada plato, descripción y precio, y para cambiar un precio basta con editar un número.

Esta guía explica cómo está armada y cómo hacer los cambios habituales.

---

## 1. Qué hay y dónde

| Archivo | Qué contiene |
|---|---|
| `menu.html` | **Las hojas de la carta (platos, descripciones y precios).** Es el único lugar donde están los datos. |
| `carta.css` | El diseño de las hojas A4, el modal, el modo lectura, la impresión y los ajustes finos por hoja. |
| `carta.js` | Las miniaturas, el modal con flechas, el modo lectura, el deslizar para cambiar de hoja y la impresión. |
| `img/carta/` | Las imágenes que no son texto: logo, sello "masa casera", QR del playroom, punto de cocción, logos de cervezas e íconos Sin TACC y vegano. |
| `fonts/` | GreenFont (letras y números) y Source Sans 3 (Regular y Light Italic), con su licencia en `OFL-SourceSans3.txt`. |

En `menu.html` hay tres pestañas y cada una tiene su grilla de hojas, entre estos dos comentarios:

```html
<!-- HOJAS:INICIO ... -->
   ...hojas...
<!-- HOJAS:FIN -->
```

| Pestaña | `id` de la sección | Hojas |
|---|---|---|
| Almuerzos & Cenas | `#almuerzo` | 17 |
| Desayunos & Meriendas | `#merienda` | 4 |
| Sin TACC | `#sintacc` | 2 |

Cada hoja es un `<article class="hoja hoja--NOMBRE">`, por ejemplo `hoja--entradas`, `hoja--postres` o `hoja--cafeteria`. Ese nombre sirve para hacerle ajustes de diseño solo a esa hoja (ver punto 5).

> Las fotos viejas de la carta (`img/menu/`) **ya no existen en el repo**: se borraron porque nada las usaba. Si algún día hacen falta, están en el historial de git (commit anterior a la carta en HTML).

---

## 2. Cambiar un precio (lo más común)

1. Abrí `menu.html` y buscá el nombre del plato con Ctrl+F, por ejemplo `TABLA CROCANTE`.
2. En la misma línea está el precio, dentro de `<span class="precio">`:

```html
<div class="plato-linea"><h3 class="plato-nombre">TABLA CROCANTE</h3><span class="puntos" aria-hidden="true"></span><span class="precio">$67.000</span></div>
```

3. Cambiá solo el número, por ejemplo `$67.000` → `$72.000`, y dejá el `$` y el punto de miles.
4. Guardá, hacé commit y push.

El precio cambia solo en todos lados: en la tarjeta, en la hoja grande, en el modo lectura y en la impresión.

> Si un plato aparece en más de una pestaña (por ejemplo la Margarita, que está en Pizzas y en Sin TACC), son dos platos distintos con precios distintos. Fijate de cambiar el de la pestaña correcta.

---

## 3. Cambiar el nombre o la descripción de un plato

- **Nombre:** el texto dentro de `<h3 class="plato-nombre">…</h3>`.
- **Descripción:** el texto dentro de `<p class="plato-desc">…</p>`, en la línea de abajo.
- **Nota corta en cursiva** al lado del nombre, como "(para compartir)" o "Solo, cortado o lágrima": va dentro de `<span class="plato-nota">…</span>`.

Escribí con tildes y ñ normales. Para el símbolo `&` usá `&amp;`.

---

## 4. Agregar o quitar un plato

Cada plato es un bloque `<li>…</li>` dentro de una lista `<ul class="platos">`.

**Para agregar uno:** copiá un `<li>` completo de un plato parecido, pegalo donde lo quieras y cambiale el nombre, la descripción y el precio.

```html
<li>
  <div class="plato-linea"><h3 class="plato-nombre">NOMBRE DEL PLATO</h3><span class="puntos" aria-hidden="true"></span><span class="precio">$00.000</span></div>
  <p class="plato-desc">Descripción del plato.</p>
</li>
```

Si el plato no lleva descripción, borrá la línea `<p class="plato-desc">`.

**Para quitar uno:** borrá su `<li>…</li>` completo.

> ⚠️ **Cada hoja mide exactamente lo mismo que una hoja A4** (794 × 1123 px). Si agregás varios platos, el contenido puede tocar el pie o cortarse. Después de agregar, revisá la hoja en la vista previa (punto 8). Si no entra, hay que achicar un poco el espacio entre renglones de esa hoja (punto 5), pasar platos a otra hoja o pedírselo a Claude.

---

## 5. Ajustes de diseño de una sola hoja

Al final de `carta.css` hay una sección **"Ajustes por hoja"** con los retoques que se hicieron hoja por hoja comparando con el PDF original. Por ejemplo:

```css
/* Hoja 08 · Guarniciones: más separación entre renglones de la lista */
.hoja--guarniciones .platos{gap:15px}
```

Las propiedades que más se usan:

| Qué querés cambiar | Propiedad |
|---|---|
| Separación entre platos | `.hoja--X .platos{gap:…px}` |
| Tamaño de letra de los platos | `.hoja--X .plato-nombre, .hoja--X .precio{font-size:…px}` |
| Tamaño de las descripciones | `.hoja--X .plato-desc{font-size:…px}` |
| Tamaño del título de la hoja | `.hoja--X .hoja-titulo{font-size:…px}` |
| Espacio debajo del título | `.hoja--X .hoja-titulo{margin-bottom:…px!important}` |
| Tamaño del logo | `.hoja--X .hoja-logo img{width:…px}` |
| Altura del logo (más cerca o más lejos del pie) | `.hoja--X .hoja-logo + .hoja-pie{margin-top:…px}` (más chico = logo más abajo) |

Como referencia, 1 punto tipográfico ≈ 1,33 px.

Algunas hojas tienen además un `style="--gap:…;--aire:…"` en su `<article>` dentro de `menu.html`. Es el espaciado que se calculó para que los platos ocupen el alto de la hoja como en el PDF. Si hay una regla para esa hoja en `carta.css`, manda la de `carta.css` (por eso en las hojas que ya tienen su propio `gap` en `carta.css` se quitó el `--gap` inline, que no se usaba).

---

## 6. Imprimir la carta o guardarla como PDF

Los botones de imprimir **no se muestran a los clientes**. Para verlos:

1. Entrá a **`https://www.greengarden.com.ar/menu.html?imprimir`** (o a la misma dirección en la vista previa).
2. Elegí la pestaña que quieras imprimir: Almuerzos & Cenas, Desayunos & Meriendas o Sin TACC.
3. Tocá **"Imprimir esta carta (A4)"** o **"Imprimir sin precios"**.
4. En la ventana de impresión del navegador:
   - **Destino:** tu impresora, o **"Guardar como PDF"**.
   - **Tamaño de papel:** A4.
   - **Márgenes:** Ninguno.
   - **Gráficos de fondo:** activado.
   - **Escala:** 100% (predeterminada).

Sale una hoja A4 por página, igual a la que se ve en la web. La versión **sin precios** sirve, por ejemplo, para una carta de mesa que no haya que reimprimir cuando cambian los precios.

> Con Ctrl+P en `menu.html` también se imprime la pestaña que tengas abierta, aunque no uses `?imprimir`.

---

## 7. Cómo lo ve el cliente

- **Grilla de tarjetas:** cada hoja se muestra achicada, como si fuera una foto de la carta. La escala se calcula con CSS, así que no hay parpadeo al cargar.
- **Al tocar una tarjeta** se abre un modal con la hoja grande:
  - **Flechas abajo** (anterior / siguiente), un contador (por ejemplo "Entradas · 3 / 17") y la X para cerrar.
  - En el celular también se puede **deslizar** a los costados para cambiar de hoja, y en la compu usar las **flechas del teclado** o **Esc** para cerrar.
  - Tocar la hoja la **amplía**, y tocarla de nuevo la achica.
  - El botón **"Modo lectura"** muestra la misma hoja en una columna, con letra grande y separadores, ideal para el celular. Al final de cada hoja aparecen botones grandes para el Instagram y para reservar llamando.
  - **En el celular (pantalla de menos de 700 px) la carta abre directamente en modo lectura.** El cliente puede pasar a "Ver hoja" y el navegador recuerda su elección. En compu y tablet grande abre la hoja entera.
  - **Botón "Atrás" del celular:** cierra la hoja en vez de salir de la carta. Cada hoja tiene su propio link, por ejemplo `https://www.greengarden.com.ar/menu.html#almuerzo/entradas` (se arma solo: pestaña + nombre de la hoja). Sirve para mandar por WhatsApp o ponerlo en un QR.
- Cada pestaña recorre solo sus hojas.

---

## 8. Probar cambios antes de publicarlos

La web se publica sola desde la rama `main` con Cloudflare Pages. **Para probar sin tocar la web real:**

1. Creá una rama, por ejemplo `cambio-precios-diciembre`, y hacé los cambios ahí.
2. Hacé push de la rama. Cloudflare arma sola una **vista previa** en
   `https://NOMBRE-DE-LA-RAMA.greengarden2.pages.dev/menu.html`
   (el link también aparece como comentario de Cloudflare en el Pull Request).
3. Revisá la carta ahí, en el celular y en la compu.
4. Si está todo bien, mergeá a `main` y en 1 o 2 minutos se publica en greengarden.com.ar.

Para un cambio chico de un precio también podés editar directo en `main`, pero conviene pasar primero por la vista previa.

---

## 9. SEO: lo que Google lee

- **Texto real:** cada plato, descripción y precio es texto HTML, no imagen.
- **Datos estructurados (schema.org):** `carta.js` arma solo, leyendo las hojas, los datos `Restaurant → Menu → MenuSection → MenuItem` (nombre, descripción, precio en ARS, y marca "sin gluten" en la pestaña Sin TACC) y los cuelga del mismo restaurante que ya está declarado en `index.html`. **No hay que mantener nada aparte:** si cambiás un precio en `menu.html`, los datos para Google cambian solos.
- **Cómo comprobarlo:** pegá la dirección de la web en <https://search.google.com/test/rich-results> (o en el validador de schema.org) y buscá "Restaurante".
- El título y la descripción de `menu.html` incluyen "menú", "precios" y "La Plata", que es lo que la gente busca.

---

## 10. Tipografías y licencias

- **GreenFont** (Regular + Numeros) es la tipografía propia de la marca. Los números de los títulos salen automáticamente del archivo "Numeros".
- **Source Sans 3** (Regular y Light Italic) es la tipografía de los textos. Es de uso libre (licencia SIL OFL, incluida en `fonts/OFL-SourceSans3.txt`), así que no requiere licencia paga. Reemplazó a Myriad Pro, que es comercial. Como su cursiva es un poco más ancha que la de Myriad, en `base.css` el `@font-face` de la cursiva usa `size-adjust:92%` para que los renglones corten donde cortaban antes; si algún día se cambia la fuente, conviene volver a revisar que ninguna hoja se desborde.

---

## 11. Datos de origen y transcripción

- Las 17 hojas de Almuerzos & Cenas se transcribieron del PDF del diseñador `GG_OCT_2026` (octubre 2026).
- Desayunos & Meriendas y Sin TACC se transcribieron de las imágenes que había en la web.
- Al transcribir se corrigieron algunas erratas del original: "QUESOE" → "QUESO", "NOQUIS" → "ÑOQUIS" y tildes como "CAFÉ" o "TÉ".
- **Cuando llegue una carta nueva del diseñador**, no hace falta rehacer todo: comparala con la web y cambiá solo lo que haya cambiado (precios, platos nuevos o eliminados).
