'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

function ReactSwagger({ spec }: { spec: Record<string, any> }) {
  return <SwaggerUI spec={spec} />;
}

export default ReactSwagger;
