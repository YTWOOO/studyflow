# StudyFlow

Site pessoal de organização, planejamento, revisão e acompanhamento de estudos.
Sem banco de questões, sem simulados, sem ranking, sem IA — só o seu mapa de estudos.

## Estrutura do projeto

```
studyflow/
├── index.html          # estrutura da página e das telas
├── css/
│   └── styles.css       # todo o visual (tema claro/escuro incluído)
├── js/
│   ├── app.js            # toda a lógica do app: estado, telas, ações
│   ├── store.js          # camada de armazenamento (Firebase ou local)
│   └── firebase-config.js  # suas credenciais do Firebase (você preenche)
└── README.md
```

## Rodando localmente

Como o app usa módulos JavaScript (`import`/`export`), navegadores bloqueiam isso
se você simplesmente abrir o `index.html` clicando duas vezes (protocolo `file://`).
Sirva a pasta com um servidor local, por exemplo:

```bash
# Python (já vem instalado na maioria dos sistemas)
python3 -m http.server 8000

# ou, com Node instalado
npx serve .
```

Depois abra `http://localhost:8000` no navegador.

Também funciona direto ao publicar em qualquer hospedagem estática: **Firebase
Hosting**, **Netlify**, **Vercel**, **GitHub Pages**, etc. — basta enviar a pasta
inteira.

## Configurando o Firebase (banco de dados)

Sem configuração nenhuma, o StudyFlow já funciona: ele salva os dados no
`localStorage` do navegador (funciona offline, mas fica só naquele dispositivo).

Para usar o Cloud Firestore de verdade (dados sincronizados entre dispositivos):

1. Crie um projeto gratuito em [console.firebase.google.com](https://console.firebase.google.com).
2. No menu **Build → Firestore Database**, clique em "Criar banco de dados"
   (modo produção ou teste, tanto faz para começar).
3. Em **Configurações do projeto → Geral → Seus apps**, crie um app da Web
   (ícone `</>`) e copie o objeto `firebaseConfig` que aparece.
4. Cole esses valores em `js/firebase-config.js`, substituindo os placeholders
   `"YOUR_..."`.
5. Recarregue o site — ele detecta a configuração automaticamente e passa a
   usar o Firestore.

### Regras de segurança do Firestore

Por padrão, um banco criado em "modo produção" bloqueia toda leitura/escrita.
Para uso pessoal (você é o único usuário), uma regra simples é:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ Isso deixa o banco aberto para qualquer pessoa com o link do seu projeto.
Está OK para uso pessoal/estudo, mas **não é seguro para um app que outras
pessoas vão acessar** — nesse caso, adicione Firebase Authentication e restrinja
as regras ao seu usuário.

## Dados de demonstração

Na primeira vez que o site roda (armazenamento vazio), ele cria matérias,
assuntos e um histórico de exemplo automaticamente, só para você ver o app
funcionando. Você pode apagar tudo em **Configurações → Apagar todos os dados**
e recomeçar do zero.

## Backup

Em **Configurações → Exportar backup (.json)** você baixa todos os seus dados
em um arquivo JSON a qualquer momento.
