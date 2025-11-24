import { getApiDocs } from '../lib/swagger';
import ReactSwagger from './react-swagger';

async function ApiDoc() {
  // Le fetching de données se fait côté serveur
  const spec = await getApiDocs();

  // Le composant client est rendu ici.
  // Next.js sait qu'il s'agit d'un composant client grâce à la directive
  // 'use client' dans le fichier react-swagger.tsx
  return (
    <section className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Documentation</h1>
      <ReactSwagger spec={spec} />
    </section>
  );
}

export default ApiDoc;
