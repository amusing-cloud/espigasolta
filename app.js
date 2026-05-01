// 🔹 CONFIGURAÇÃO FIREBASE
const firebaseConfig = { // Cria um objeto com as credenciais do projeto Firebase — é como o "cartão de identificação" da app
  apiKey: "AIzaSyD-LhY6HeK6H6Dthd75uQJEjf__VSnhqno", // Chave de acesso à API do Firebase, identifica a nossa app junto dos servidores Google
  authDomain: "espigasolta2.firebaseapp.com", // Endereço usado pelo sistema de autenticação (login) do Firebase
  projectId: "espigasolta2", // O ID único do nosso projeto no Firebase, usado para aceder à base de dados correta
}; // Fecha o objeto firebaseConfig

// 🔹 PERFIS
const gestores = [ // Cria uma lista (array) com os emails que têm perfil de Gestor
  "joaomarialimpo@hotmail.com",
  "amusing-cloud@hotmail.com", // Email do primeiro utilizador com acesso de Gestor
  "espigasolta@gmail.com", // Email do segundo utilizador com acesso de Gestor
]; // Fecha o array de gestores — qualquer email que não esteja aqui terá perfil de Trabalhador

// 🔹 Inicializa Firebase
const app = firebase.initializeApp(firebaseConfig); // Inicia a ligação ao Firebase usando as credenciais definidas acima
const auth = firebase.auth(); // Cria o objeto "auth" que dá acesso a todas as funções de autenticação (login/logout)
const db = firebase.firestore(); // Cria o objeto "db" (database) que permite ler e escrever na base de dados Firestore

// 🔹 Estado automático de login
auth.onAuthStateChanged(user => { // Função chamada AUTOMATICAMENTE sempre que o estado de login muda (login, logout ou ao recarregar a página)
  if (user) { // SE o utilizador está autenticado (user não é null)...
    document.body.classList.remove('login-bg'); // Remove a classe "login-bg" do body, eliminando o fundo de imagem do login
    document.getElementById('login-section').classList.add('hidden'); // Esconde o formulário de login, pois o utilizador já entrou

    if (gestores.includes(user.email)) { // SE o email do utilizador autenticado está na lista de gestores...
      document.getElementById('manager-app').classList.remove('hidden'); // Mostra a vista do Gestor (tabela de serviços)
      document.getElementById('worker-app').classList.add('hidden'); // Garante que a vista do Trabalhador está escondida
      loadServices(); // Chama a função que vai buscar os serviços ao Firebase e preenche a tabela
    } else { // SE o email NÃO está na lista de gestores, é um Trabalhador...
      document.getElementById('worker-app').classList.remove('hidden'); // Mostra a vista do Trabalhador (formulário de inserção)
      document.getElementById('manager-app').classList.add('hidden'); // Garante que a vista do Gestor está escondida
    } // Fecha o bloco if/else do perfil
  } else { // SE o utilizador NÃO está autenticado (user é null, ou seja, não fez login ou fez logout)...
    document.body.classList.add('login-bg'); // Adiciona a classe "login-bg" ao body, aplicando o fundo de imagem do login
    document.getElementById('login-section').classList.remove('hidden'); // Mostra o formulário de login
    document.getElementById('worker-app').classList.add('hidden'); // Garante que a vista do Trabalhador está escondida
    document.getElementById('manager-app').classList.add('hidden'); // Garante que a vista do Gestor está escondida
  } // Fecha o bloco if/else principal
}); // Fecha a função onAuthStateChanged

// 🔹 LOGIN
function login() { // Declara a função "login", chamada quando o utilizador clica no botão LOGIN
  const email = document.getElementById('email').value; // Vai buscar o texto escrito no campo com id "email"
  const password = document.getElementById('password').value; // Vai buscar o texto escrito no campo com id "password"

  auth.signInWithEmailAndPassword(email, password) // Tenta autenticar o utilizador no Firebase com o email e password fornecidos
    .catch(err => alert(err.message)); // SE houve erro (password errada, email inválido, etc.), mostra uma janela de alerta com a mensagem
} // Fecha a função login — se o login correr bem, o onAuthStateChanged acima trata de mostrar a vista correta

// 🔹 LOGOUT
function logout() { // Declara a função "logout", chamada quando o utilizador clica no botão LOGOUT
  auth.signOut().then(() => { // Termina a sessão no Firebase. Quando terminar com sucesso, executa o que está aqui dentro...
    document.body.classList.add('login-bg'); // Volta a aplicar o fundo de imagem do login ao body
    document.getElementById('login-section').classList.remove('hidden'); // Mostra novamente o formulário de login
    document.getElementById('worker-app').classList.add('hidden'); // Esconde a vista do Trabalhador
    document.getElementById('manager-app').classList.add('hidden'); // Esconde a vista do Gestor
  }); // Fecha o bloco .then e a chamada signOut
} // Fecha a função logout

