// lib/swagger.ts
import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    // Utilisez un tableau pour spécifier les deux dossiers
    apiFolder: 'pages/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'API Ewuang Marketplace',
        version: '1.0',
      },
      // Vous pouvez ajouter des schémas de sécurité ici si nécessaire
      // security: [{ BearerAuth: [] }],
    },
    // Si vous utilisez l'authentification Bearer, décommentez et complétez :
    /*
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    */
  });
  return spec;
};
