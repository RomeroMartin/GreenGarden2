// Green Garden — configuración de Firebase (bolsa de trabajo).
//
// Estos valores son PÚBLICOS por diseño: identifican el proyecto, no dan acceso a los datos.
// Quien protege la información son las reglas de Firestore (ver /firestore.rules).
//
// Cómo completarlo: Consola de Firebase → Configuración del proyecto → Tus apps → app Web → "Configuración del SDK".
// Copiá cada valor entre las comillas.

export const firebaseConfig = {
  apiKey: 'REEMPLAZAR',
  authDomain: 'REEMPLAZAR',
  projectId: 'REEMPLAZAR',
  storageBucket: 'REEMPLAZAR',
  messagingSenderId: 'REEMPLAZAR',
  appId: 'REEMPLAZAR'
};

export const configurado = !Object.values(firebaseConfig).some(v => !v || v === 'REEMPLAZAR');
