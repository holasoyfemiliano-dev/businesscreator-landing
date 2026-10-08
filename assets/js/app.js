/*
 * Business Creator · landing de preregistro
 * - Quiz de calificación (una pregunta por pantalla) → datos de contacto → resultado.
 * - Calcula puntaje, temperatura (caliente/tibio/frío) y perfil del lead.
 * - Manda un JSON a BC_CONFIG.endpoint (ver README → "Contrato de datos").
 * - Empuja eventos a window.dataLayer y, si hay pixel, a Meta.
 */
(function () {
  'use strict';

  var CFG = window.BC_CONFIG || {};
  var VERSION = 'preregistro-v2';
  var LS_AVANCE = 'bc_avance';
  var LS_PENDIENTE = 'bc_pendiente';

  /* ---------------- Preguntas ----------------
   * id: llave en el JSON · pts: puntos para la calificación (máximo total 16). */
  var PREGUNTAS = [
    {
      id: 'giro',
      titulo: '¿A qué te dedicas hoy?',
      opciones: [
        { v: 'servicio', t: 'Doy un servicio (agencia, diseño, construcción, salud…)', pts: 3 },
        { v: 'consultoria', t: 'Doy consultoría, asesoría o mentoría', pts: 3 },
        { v: 'negocio-fisico', t: 'Tengo un negocio físico', pts: 2 },
        { v: 'empleado', t: 'Soy empleado y quiero emprender', pts: 1 },
        { v: 'no-vendo', t: 'Todavía no vendo nada', pts: 0 }
      ]
    },
    {
      id: 'ticket',
      titulo: '¿Cuánto cobra tu servicio más caro?',
      ayuda: 'Aproximado, en pesos mexicanos.',
      opciones: [
        { v: 'menos-5k', t: 'Menos de $5,000', pts: 1 },
        { v: '5k-20k', t: 'De $5,000 a $20,000', pts: 2 },
        { v: '20k-50k', t: 'De $20,000 a $50,000', pts: 3 },
        { v: 'mas-50k', t: 'Más de $50,000', pts: 3 },
        { v: 'no-cobro', t: 'Todavía no cobro', pts: 0 }
      ]
    },
    {
      id: 'captacion',
      titulo: '¿Cómo te llegan tus clientes hoy?',
      opciones: [
        { v: 'referidos', t: 'Por referidos y recomendaciones', pts: 2 },
        { v: 'redes', t: 'Por redes sociales', pts: 1 },
        { v: 'anuncios', t: 'Por anuncios pagados', pts: 1 },
        { v: 'prospeccion', t: 'Salgo a buscarlos yo', pts: 2 },
        { v: 'casi-no', t: 'Casi no me llegan', pts: 1 }
      ]
    },
    {
      id: 'digital',
      titulo: '¿Has vendido algo en digital?',
      ayuda: 'Un curso, una asesoría en línea, un producto descargable…',
      opciones: [
        { v: 'nunca', t: 'Nunca', pts: 2 },
        { v: 'intente', t: 'Lo intenté y no funcionó', pts: 2 },
        { v: 'si-bien', t: 'Sí, y ya me va bien', pts: 1 }
      ]
    },
    {
      id: 'freno',
      titulo: '¿Qué es lo que más te frena?',
      opciones: [
        { v: 'que-producto', t: 'No sé qué producto crear', pts: 0 },
        { v: 'como-vender', t: 'No sé cómo venderlo en internet', pts: 0 },
        { v: 'tiempo', t: 'No tengo tiempo', pts: 0 },
        { v: 'herramientas', t: 'No sé usar las herramientas', pts: 0 },
        { v: 'mostrarme', t: 'Me da miedo mostrarme', pts: 0 }
      ]
    },
    {
      id: 'inicio',
      titulo: '¿Cuándo quieres empezar?',
      opciones: [
        { v: 'ya', t: 'En cuanto abra la siguiente generación', pts: 3 },
        { v: '1-3-meses', t: 'En 1 a 3 meses', pts: 2 },
        { v: 'explorando', t: 'Solo estoy explorando', pts: 0 }
      ]
    },
    {
      id: 'inversion',
      titulo: 'Si el programa es para ti, ¿estás en posición de invertir en él?',
      opciones: [
        { v: 'si', t: 'Sí', pts: 3 },
        { v: 'depende', t: 'Depende del precio', pts: 1 },
        { v: 'ahora-no', t: 'Ahora no', pts: 0 }
      ]
    }
  ];

  var LADAS = [
    ['+52', 'MX +52'], ['+1', 'US +1'], ['+57', 'CO +57'], ['+54', 'AR +54'], ['+34', 'ES +34'],
    ['+51', 'PE +51'], ['+56', 'CL +56'], ['+502', 'GT +502'], ['+593', 'EC +593'], ['+506', 'CR +506'],
    ['+503', 'SV +503'], ['+504', 'HN +504'], ['+507', 'PA +507'], ['+58', 'VE +58'], ['+591', 'BO +591']
  ];

  var RESULTADOS = {
    ideal: {
      sello: 'Perfil ideal',
      titulo: 'Tu negocio está listo para su puerta de entrada.',
      texto: 'Ya vendes lo difícil: tu servicio. Lo que te falta es un sistema que te traiga clientes cada mes. Eso es justo lo que armamos en Business Creator.'
    },
    'ya-digital': {
      sello: 'Ya vendes en digital',
      titulo: 'Lo tuyo es escalar.',
      texto: 'Ya tienes ventas en digital. Te escribimos para decirte si Business Creator es tu siguiente paso o si te conviene otro de nuestros programas.'
    },
    'sin-oferta': {
      sello: 'Tu primer paso',
      titulo: 'Primero, tu primera oferta.',
      texto: 'Business Creator funciona mejor cuando ya vendes un servicio. Quedas en la lista y te decimos por dónde empezar.'
    }
  };

  /* ---------------- Estado ---------------- */
  var params = new URLSearchParams(location.search);
  var estado = {
    paso: 0,                 // 0..N-1 preguntas, N = contacto, N+1 = resultado
    respuestas: {},
    inicioQuiz: null,
    pasosVistos: 0,
    sessionId: uid()
  };
  var N = PREGUNTAS.length;
  var PASO_CONTACTO = N, PASO_RESULTADO = N + 1;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var dlg = $('#quiz'), body = $('#quizBody'), barra = $('#barra'), progreso = $('.progreso'), atras = $('#atras'), pasoTxt = $('#pasoTxt');

  /* ---------------- Utilidades ---------------- */
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function leer(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function borrar(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function evento(nombre, datos) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: nombre }, datos || {}));
  }
  function pixel(tipo, nombre, datos) {
    if (typeof window.fbq === 'function') window.fbq(tipo, nombre, datos || {});
  }

  function origen() {
    var o = {
      evento: CFG.evento || '',
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      src: params.get('src') || '',
      referrer: document.referrer || '',
      landing_url: location.href
    };
    o.fuente = o.utm_source || o.src || (o.referrer ? 'referral' : 'directo');
    return o;
  }

  /* ---------------- Calificación ---------------- */
  function calificar() {
    var puntos = 0;
    PREGUNTAS.forEach(function (p) {
      var op = p.opciones.filter(function (o) { return o.v === estado.respuestas[p.id]; })[0];
      if (op) puntos += op.pts;
    });
    var t = CFG.temperatura || { caliente: 12, tibio: 7 };
    var temperatura = puntos >= t.caliente ? 'caliente' : puntos >= t.tibio ? 'tibio' : 'frio';

    var r = estado.respuestas, perfil = 'ideal';
    if (r.giro === 'no-vendo' || r.giro === 'empleado' || r.ticket === 'no-cobro') perfil = 'sin-oferta';
    else if (r.digital === 'si-bien') perfil = 'ya-digital';

    return { puntaje: puntos, puntaje_max: 16, temperatura: temperatura, perfil: perfil };
  }

  /* ---------------- Render ---------------- */
  function actualizarProgreso() {
    var total = PASO_CONTACTO + 1;
    var pct = estado.paso >= PASO_RESULTADO ? 100 : Math.round(estado.paso / total * 100);
    barra.style.width = pct + '%';
    progreso.setAttribute('aria-valuenow', pct);
    atras.hidden = estado.paso === 0 || estado.paso >= PASO_RESULTADO;
    pasoTxt.textContent = estado.paso < N ? (estado.paso + 1) + ' / ' + N : '';
  }

  function render() {
    actualizarProgreso();
    var html;
    if (estado.paso < N) html = vistaPregunta(PREGUNTAS[estado.paso]);
    else if (estado.paso === PASO_CONTACTO) html = vistaContacto();
    else html = vistaResultado();
    body.innerHTML = '<div class="paso-anim">' + html + '</div>';
    enlazar();
    estado.pasosVistos = Math.max(estado.pasosVistos, estado.paso + 1);
    guardar(LS_AVANCE, { paso: Math.min(estado.paso, PASO_CONTACTO), respuestas: estado.respuestas });
    var foco = body.querySelector('[data-foco]') || body.querySelector('h2');
    if (foco) foco.focus({ preventScroll: true });
  }

  function vistaPregunta(p) {
    var letras = 'ABCDE';
    var ops = p.opciones.map(function (o, i) {
      var sel = estado.respuestas[p.id] === o.v;
      return '<button type="button" class="opcion" data-v="' + o.v + '" aria-pressed="' + sel + '"><span class="letra" aria-hidden="true">' + letras[i] + '</span>' + esc(o.t) + '</button>';
    }).join('');
    return '<p class="q-num">Pregunta ' + (estado.paso + 1) + '</p>' +
      '<h2 class="q-titulo" id="quizTitulo" tabindex="-1">' + esc(p.titulo) + '</h2>' +
      (p.ayuda ? '<p class="q-ayuda">' + esc(p.ayuda) + '</p>' : '') +
      '<div class="opciones" role="group" aria-labelledby="quizTitulo">' + ops + '</div>';
  }


  function vistaContacto() {
    var ladas = LADAS.map(function (l) { return '<option value="' + l[0] + '">' + l[1] + '</option>'; }).join('');
    var aviso = esc(CFG.avisoPrivacidad || 'aviso-privacidad.html');
    return '<p class="q-num">Último paso</p>' +
      '<h2 class="q-titulo" id="quizTitulo" tabindex="-1">¿A dónde te avisamos?</h2>' +
      '<p class="q-ayuda">Te escribimos antes de abrir la siguiente generación. Sin spam.</p>' +
      '<form id="fContacto" novalidate><div class="campos">' +
      '<div class="campo"><label for="fNombre">Nombre</label><input id="fNombre" name="nombre" autocomplete="name" placeholder="Tu nombre" required data-foco><p class="error" id="eNombre" hidden></p></div>' +
      '<div class="campo"><label for="fTel">WhatsApp</label><div class="campo-tel"><select id="fLada" name="lada" aria-label="Lada del país">' + ladas + '</select>' +
      '<input id="fTel" name="whatsapp" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="10 dígitos" required></div><p class="error" id="eTel" hidden></p></div>' +
      '<div class="campo"><label for="fEmail">Correo</label><input id="fEmail" name="email" type="email" inputmode="email" autocomplete="email" placeholder="tucorreo@ejemplo.com" required><p class="error" id="eEmail" hidden></p></div>' +
      '<label class="check"><input type="checkbox" id="fAviso" required><span>Acepto el <a href="' + aviso + '" target="_blank" rel="noopener">aviso de privacidad</a> y que me contacten por WhatsApp.</span></label><p class="error" id="eAviso" hidden></p>' +
      '</div><div class="q-acciones"><button type="submit" class="btn btn-acc btn-block" id="enviar">Apartar mi lugar <span aria-hidden="true">→</span></button></div></form>';
  }

  function vistaResultado() {
    var c = calificar();
    var r = RESULTADOS[c.perfil];
    var nombre = (estado.nombre || '').split(' ')[0];
    var wa = CFG.whatsappGrupo ? '<a class="btn btn-wa btn-block" href="' + esc(CFG.whatsappGrupo) + '" target="_blank" rel="noopener" id="btnWa">Unirme al grupo de la lista</a>' : '';
    return '<div class="resultado">' +
      '<img src="assets/img/simbolo-blanco.svg" alt="" class="res-cohete">' +
      '<span class="res-sello">' + esc(r.sello) + '</span>' +
      '<h2 class="res-titulo" id="quizTitulo" tabindex="-1">' + (nombre ? esc(nombre) + ', ' : '') + esc(r.titulo.charAt(0).toLowerCase() + r.titulo.slice(1)) + '</h2>' +
      '<p class="res-texto">' + esc(r.texto) + '</p>' +
      '<ol class="res-pasos">' +
      '<li><span>01</span>Ya estás en la lista de la siguiente generación.</li>' +
      '<li><span>02</span>Te escribimos por WhatsApp antes de abrir.</li>' +
      '<li><span>03</span>Entras antes que nadie.</li>' +
      '</ol><div class="res-acciones">' + wa +
      '<a class="btn btn-borde btn-block" id="btnCompartir" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('Mira esto, creo que te sirve: Business Creator convierte lo que sabes en un negocio que vende solo. ' + location.origin + '/?utm_source=referido&utm_medium=whatsapp') + '">Compártelo con un colega</a>' +
      '<button type="button" class="saltar" id="btnListo">Listo, volver a la página</button></div></div>';
  }

  /* ---------------- Interacción ---------------- */
  function enlazar() {
    body.querySelectorAll('.opcion').forEach(function (b) {
      b.addEventListener('click', function () { elegir(b.getAttribute('data-v'), b); });
    });
    var form = $('#fContacto'), wa = $('#btnWa');
    if (form) form.addEventListener('submit', enviar);
    if (wa) wa.addEventListener('click', function () { evento('bc_click_whatsapp'); });
    var comp = $('#btnCompartir'), listo = $('#btnListo');
    if (comp) comp.addEventListener('click', function () { evento('bc_compartir'); });
    if (listo) listo.addEventListener('click', cerrar);
  }

  function elegir(valor, boton) {
    var p = PREGUNTAS[estado.paso];
    estado.respuestas[p.id] = valor;
    body.querySelectorAll('.opcion').forEach(function (b) { b.setAttribute('aria-pressed', b === boton); });
    evento('bc_quiz_respuesta', { pregunta: p.id, respuesta: valor, paso: estado.paso + 1 });
    setTimeout(function () { ir(estado.paso + 1); }, 220);
  }

  function ir(paso) {
    estado.paso = paso;
    if (paso <= PASO_CONTACTO) evento('bc_quiz_paso', { paso: paso + 1 });
    render();
  }

  function marcarError(input, idError, msg) {
    var e = $('#' + idError);
    if (msg) { e.textContent = msg; e.hidden = false; if (input) input.setAttribute('aria-invalid', 'true'); }
    else { e.hidden = true; if (input) input.removeAttribute('aria-invalid'); }
    return !msg;
  }

  function enviar(ev) {
    ev.preventDefault();
    var nombre = $('#fNombre'), tel = $('#fTel'), email = $('#fEmail'), aviso = $('#fAviso');
    var digitos = tel.value.replace(/\D/g, '');
    var ok = [
      marcarError(nombre, 'eNombre', nombre.value.trim().length < 2 ? 'Escribe tu nombre.' : ''),
      marcarError(tel, 'eTel', digitos.length < 7 || digitos.length > 15 ? 'Revisa tu WhatsApp.' : ''),
      marcarError(email, 'eEmail', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? '' : 'Revisa tu correo.'),
      marcarError(null, 'eAviso', aviso.checked ? '' : 'Necesitamos tu autorización para contactarte.')
    ].every(Boolean);
    if (!ok) { var inv = body.querySelector('[aria-invalid="true"]'); if (inv) inv.focus(); return; }

    var lada = $('#fLada').value;
    estado.nombre = nombre.value.trim();
    var c = calificar();
    var ahora = new Date();
    var payload = {
      tipo: 'preregistro',
      version: VERSION,
      creado_en: ahora.toISOString(),
      nombre: estado.nombre,
      email: email.value.trim().toLowerCase(),
      whatsapp: lada + digitos,
      lada: lada,
      respuestas: Object.assign({}, estado.respuestas),
      respuestas_texto: textoRespuestas(),
      puntaje: c.puntaje,
      puntaje_max: c.puntaje_max,
      temperatura: c.temperatura,
      perfil: c.perfil,
      acepto_aviso: true,
      origen: origen(),
      sesion: {
        id: estado.sessionId,
        segundos_quiz: estado.inicioQuiz ? Math.round((ahora - estado.inicioQuiz) / 1000) : null,
        dispositivo: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'movil' : 'escritorio',
        idioma: navigator.language || '',
        zona_horaria: (Intl.DateTimeFormat().resolvedOptions().timeZone) || ''
      }
    };

    var btn = $('#enviar');
    btn.disabled = true; btn.textContent = 'Apartando…';
    mandar(payload).then(function () {
      borrar(LS_AVANCE);
      evento('bc_preregistro', { temperatura: c.temperatura, perfil: c.perfil, puntaje: c.puntaje });
      pixel('track', 'CompleteRegistration', { content_name: 'Business Creator preregistro', status: c.temperatura });
      ir(PASO_RESULTADO);
    });
  }

  function textoRespuestas() {
    var out = {};
    PREGUNTAS.forEach(function (p) {
      var op = p.opciones.filter(function (o) { return o.v === estado.respuestas[p.id]; })[0];
      out[p.id] = op ? op.t : '';
    });
    return out;
  }

  // Nunca bloquea al usuario: si el envío falla, se guarda y se reintenta en la próxima visita.
  function mandar(payload) {
    if (!CFG.endpoint) { console.warn('[BC] Sin endpoint configurado. Payload:', payload); return Promise.resolve(); }
    return fetch(CFG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
    }).catch(function (e) {
      console.warn('[BC] No se pudo enviar, se guarda para reintentar:', e.message);
      var cola = leer(LS_PENDIENTE) || [];
      cola.push(payload);
      guardar(LS_PENDIENTE, cola);
    });
  }

  function reintentarPendientes() {
    var cola = leer(LS_PENDIENTE);
    if (!cola || !cola.length || !CFG.endpoint) return;
    borrar(LS_PENDIENTE);
    cola.forEach(function (p) { p.reintento = true; mandar(p); });
  }

  /* ---------------- Abrir / cerrar ---------------- */
  function abrir() {
    var av = leer(LS_AVANCE);
    if (av && av.paso && estado.paso === 0) {
      estado.paso = av.paso; estado.respuestas = av.respuestas || {};
    }
    if (!estado.inicioQuiz) estado.inicioQuiz = new Date();
    if (estado.paso >= PASO_RESULTADO) { estado.paso = PASO_RESULTADO; }
    evento('bc_quiz_abierto', { paso: estado.paso + 1 });
    pixel('trackCustom', 'QuizAbierto');
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    render();
  }
  function cerrar() {
    if (estado.paso > 0 && estado.paso < PASO_RESULTADO) evento('bc_quiz_cerrado', { paso: estado.paso + 1 });
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }
  dlg.addEventListener('close', function () { document.body.style.overflow = ''; });

  document.querySelectorAll('[data-abrir-quiz]').forEach(function (b) { b.addEventListener('click', abrir); });
  $('#cerrarQuiz').addEventListener('click', cerrar);
  atras.addEventListener('click', function () { if (estado.paso > 0) ir(estado.paso - 1); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) cerrar(); });

  // Atajos de teclado: A–E para elegir opción
  dlg.addEventListener('keydown', function (e) {
    if (estado.paso >= N || e.target.tagName === 'INPUT') return;
    var i = 'abcde'.indexOf(e.key.toLowerCase());
    var ops = body.querySelectorAll('.opcion');
    if (i > -1 && ops[i]) { e.preventDefault(); ops[i].click(); }
  });

  /* ---------------- Página ---------------- */
  // CTA fija al pasar el hero
  var sticky = $('#stickyCta'), hero = $('.hero');
  window.addEventListener('scroll', function () {
    sticky.classList.toggle('visible', window.scrollY > hero.offsetHeight * 0.7);
  }, { passive: true });

  // Aviso de privacidad configurable
  document.querySelectorAll('[data-aviso]').forEach(function (a) { if (CFG.avisoPrivacidad) a.href = CFG.avisoPrivacidad; });
  $('#anio').textContent = new Date().getFullYear();

  // Meta Pixel (solo si hay ID)
  if (CFG.metaPixelId) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CFG.metaPixelId);
    window.fbq('track', 'PageView');
  }

  evento('bc_landing_vista', { fuente: origen().fuente });
  reintentarPendientes();
})();
