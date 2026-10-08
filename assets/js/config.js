/*
 * Configuración de la landing de preregistro de Business Creator.
 * Es el ÚNICO archivo que hay que tocar para conectar la página.
 */
window.BC_CONFIG = {
  // A dónde se manda el preregistro (POST JSON). Ver README → "Contrato de datos".
  endpoint: '/api/preregistro',

  // Etiqueta del origen por defecto. Si la URL trae ?utm_source=..., esa manda.
  evento: 'synergy-unlimited-2026',

  // Liga del grupo de WhatsApp de la lista de espera. Vacío = no se muestra el botón.
  whatsappGrupo: 'https://chat.whatsapp.com/FPPXSqFVSVH1FuanfI2Yzl',

  // Aviso de privacidad (obligatorio en México al pedir datos personales).
  avisoPrivacidad: 'aviso-privacidad.html',

  // Meta Pixel. Vacío = no se carga. Los eventos se mandan igual a window.dataLayer (GTM).
  metaPixelId: '',

  // Umbrales de la calificación del lead (puntos sobre 16). Ver README → "Calificación".
  temperatura: { caliente: 12, tibio: 7 },
};