// 🔹 CALCULAR HORAS TOTAIS
function calcularHoras(startTime, endTime) { // Função que recebe a hora de início e fim e devolve a duração total formatada
  if (!startTime || !endTime) return '-'; // SE alguma das horas estiver vazia ou indefinida, devolve '-' para não mostrar erro
  const [sh, sm] = startTime.split(':').map(Number); // Divide a hora de início pelo ':' (ex: "08:30" → sh=8, sm=30) e converte para números
  const [eh, em] = endTime.split(':').map(Number); // Divide a hora de fim pelo ':' (ex: "17:45" → eh=17, em=45) e converte para números
  let totalMin = (eh * 60 + em) - (sh * 60 + sm); // Converte ambas as horas para minutos e calcula a diferença (duração total em minutos)
  if (totalMin < 0) totalMin += 24 * 60; // SE o resultado for negativo (serviço passou a meia-noite), adiciona 24h em minutos para corrigir
  const h = Math.floor(totalMin / 60); // Calcula as horas inteiras dividindo os minutos totais por 60 (arredonda para baixo)
  const m = totalMin % 60; // Calcula os minutos restantes usando o resto da divisão por 60
  return `${h}h${m > 0 ? m + 'm' : ''}`; // Devolve a duração formatada (ex: "8h30m" ou "9h" se não houver minutos)
} // Fecha a função calcularHoras

// 🔹 GUARDAR SERVIÇO
document.getElementById('serviceForm').addEventListener('submit', async (e) => { // "Ouve" o evento de submissão do formulário. async permite usar await dentro
  e.preventDefault(); // Impede o comportamento padrão do formulário que seria recarregar a página ao submeter

  // ID Sequencial
  const snapshot = await db.collection('services').get(); // Vai buscar todos os documentos da coleção "services" para contar quantos existem
  const nextId = snapshot.size + 1; // O próximo ID é o número total de serviços existentes + 1 (ex: se há 5, o próximo é 6)

  const service = { // Cria um objeto com todos os dados do formulário para guardar na base de dados
    id: nextId, // ID sequencial calculado acima
    company: document.getElementById('company').value, // Vai buscar o valor do campo de empresa
    location: document.getElementById('location').value, // Vai buscar o valor do campo de local
    date: document.getElementById('date').value, // Vai buscar o valor do campo de data
    startTime: document.getElementById('startTime').value, // Vai buscar o valor do campo de hora de início
    endTime: document.getElementById('endTime').value, // Vai buscar o valor do campo de hora de fim
    transport: document.getElementById('transport').checked ? 'Sim' : 'Não', // SE a checkbox de transporte está marcada guarda 'Sim', caso contrário guarda 'Não'
    designation: document.getElementById('designation').value, // Vai buscar o valor do campo de designação de serviço
    billed: false // Define o campo "faturado" como false (não faturado) por defeito ao criar um novo serviço
  }; // Fecha o objeto service

  await db.collection('services').add(service); // Guarda o objeto "service" como novo documento na coleção "services" do Firestore. "await" espera que termine

  // Limpar formulário
  document.getElementById('serviceForm').reset(); // Limpa todos os campos do formulário, voltando aos valores vazios/padrão

  // Mensagem de sucesso
  const msg = document.getElementById('successMsg'); // Vai buscar o elemento parágrafo da mensagem de sucesso pelo seu id
  msg.classList.remove('hidden'); // Torna a mensagem de sucesso visível removendo a classe "hidden"
  setTimeout(() => msg.classList.add('hidden'), 3000); // Após 3000 milissegundos (3 segundos), volta a esconder a mensagem automaticamente
}); // Fecha o addEventListener do formulário

