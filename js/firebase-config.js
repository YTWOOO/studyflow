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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
