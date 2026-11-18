// Green Garden — configuración de Firebase (bolsa de trabajo).
//
// Estos valores son PÚBLICOS por diseño: identifican el proyecto, no dan acceso a los datos.
// Quien protege la información son las reglas de Firestore (ver /firestore.rules).
//
// Cómo completarlo: Consola de Firebase → Configuración del proyecto → Tus apps → app Web → "Configuración del SDK".
// Copiá cada valor entre las comillas.

export const firebaseConfig = {
  apiKey: 'AIzaSyCG8jfnxfPMLNDaV6f3gBCJqiPWjKtTo-g',
  authDomain: 'bd-greengarden.firebaseapp.com',
  projectId: 'bd-greengarden',
  storageBucket: 'bd-greengarden.firebasestorage.app',
  messagingSenderId: '1084702399382',
  appId: '1:1084702399382:web:2c7540874192620dac1bb7'
};

export const configurado = !Object.values(firebaseConfig).some(v => !v || v === 'REEMPLAZAR');