// 🔹 CARREGAR TABELA (Gestor)
async function loadServices() { // Função assíncrona que vai buscar todos os serviços ao Firebase e preenche a tabela do Gestor
  const tbody = document.querySelector('#servicesTable tbody'); // Encontra o corpo da tabela (tbody) dentro da tabela com id "servicesTable"
  tbody.innerHTML = ''; // Limpa todo o conteúdo atual da tabela para evitar duplicar linhas ao recarregar

  const snapshot = await db.collection('services').orderBy('id', 'asc').get(); // Vai buscar todos os serviços ordenados pelo campo "id" de forma crescente (1, 2, 3...)

  snapshot.forEach(doc => { // Para cada documento (serviço) encontrado na base de dados, executa o que está aqui dentro...
    const s = doc.data(); // Extrai os dados do documento para a variável "s" (abreviatura de "service")
    const totalHours = calcularHoras(s.startTime, s.endTime); // Calcula as horas totais do serviço chamando a função criada acima

  const row = document.createElement('tr'); // Cria um novo elemento HTML <tr> (linha de tabela) em memória, ainda não visível na página

row.innerHTML = ` 
  <td>${s.id || '-'}</td>
  <td>${s.company || '-'}</td>
  <td>${s.location || '-'}</td>
  <td>${s.date || '-'}</td>
  <td>${s.startTime || '-'}</td>
  <td>${s.endTime || '-'}</td>
  <td>${totalHours}</td>
  <td>${s.transport || '-'}</td>
  <td>${s.designation || '-'}</td>
  <td><input type="checkbox" ${s.billed ? 'checked' : ''} onchange="toggleBilled('${doc.id}', this.checked)"></td>
  <td><button class="delete-btn" onclick="deleteService('${doc.id}')">🗑️</button></td>
`; // Fecha o template literal do innerHTML

    tbody.appendChild(row); // Adiciona a linha criada ao corpo da tabela, tornando-a visível na página
  }); // Fecha o forEach
} // Fecha a função loadServices

// 🔹 ALTERAR FATURADO
async function toggleBilled(id, value) { // Função chamada quando o utilizador clica numa checkbox de "Faturado". Recebe o id do documento Firebase e o novo valor (true/false)
  await db.collection('services').doc(id).update({ billed: value }); // Encontra o documento pelo id e atualiza APENAS o campo "billed", sem apagar os outros campos
} // Fecha a função toggleBilled

// 🔹 APAGAR SERVIÇO
async function deleteService(id) { // Função chamada quando o utilizador clica no botão 🗑️. Recebe o id do documento Firebase a apagar
  if (confirm('Tens a certeza que queres apagar este serviço?')) { // Mostra uma janela de confirmação. SE o utilizador clicar "OK"...
    await db.collection('services').doc(id).delete(); // Apaga permanentemente o documento com esse id da coleção "services" no Firestore
    loadServices(); // Recarrega a tabela para refletir a remoção do serviço apagado
  } // Fecha o bloco if — se o utilizador clicar "Cancelar", não faz nada
} // Fecha a função deleteService

// 🔹 EXPORTAR CSV
function exportToCSV() { // Declara a função que exporta os dados da tabela para um ficheiro CSV abrível no Excel
  let csv = []; // Cria uma lista vazia onde vamos guardar cada linha do ficheiro CSV
  const rows = document.querySelectorAll("table tr"); // Seleciona TODAS as linhas da tabela (cabeçalho e corpo)

  rows.forEach(row => { // Para cada linha da tabela...
    let cols = row.querySelectorAll("td, th"); // Seleciona todas as células da linha (th do cabeçalho e td do corpo)
    let rowData = []; // Cria uma lista vazia para guardar os valores desta linha
    cols.forEach(col => { // Para cada célula da linha...
      // Limpar o texto: remover quebras de linha e escapar aspas
      let data = col.innerText.replace(/\n/g, " ").replace(/"/g, '""'); // Remove quebras de linha substituindo por espaço, e duplica as aspas para escapar corretamente no CSV
      // Se for a coluna de ações (lixo), não exportar
      if (col.querySelector('.delete-btn')) return; // SE a célula contém o botão de apagar, ignora-a e passa para a próxima (não exporta a coluna de ações)
      rowData.push('"' + data + '"'); // Envolve o valor em aspas duplas (obrigatório no CSV para textos com vírgulas ou acentos) e adiciona à lista
    }); // Fecha o forEach das células
    if (rowData.length > 0) { // SE a linha tem dados (não está vazia)...
      csv.push(rowData.join(";")); // Junta os valores com ponto e vírgula (separador padrão do Excel em Portugal) e adiciona à lista csv
    } // Fecha o bloco if
  }); // Fecha o forEach das linhas

  // Adicionar o BOM para o Excel reconhecer UTF-8 (acentos)
  const BOM = "\uFEFF"; // Define o BOM (Byte Order Mark), um carácter especial invisível que indica ao Excel que o ficheiro está em UTF-8
  const csvContent = BOM + csv.join("\n"); // Junta o BOM com todas as linhas CSV separadas por quebras de linha, formando o conteúdo completo do ficheiro
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); // Cria um ficheiro em memória com o conteúdo CSV. O type define o formato e a codificação
  const a = document.createElement('a'); // Cria um elemento <a> (link) em memória, invisível na página
  a.href = URL.createObjectURL(blob); // Cria um URL temporário que aponta para o ficheiro em memória e atribui ao link
  a.download = 'servicos_espiga_solta.csv'; // Define o nome do ficheiro que vai ser descarregado no computador do utilizador
  a.click(); // Simula um clique no link, desencadeando o download automático do ficheiro CSV
} // Fecha a função exportToCSV
