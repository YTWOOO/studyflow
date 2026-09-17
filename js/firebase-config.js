// ============================================================
// StudyFlow — configuração do Firebase
// ============================================================
// 1. Crie um projeto gratuito em https://console.firebase.google.com
// 2. No projeto, ative o "Cloud Firestore" (Build > Firestore Database > Criar banco de dados).
// 3. Em "Configurações do projeto" > "Geral" > "Seus apps", crie um app da Web
//    e copie o objeto de configuração para cá, substituindo os valores abaixo.
// 4. Salve este arquivo. O StudyFlow detecta automaticamente que o Firebase
//    foi configurado e passa a usá-lo em vez do armazenamento local do navegador.
//
// Enquanto os valores abaixo estiverem como "YOUR_..." o StudyFlow funciona
// normalmente salvando os dados no armazenamento local do navegador (localStorage),
// então você pode usar o site mesmo antes de configurar o Firebase.

export const firebaseConfig = {
  apiKey: "AIzaSyD7cmoA2OnhT7-Vm9IkwIJnulVnI78sSWs",
  authDomain: "studyflow-46e55.firebaseapp.com",
  projectId: "studyflow-46e55",
  storageBucket: "studyflow-46e55.firebasestorage.app",
  messagingSenderId: "353307442658",
  appId: "1:353307442658:web:a7d7261318bf1592decdbb",
  measurementId: "G-540720DPW3",
};
