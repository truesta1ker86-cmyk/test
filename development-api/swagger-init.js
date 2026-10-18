SwaggerUIBundle({
  urls: [
    { url: '/openapi-server-v2.json', name: 'API v2 — подключение Angular' },
    { url: '/openapi-main.json', name: 'Основной API — справка, отдельная авторизация' },
  ],
  dom_id: '#swagger-ui',
  presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
  layout: 'StandaloneLayout',
  docExpansion: 'none',
  defaultModelsExpandDepth: -1,
  supportedSubmitMethods: [],
  validatorUrl: null,
  persistAuthorization: false,
  deepLinking: true,
});
