// Configuração do projeto Firebase "OFICINA LIMA" (estes dados não são senha; o acesso é protegido pelas regras do banco)
// Preencha apiKey e appId com o bloco firebaseConfig do console do Firebase.
export const firebaseConfig = {
  apiKey: '',
  authDomain: 'oficina-lima.firebaseapp.com',
  databaseURL: 'https://oficina-lima-default-rtdb.firebaseio.com',
  projectId: 'oficina-lima',
  storageBucket: 'oficina-lima.firebasestorage.app',
  messagingSenderId: '',
  appId: '',
}

export const nuvemConfigurada = () => !!(firebaseConfig.apiKey && firebaseConfig.appId)
