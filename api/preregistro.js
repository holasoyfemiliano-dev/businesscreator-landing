/**
 * POST /api/preregistro
 * Recibe el preregistro de la landing (ver README → "Contrato de datos").
 *
 * ESTE ARCHIVO ES UN ESQUELETO: valida y responde 200, pero NO guarda nada todavía.
 * Conecta aquí tu CRM / base de datos (GoHighLevel, Supabase, Sheets, etc.)
 * en el bloque marcado con TODO. Formato de función serverless de Vercel (Node).
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const d = req.body || {};
  const faltan = ['nombre', 'email', 'whatsapp'].filter((k) => !d[k] || String(d[k]).trim() === '');
  if (faltan.length) return res.status(400).json({ ok: false, error: 'faltan_campos', campos: faltan });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return res.status(400).json({ ok: false, error: 'email_invalido' });
  if (d.acepto_aviso !== true) return res.status(400).json({ ok: false, error: 'sin_consentimiento' });

  const lead = {
    ...d,
    email: String(d.email).trim().toLowerCase(),
    ip: req.headers['x-forwarded-for'] || null,
    recibido_en: new Date().toISOString(),
  };

  // TODO (quien monte la landing): guardar `lead` y crear/actualizar el contacto en el CRM.
  //  - Deduplicar por email o whatsapp (un mismo lead puede registrarse dos veces).
  //  - Etiquetas sugeridas: `bc-preregistro`, `temp-${lead.temperatura}`, `perfil-${lead.perfil}`, lead.origen.evento.
  //  - Variables de entorno, nunca llaves en el código.
  console.log('[preregistro]', JSON.stringify({ email: lead.email, temperatura: lead.temperatura, perfil: lead.perfil, fuente: lead.origen && lead.origen.fuente }));

  return res.status(200).json({ ok: true });
};
