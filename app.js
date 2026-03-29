// 🔹 CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyD-LhY6HeK6H6Dthd75uQJEjf__VSnhqno",
  authDomain: "espigasolta2.firebaseapp.com",
  projectId: "espigasolta2",
};

// 🔹 PERFIS
const gestores = [
  "joaomarialimpo@hotmail.com",
  "andreneves@gmail.com",
  "mariajoao@gmail.com"
];

// 🔹 Inicializa Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 🔹 Estado automático de login
auth.onAuthStateChanged(user => {
  if (user) {
    document.body.classList.remove('login-bg');
    document.getElementById('login-section').classList.add('hidden');

    if (gestores.includes(user.email)) {
      document.getElementById('manager-app').classList.remove('hidden');
      document.getElementById('worker-app').classList.add('hidden');
      loadServices();
    } else {
      document.getElementById('worker-app').classList.remove('hidden');
      document.getElementById('manager-app').classList.add('hidden');
    }
  } else {
    document.body.classList.add('login-bg');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('worker-app').classList.add('hidden');
    document.getElementById('manager-app').classList.add('hidden');
  }
});

// 🔹 LOGIN
function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  auth.signInWithEmailAndPassword(email, password)
    .catch(err => alert(err.message));
}

// 🔹 LOGOUT
function logout() {
  auth.signOut().then(() => {
    document.body.classList.add('login-bg');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('worker-app').classList.add('hidden');
    document.getElementById('manager-app').classList.add('hidden');
  });
}

// 🔹 CALCULAR HORAS TOTAIS
function calcularHoras(startTime, endTime) {
  if (!startTime || !endTime) return '-';
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let totalMin = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMin < 0) totalMin += 24 * 60;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${m > 0 ? m + 'm' : ''}`;
}

// 🔹 GUARDAR SERVIÇO
document.getElementById('serviceForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // ID Sequencial
  const snapshot = await db.collection('services').get();
  const nextId = snapshot.size + 1;

  const service = {
    id: nextId,
    company: document.getElementById('company').value,
    location: document.getElementById('location').value,
    date: document.getElementById('date').value,
    startTime: document.getElementById('startTime').value,
    endTime: document.getElementById('endTime').value,
    transport: document.getElementById('transport').checked ? 'Sim' : 'Não',
    designation: document.getElementById('designation').value,
    billed: false
  };

  await db.collection('services').add(service);

  // Limpar formulário
  document.getElementById('serviceForm').reset();

  // Mensagem de sucesso
  const msg = document.getElementById('successMsg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 3000);
});

// 🔹 CARREGAR TABELA (Gestor)
async function loadServices() {
  const tbody = document.querySelector('#servicesTable tbody');
  tbody.innerHTML = '';

  const snapshot = await db.collection('services').orderBy('id', 'asc').get();

  snapshot.forEach(doc => {
    const s = doc.data();
    const totalHours = calcularHoras(s.startTime, s.endTime);

    const row = document.createElement('tr');
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
    `;

    tbody.appendChild(row);
  });
}

// 🔹 ALTERAR FATURADO
async function toggleBilled(id, value) {
  await db.collection('services').doc(id).update({ billed: value });
}

// 🔹 APAGAR SERVIÇO
async function deleteService(id) {
  if (confirm('Tens a certeza que queres apagar este serviço?')) {
    await db.collection('services').doc(id).delete();
    loadServices();
  }
}

// 🔹 EXPORTAR CSV
function exportToCSV() {
  let csv = [];
  const rows = document.querySelectorAll("table tr");

  rows.forEach(row => {
    let cols = row.querySelectorAll("td, th");
    let rowData = [];
    cols.forEach(col => {
      // Limpar o texto: remover quebras de linha e escapar aspas
      let data = col.innerText.replace(/\n/g, " ").replace(/"/g, '""');
      // Se for a coluna de ações (lixo), não exportar
      if (col.querySelector('.delete-btn')) return;
      rowData.push('"' + data + '"');
    });
    if (rowData.length > 0) {
      csv.push(rowData.join(";")); // Usar ponto e vírgula para Excel PT
    }
  });

  // Adicionar o BOM para o Excel reconhecer UTF-8 (acentos)
  const BOM = "\uFEFF";
  const csvContent = BOM + csv.join("\n");
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'servicos_espiga_solta.csv';
  a.click();
}
