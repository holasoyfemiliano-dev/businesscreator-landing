# businesscreator.net · Preregistro

Landing de preregistro para la **siguiente generación de Business Creator**. Llega tráfico por el QR de los flyers de **Synergy Unlimited**, casi todo desde celular.

La página no vende: **captura datos y nivel de interés** con un mini-diagnóstico de 7 preguntas. Después pide nombre, WhatsApp y correo, y le muestra a cada persona un resultado según su perfil.

## Qué hay aquí

```
index.html              Landing + quiz (un solo archivo de página)
aviso-privacidad.html   Placeholder: falta el texto legal
assets/css/styles.css   Estilos
assets/js/config.js     ← ÚNICO archivo de configuración
assets/js/app.js        Quiz, calificación, envío y eventos
assets/img/             Logos, favicon y og.png (vista previa al compartir)
api/preregistro.js      Endpoint esqueleto (Vercel, Node): valida y responde 200, NO guarda
vercel.json             Config mínima
```

Es HTML estático, sin build ni dependencias. Se puede servir desde Vercel, Netlify, GoHighLevel, Hostinger o cualquier hosting. Si no usas Vercel, reemplaza `api/preregistro.js` por tu propio endpoint y cambia `endpoint` en `config.js`.

Para probarla en local:

```bash
python3 -m http.server 8080   # y abre http://localhost:8080/?src=qr
```

## Lo que hay que conectar

1. **`api/preregistro.js`**: guardar el lead y crear el contacto en el CRM (bloque `TODO`). Deduplica por email o WhatsApp.
2. **`config.js`**:
   - `whatsappGrupo`: link del grupo de la lista de espera. Si se queda vacío, no se muestra el botón.
   - `metaPixelId`: el pixel de Meta, si lo usan.
   - `evento`: etiqueta de origen. Por defecto es `synergy-unlimited-2026`.
3. **`aviso-privacidad.html`**: poner el aviso real (LFPDPPP). Es obligatorio porque se piden datos personales.
4. **QR del evento**: los flyers apuntan a `https://businesscreator.net`. Para medir el QR por separado, el QR puede llevar `?src=qr` o `?utm_source=synergy` y se guarda en `origen`.

## Contrato de datos

`POST {endpoint}` con `Content-Type: application/json`:

```json
{
  "tipo": "preregistro",
  "version": "preregistro-v2",
  "creado_en": "2026-10-08T02:47:20.379Z",
  "nombre": "Femi Prueba",
  "email": "femi@ejemplo.com",
  "whatsapp": "+525512345678",
  "lada": "+52",
  "respuestas": {
    "giro": "servicio",
    "ticket": "20k-50k",
    "captacion": "referidos",
    "digital": "nunca",
    "freno": "como-vender",
    "inicio": "ya",
    "inversion": "si"
  },
  "respuestas_texto": { "giro": "Doy un servicio (agencia, diseño, construcción, salud…)", "...": "..." },
  "puntaje": 16,
  "puntaje_max": 16,
  "temperatura": "caliente",
  "perfil": "ideal",
  "acepto_aviso": true,
  "origen": {
    "evento": "synergy-unlimited-2026",
    "fuente": "qr",
    "utm_source": "", "utm_medium": "", "utm_campaign": "", "utm_content": "",
    "src": "qr", "referrer": "", "landing_url": "https://businesscreator.net/?src=qr"
  },
  "sesion": { "id": "8kgqgtiwmuyxr91f", "segundos_quiz": 48, "dispositivo": "movil", "idioma": "es-MX", "zona_horaria": "America/Mexico_City" }
}
```

- `respuestas` trae llaves cortas para filtrar en el CRM. `respuestas_texto` trae el texto legible de cada respuesta.
- Si el endpoint falla, **el usuario no se entera**: el payload se guarda en `localStorage` y se reintenta en su siguiente visita, marcado con `"reintento": true`.

### Valores posibles

| Campo | Valores |
|---|---|
| `giro` | `servicio` · `consultoria` · `negocio-fisico` · `empleado` · `no-vendo` |
| `ticket` | `menos-5k` · `5k-20k` · `20k-50k` · `mas-50k` · `no-cobro` (MXN) |
| `captacion` | `referidos` · `redes` · `anuncios` · `prospeccion` · `casi-no` |
| `digital` | `nunca` · `intente` · `si-bien` |
| `freno` | `que-producto` · `como-vender` · `tiempo` · `herramientas` · `mostrarme` |
| `inicio` | `ya` · `1-3-meses` · `explorando` |
| `inversion` | `si` · `depende` · `ahora-no` |

## Calificación

Cada respuesta suma puntos (los pesos están en `PREGUNTAS` en `app.js`), con un máximo de 16. `freno` no suma: es pura información.

- **`temperatura`**: `caliente` con 12 puntos o más, `tibio` de 7 a 11, `frio` con menos de 7. Los umbrales se cambian en `config.js`.
- **`perfil`** (define el mensaje que ve el usuario al final):
  - `ideal`: ya vende un servicio, consultoría o negocio y nunca ha vendido en digital. Es el avatar de Business Creator.
  - `ya-digital`: ya le va bien vendiendo en digital. Probablemente le conviene otro programa (BGI).
  - `sin-oferta`: todavía no vende, es empleado o no cobra. No es avatar todavía.

Para ventas, empezar por los `caliente` con perfil `ideal`.

## Eventos (dataLayer / GTM)

`bc_landing_vista` · `bc_quiz_abierto` · `bc_quiz_paso` · `bc_quiz_respuesta` (pregunta, respuesta) · `bc_quiz_cerrado` (en qué paso abandonó) · `bc_preregistro` (temperatura, perfil, puntaje) · `bc_compartir` · `bc_click_whatsapp`.

Con Meta Pixel configurado se mandan `PageView`, `QuizAbierto` (custom) y `CompleteRegistration`.
