import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const GEOAPIFY_KEY = "f0bc4e2bac674186899264bbc0b50fa9";

const firebaseConfig = {
  apiKey: "AIzaSyDH1I3TaELY2JY6Mfki4pgEvKA1V8ES2_s",
  authDomain: "trackingapp-70264.firebaseapp.com",
  projectId: "trackingapp-70264",
  storageBucket: "trackingapp-70264.firebasestorage.app",
  messagingSenderId: "109932520213",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let users = [];
let unsubscribeUsers = null;
let selectedView = "overview";
let liveTimer = null;
let routeLine = null;
let animatedRouteLine = null;
let currentMarker = null;
let routePointsLayer = null;
let healthcareLayer = null;
let pinnedPlacesLayer = null;
let animationTimer = null;
let animationPoints = [];
let animationIndex = 0;
let animationPaused = false;
let mapExpanded = false;
let map = null;
let clientRows = [];
let reportRows = [];
const REPORT_LOGO_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QDERXhpZgAATU0AKgAAAAgABgEaAAUAAAABAAAAVgEbAAUAAAABAAAAXgEoAAMAAAABAAIAAAExAAIAAAAjAAAAZgEyAAIAAAAUAAAAiodpAAQAAAABAAAAngAAAAAACvyAAAAnEAAK/IAAACcQUGhvdG9wZWEgRWRpdG9yICh3d3cucGhvdG9wZWEuY29tKQAAMjAyNjowNToyOSAxMTo1ODoxMAAAAqACAAQAAAABAAABhqADAAQAAAABAAAAgQAAAAD/4QMlaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/Pgo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0NSA3OS4xNjM0OTksIDIwMTgvMDgvMTMtMTY6NDA6MjIiPgo8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgo8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpJcHRjNHhtcENvcmU9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBDb3JlLzEuMC94bWxucy8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMi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";
let reportLogoDataUrl = REPORT_LOGO_DATA_URL;

const els = {
  loginView: document.querySelector("#login-view"),
  dashboardView: document.querySelector("#dashboard-view"),
  loginForm: document.querySelector("#login-form"),
  loginError: document.querySelector("#login-error"),
  logoutButton: document.querySelector("#logout-button"),
  pageTitle: document.querySelector("#page-title"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  navButtons: document.querySelectorAll(".nav-button"),
  viewSections: {
    overview: document.querySelector("#overview-section"),
    users: document.querySelector("#users-section"),
    map: document.querySelector("#map-section"),
    clients: document.querySelector("#clients-section"),
    reports: document.querySelector("#reports-section"),
  },
  totalUsers: document.querySelector("#total-users"),
  onlineUsers: document.querySelector("#online-users"),
  offlineUsers: document.querySelector("#offline-users"),
  usersTable: document.querySelector("#users-table"),
  refreshUsers: document.querySelector("#refresh-users"),
  openUserModal: document.querySelector("#open-user-modal"),
  userModal: document.querySelector("#user-modal"),
  userForm: document.querySelector("#user-form"),
  userModalTitle: document.querySelector("#user-modal-title"),
  editingUsername: document.querySelector("#editing-username"),
  firstName: document.querySelector("#first-name"),
  lastName: document.querySelector("#last-name"),
  username: document.querySelector("#username"),
  password: document.querySelector("#password"),
  cancelUser: document.querySelector("#cancel-user"),
  mapUserSelect: document.querySelector("#map-user-select"),
  historyDate: document.querySelector("#history-date"),
  historyStart: document.querySelector("#history-start"),
  historyEnd: document.querySelector("#history-end"),
  startTracking: document.querySelector("#start-tracking"),
  stopTracking: document.querySelector("#stop-tracking"),
  showRoute: document.querySelector("#show-route"),
  mapShell: document.querySelector("#map-shell"),
  fullscreenMap: document.querySelector("#fullscreen-map"),
  pauseRoute: document.querySelector("#pause-route"),
  clientsSummary: document.querySelector("#clients-summary"),
  clientsUserFilter: document.querySelector("#clients-user-filter"),
  clientsTable: document.querySelector("#clients-table"),
  refreshClients: document.querySelector("#refresh-clients"),
  exportClients: document.querySelector("#export-clients"),
  reportsSummary: document.querySelector("#reports-summary"),
  reportsUserFilter: document.querySelector("#reports-user-filter"),
  reportsDateFilter: document.querySelector("#reports-date-filter"),
  reportsTable: document.querySelector("#reports-table"),
  refreshReports: document.querySelector("#refresh-reports"),
  exportReports: document.querySelector("#export-reports"),
  toast: document.querySelector("#toast"),
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2800);
}

function isOnline(user) {
  const rawDate = user.lastSeenAt?.toDate?.();
  if (!rawDate) return false;
  return Date.now() - rawDate.getTime() <= 6 * 60 * 1000;
}

function formatDateTime(value) {
  const date = value?.toDate?.() ?? value;
  if (!(date instanceof Date)) return "";
  return date.toLocaleString("fr-FR");
}

function formatDateOnly(value) {
  const date = value?.toDate?.() ?? value;
  if (!(date instanceof Date)) return "";
  return date.toLocaleDateString("fr-FR");
}

function todayInputValue() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function setView(view) {
  selectedView = view;
  Object.entries(els.viewSections).forEach(([key, section]) => {
    section.classList.toggle("hidden", key !== view);
  });
  els.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const titles = {
    overview: ["Dashboard", "Supervision des utilisateurs et positions GPS."],
    users: ["Users list", "Creation, modification et suppression des comptes."],
    map: ["GPS location", "Suivi live et historique des positions."],
    clients: ["Clients pointes", "Total, filtre utilisateur et export Excel."],
    reports: ["Rapports journaliers", "Lecture, filtre et export Excel des rapports."],
  };
  els.pageTitle.textContent = titles[view][0];
  els.pageSubtitle.textContent = titles[view][1];

  if (view === "map") {
    ensureMap();
    loadUserPinnedPlaces();
    setTimeout(() => map.invalidateSize(), 60);
  }
  if (view === "clients") {
    loadAllClients();
  }
  if (view === "reports") {
    loadAllReports();
  }
}

function showDashboard() {
  els.loginView.classList.add("hidden");
  els.dashboardView.classList.remove("hidden");
  startUsersListener();
  setView(selectedView);
}

function showLogin() {
  unsubscribeUsers?.();
  unsubscribeUsers = null;
  stopTracking();
  clearRouteLayers();
  users = [];
  els.dashboardView.classList.add("hidden");
  els.loginView.classList.remove("hidden");
}

async function logout() {
  await signOut(auth);
}

function startUsersListener() {
  unsubscribeUsers?.();
  const usersQuery = query(collection(db, "users"), orderBy("username"));
  unsubscribeUsers = onSnapshot(
    usersQuery,
    (snapshot) => {
      users = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      renderUsers();
      renderStats();
      renderMapUserSelect();
      renderClientsUserFilter();
      renderReportsUserFilter();
      if (selectedView === "map") {
        ensureMap();
        loadUserPinnedPlaces();
      }
      if (selectedView === "clients") {
        loadAllClients();
      }
      if (selectedView === "reports") {
        loadAllReports();
      }
    },
    (error) => showToast(`Erreur Firebase : ${error.message}`)
  );
}

async function refreshUsersOnce() {
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("username")));
  users = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  renderUsers();
  renderStats();
  renderMapUserSelect();
  renderClientsUserFilter();
  renderReportsUserFilter();
  if (selectedView === "clients") {
    await loadAllClients();
  }
  if (selectedView === "reports") {
    await loadAllReports();
  }
  showToast("Users list refreshed");
}

function renderStats() {
  const onlineCount = users.filter(isOnline).length;
  els.totalUsers.textContent = users.length;
  els.onlineUsers.textContent = onlineCount;
  els.offlineUsers.textContent = Math.max(users.length - onlineCount, 0);
}

function renderUsers() {
  els.usersTable.innerHTML = "";
  if (!users.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5">No users found.</td>`;
    els.usersTable.append(row);
    return;
  }

  users.forEach((user) => {
    const online = isOnline(user);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(user.Firstname ?? "")} ${escapeHtml(user.Lastname ?? "")}</td>
      <td>${escapeHtml(user.username ?? user.id)}</td>
      <td>${escapeHtml(user.password ?? "")}</td>
      <td>
        <span class="status-pill ${online ? "online" : ""}">
          <span class="status-dot"></span>${online ? "Online" : "Offline"}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="edit-button" data-action="edit">Edit</button>
          <button class="delete-button" data-action="delete">Delete</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="edit"]').addEventListener("click", () => openUserModal(user));
    row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteUser(user));
    els.usersTable.append(row);
  });
}

function renderMapUserSelect() {
  const selected = els.mapUserSelect.value;
  els.mapUserSelect.innerHTML = `<option value="">Select user</option>`;
  users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.username ?? user.id;
    option.textContent = `${user.Firstname ?? ""} ${user.Lastname ?? ""}`.trim() || option.value;
    els.mapUserSelect.append(option);
  });
  if (users.some((user) => (user.username ?? user.id) === selected)) {
    els.mapUserSelect.value = selected;
  }
}

function renderClientsUserFilter() {
  const selected = els.clientsUserFilter.value;
  els.clientsUserFilter.innerHTML = `<option value="">Tous les utilisateurs</option>`;
  users.forEach((user) => {
    const username = user.username ?? user.id;
    const option = document.createElement("option");
    option.value = username;
    option.textContent = userLabel(user);
    els.clientsUserFilter.append(option);
  });
  if (selected && users.some((user) => (user.username ?? user.id) === selected)) {
    els.clientsUserFilter.value = selected;
  }
}

function userLabel(user) {
  const username = user.username ?? user.id;
  const fullName = `${user.Firstname ?? ""} ${user.Lastname ?? ""}`.trim();
  return fullName ? `${fullName} (${username})` : username;
}

async function loadAllClients() {
  clientRows = [];
  renderClientsTable(true);

  try {
    const selectedUsername = els.clientsUserFilter.value;
    const usersToRead = users.filter((user) => {
      const username = user.username ?? user.id;
      return !selectedUsername || username === selectedUsername;
    });

    const rows = [];
    for (const user of usersToRead) {
      const username = user.username ?? user.id;
      const snapshot = await getDocs(
        query(
          collection(db, "users", username, "locations"),
          where("isManualPlace", "==", true),
          limit(500)
        )
      );

      snapshot.docs.forEach((item) => {
        const data = item.data();
        const latitude = Number(data.latitude);
        const longitude = Number(data.longitude);
        if (data.isDeleted === true || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return;
        }

        const creatorName = `${data.firstname ?? user.Firstname ?? ""} ${data.lastname ?? user.Lastname ?? ""}`.trim();
        const createdAt = data.deviceRecordedAt ?? data.createdAt ?? null;
        rows.push({
          name: String(data.clientName ?? data.label ?? "Client"),
          type: String(data.type ?? "Non defini"),
          userLabel: creatorName || username,
          username: String(data.username ?? username),
          latitude,
          longitude,
          createdAt,
          sortTime: data.sortTime ?? createdAt,
        });
      });
    }

    rows.sort((a, b) => {
      const aDate = a.sortTime?.toDate?.()?.getTime?.() ?? 0;
      const bDate = b.sortTime?.toDate?.()?.getTime?.() ?? 0;
      return bDate - aDate;
    });
    clientRows = rows;
    renderClientsTable(false);
  } catch (error) {
    els.clientsSummary.textContent = "Erreur lecture clients";
    els.clientsTable.innerHTML = `<tr><td colspan="7">Erreur Firebase : ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderClientsTable(isLoading = false) {
  els.clientsTable.innerHTML = "";
  els.clientsSummary.textContent = isLoading
    ? "Chargement..."
    : `${clientRows.length} client${clientRows.length > 1 ? "s" : ""}`;

  if (isLoading) {
    els.clientsTable.innerHTML = `<tr><td colspan="7">Chargement des clients...</td></tr>`;
    return;
  }

  if (!clientRows.length) {
    els.clientsTable.innerHTML = `<tr><td colspan="7">Aucun client pointe.</td></tr>`;
    return;
  }

  clientRows.forEach((client) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(client.name)}</td>
      <td>${escapeHtml(client.type)}</td>
      <td>${escapeHtml(client.userLabel)}</td>
      <td>${escapeHtml(client.username)}</td>
      <td>${client.latitude.toFixed(6)}</td>
      <td>${client.longitude.toFixed(6)}</td>
      <td>${escapeHtml(formatDateTime(client.createdAt))}</td>
    `;
    els.clientsTable.append(row);
  });
}

function exportClientsToExcel() {
  if (!clientRows.length) {
    showToast("Aucun client a exporter");
    return;
  }

  const rows = clientRows.map((client) => `
    <tr>
      <td>${escapeHtml(client.name)}</td>
      <td>${escapeHtml(client.type)}</td>
      <td>${escapeHtml(client.userLabel)}</td>
      <td>${escapeHtml(client.username)}</td>
      <td>${client.latitude.toFixed(6)}</td>
      <td>${client.longitude.toFixed(6)}</td>
      <td>${escapeHtml(formatDateTime(client.createdAt))}</td>
    </tr>
  `).join("");

  const html = `
    <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Utilisateur</th>
              <th>Username</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "clients_pointes.xls";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Fichier Excel telecharge");
}

function renderReportsUserFilter() {
  const selected = els.reportsUserFilter.value;
  els.reportsUserFilter.innerHTML = `<option value="">Tous les utilisateurs</option>`;
  users.forEach((user) => {
    const username = user.username ?? user.id;
    const option = document.createElement("option");
    option.value = username;
    option.textContent = userLabel(user);
    els.reportsUserFilter.append(option);
  });
  if (selected && users.some((user) => (user.username ?? user.id) === selected)) {
    els.reportsUserFilter.value = selected;
  }
}

async function loadAllReports() {
  reportRows = [];
  renderReportsTable(true);

  try {
    const selectedUsername = els.reportsUserFilter.value;
    const selectedDate = els.reportsDateFilter.value;
    const constraints = [limit(1000)];
    if (selectedUsername) {
      constraints.unshift(where("username", "==", selectedUsername));
    }
    const snapshot = await getDocs(query(collection(db, "daily_reports"), ...constraints));

    reportRows = snapshot.docs.flatMap((item) => {
      const data = item.data();
      const reportDate = data.reportDate ?? data.createdAt ?? null;
      if (selectedDate && toDateInputValue(reportDate) !== selectedDate) {
        return [];
      }
      const base = {
        id: item.id,
        userFullName: String(data.userFullName ?? `${data.firstname ?? ""} ${data.lastname ?? ""}`.trim()),
        username: String(data.username ?? ""),
        reportDate,
      };
      const visits = Array.isArray(data.visits) && data.visits.length ? data.visits : [{
        clientName: data.clientName,
        clientType: data.clientType,
        activityType: data.activityType,
        phone: data.phone,
        wilaya: data.wilaya,
        commune: data.commune,
        interestedProducts: data.interestedProducts,
        observation: data.observation,
      }];
      return visits.map((visit, index) => ({
        ...base,
        visitNumber: index + 1,
        visitsCount: visits.length,
        clientName: String(visit.clientName ?? ""),
        clientType: String(visit.clientType ?? ""),
        activityType: String(visit.activityType ?? ""),
        phone: String(visit.phone ?? ""),
        wilaya: String(visit.wilaya ?? ""),
        commune: String(visit.commune ?? ""),
        interestedProducts: String(visit.interestedProducts ?? ""),
        observation: String(visit.observation ?? ""),
      }));
    });

    reportRows.sort((a, b) => {
      const aDate = a.reportDate?.toDate?.()?.getTime?.() ?? 0;
      const bDate = b.reportDate?.toDate?.()?.getTime?.() ?? 0;
      return bDate - aDate;
    });
    renderReportsTable(false);
  } catch (error) {
    els.reportsSummary.textContent = "Erreur lecture rapports";
    els.reportsTable.innerHTML = `<tr><td colspan="12">Erreur Firebase : ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderReportsTable(isLoading = false) {
  els.reportsTable.innerHTML = "";
  const reportGroups = groupReportsById(reportRows);
  els.reportsSummary.textContent = isLoading
    ? "Chargement..."
    : `${reportGroups.length} rapport${reportGroups.length > 1 ? "s" : ""} / ${reportRows.length} client${reportRows.length > 1 ? "s" : ""}`;

  if (isLoading) {
    els.reportsTable.innerHTML = `<tr><td colspan="12">Chargement des rapports...</td></tr>`;
    return;
  }

  if (!reportRows.length) {
    els.reportsTable.innerHTML = `<tr><td colspan="12">Aucun rapport journalier.</td></tr>`;
    return;
  }

  reportGroups.forEach((group) => {
    const report = group.rows[0];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(formatDateOnly(report.reportDate))}</td>
      <td>${escapeHtml(report.userFullName)}</td>
      <td>${escapeHtml(report.username)}</td>
      <td>${group.rows.map((item) => `<strong>${escapeHtml(item.clientName)}</strong>`).join("<br>")}</td>
      <td>${group.rows.map((item) => escapeHtml(item.clientType)).join("<br>")}</td>
      <td>${group.rows.map((item) => escapeHtml(item.activityType)).join("<br>")}</td>
      <td>${group.rows.map((item) => escapeHtml(item.phone)).join("<br>")}</td>
      <td>${group.rows.map((item) => escapeHtml(item.wilaya)).join("<br>")}</td>
      <td>${group.rows.map((item) => escapeHtml(item.commune)).join("<br>")}</td>
      <td>${group.rows.map((item) => escapeHtml(item.interestedProducts).replaceAll("\n", "<br>")).join("<hr>")}</td>
      <td>${group.rows.map((item) => escapeHtml(item.observation).replaceAll("\n", "<br>")).join("<hr>")}</td>
      <td>
        <div class="row-actions">
          <button class="edit-button" data-action="excel">Excel</button>
          <button class="pdf-button" data-action="pdf">PDF</button>
          <button class="delete-button" data-action="delete">Supprimer</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="excel"]').addEventListener("click", () => exportReportToExcel(report.id));
    row.querySelector('[data-action="pdf"]').addEventListener("click", () => exportReportToPdf(report.id));
    row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteReport(report));
    els.reportsTable.append(row);
  });
}

function groupReportsById(rows) {
  const mapById = new Map();
  rows.forEach((row) => {
    if (!mapById.has(row.id)) {
      mapById.set(row.id, []);
    }
    mapById.get(row.id).push(row);
  });
  return Array.from(mapById.entries()).map(([id, groupedRows]) => ({
    id,
    rows: groupedRows,
  }));
}

function toDateInputValue(value) {
  const date = value?.toDate?.() ?? value;
  if (!(date instanceof Date)) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getReportLogoDataUrl() {
  return REPORT_LOGO_DATA_URL;
}

async function exportReportsToExcel(rows = reportRows, filename = "rapports_journaliers.xls") {
  if (!rows.length) {
    showToast("Aucun rapport a exporter");
    return;
  }

  const meta = buildReportMeta(rows);
  const tableRows = rows.map((report) => `
    <tr>
      <td style="font-weight:bold;text-align:center;vertical-align:middle;">${escapeHtml(report.clientName)}</td>
      <td style="text-align:center;vertical-align:middle;">${escapeHtml(report.clientType)}</td>
      <td style="text-align:center;vertical-align:middle;">${escapeHtml(report.activityType)}</td>
      <td style="text-align:center;vertical-align:middle;">${escapeHtml(report.phone)}</td>
      <td style="text-align:center;vertical-align:middle;">${escapeHtml(report.wilaya)}</td>
      <td style="text-align:center;vertical-align:middle;">${escapeHtml(report.commune)}</td>
      <td style="text-align:center;vertical-align:middle;">${escapeHtml(report.interestedProducts).replaceAll("\n", "<br>")}</td>
      <td style="text-align:center;vertical-align:middle;">${escapeHtml(report.observation).replaceAll("\n", "<br>")}</td>
    </tr>
  `).join("");

  const html = `
    <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;text-align:center;vertical-align:middle;">
          <tr>
            <td colspan="8" style="height:58px;background:#f97316;color:#ffffff;font-size:22px;font-weight:bold;text-align:center;vertical-align:middle;">
              RAPPORT JOURNALIER DE LA TOURNEE COMMERCIALE
            </td>
          </tr>
          <tr>
            <td colspan="8" style="height:28px;background:#fff7ed;color:#9a3412;font-weight:bold;text-align:center;">
              Export genere le ${escapeHtml(new Date().toLocaleDateString("fr-FR"))}
            </td>
          </tr>
          <tr>
            <td colspan="8" style="height:30px;background:#f8fafc;color:#111827;font-weight:bold;text-align:center;">
              Utilisateur : ${escapeHtml(meta.userFullName)}
            </td>
          </tr>
          <tr>
            <td colspan="8" style="height:30px;background:#f8fafc;color:#111827;font-weight:bold;text-align:center;">
              Username : ${escapeHtml(meta.username)}
            </td>
          </tr>
          <tr>
            <td colspan="8" style="height:30px;background:#f8fafc;color:#111827;font-weight:bold;text-align:center;">
              Date du rapport : ${escapeHtml(meta.reportDate)}
            </td>
          </tr>
          <thead>
            <tr>
              <th style="background:#111827;color:#ffffff;text-align:center;">Client</th>
              <th style="background:#111827;color:#ffffff;text-align:center;">Type client</th>
              <th style="background:#111827;color:#ffffff;text-align:center;">Activite</th>
              <th style="background:#111827;color:#ffffff;text-align:center;">Telephone</th>
              <th style="background:#111827;color:#ffffff;text-align:center;">Wilaya</th>
              <th style="background:#111827;color:#ffffff;text-align:center;">Commune</th>
              <th style="background:#111827;color:#ffffff;text-align:center;">Produits</th>
              <th style="background:#111827;color:#ffffff;text-align:center;">Observation</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Fichier Excel telecharge");
}

function exportReportToExcel(reportId) {
  exportReportsToExcel(
    reportRows.filter((report) => report.id === reportId),
    `rapport_journalier_${reportId}.xls`
  );
}

function exportReportToPdf(reportId) {
  const rows = reportRows.filter((report) => report.id === reportId);
  if (!rows.length) {
    showToast("Rapport introuvable");
    return;
  }
  const html = buildPrintableReportHtml(rows);
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) {
    showToast("Popup bloquee par le navigateur");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function buildReportMeta(rows) {
  const users = new Set(rows.map((report) => report.userFullName || "").filter(Boolean));
  const usernames = new Set(rows.map((report) => report.username || "").filter(Boolean));
  const dates = new Set(rows.map((report) => formatDateOnly(report.reportDate)).filter(Boolean));

  return {
    userFullName: users.size === 1 ? Array.from(users)[0] : "Tous les utilisateurs",
    username: usernames.size === 1 ? Array.from(usernames)[0] : "Plusieurs usernames",
    reportDate: dates.size === 1 ? Array.from(dates)[0] : "Plusieurs dates",
  };
}

function buildPrintableReportHtml(rows) {
  const meta = buildReportMeta(rows);
  const bodyRows = rows.map((report) => `
    <tr>
      <td><strong>${escapeHtml(report.clientName)}</strong></td>
      <td>${escapeHtml(report.clientType)}</td>
      <td>${escapeHtml(report.activityType)}</td>
      <td>${escapeHtml(report.phone)}</td>
      <td>${escapeHtml(report.wilaya)}</td>
      <td>${escapeHtml(report.commune)}</td>
      <td>${escapeHtml(report.interestedProducts).replaceAll("\n", "<br>")}</td>
      <td>${escapeHtml(report.observation).replaceAll("\n", "<br>")}</td>
    </tr>
  `).join("");
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Rapport journalier</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          .header { border-bottom: 4px solid #f97316; padding-bottom: 14px; margin-bottom: 18px; text-align: center; }
          h1 { margin: 0; color: #f97316; font-size: 24px; text-align: center; }
          .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0 0 18px; text-align: center; }
          .meta-item { border: 1px solid #d1d5db; background: #f8fafc; padding: 10px; font-size: 13px; }
          .meta-label { display: block; color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .meta-value { display: block; margin-top: 4px; color: #111827; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: center; }
          th { background: #111827; color: white; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: center; vertical-align: middle; }
          tr:nth-child(even) td { background: #fff7ed; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RAPPORT JOURNALIER DE LA TOURNEE COMMERCIALE</h1>
        </div>
        <div class="meta">
          <div class="meta-item">
            <span class="meta-label">Utilisateur</span>
            <span class="meta-value">${escapeHtml(meta.userFullName)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Username</span>
            <span class="meta-value">${escapeHtml(meta.username)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Date du rapport</span>
            <span class="meta-value">${escapeHtml(meta.reportDate)}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Client</th><th>Type client</th>
              <th>Activite</th><th>Telephone</th><th>Wilaya</th><th>Commune</th><th>Produits</th><th>Observation</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `;
}

async function deleteReport(report) {
  const confirmed = window.confirm(`Supprimer le rapport du ${formatDateOnly(report.reportDate)} ?`);
  if (!confirmed) return;
  await deleteDoc(doc(db, "daily_reports", report.id));
  if (report.username) {
    await deleteDoc(doc(db, "users", report.username, "daily_reports", report.id));
  }
  await loadAllReports();
  showToast("Rapport supprime");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

function openUserModal(user = null) {
  els.userForm.reset();
  els.editingUsername.value = user?.username ?? "";
  els.userModalTitle.textContent = user ? "Edit user" : "Create user";
  els.firstName.value = user?.Firstname ?? "";
  els.lastName.value = user?.Lastname ?? "";
  els.username.value = user?.username ?? "";
  els.password.value = user?.password ?? "";
  els.userModal.showModal();
}

async function saveUser(event) {
  event.preventDefault();

  const editingUsername = els.editingUsername.value.trim();
  const username = els.username.value.trim();
  const userData = {
    Firstname: els.firstName.value.trim(),
    Lastname: els.lastName.value.trim(),
    username,
    password: els.password.value,
    isConnected: users.find((user) => user.username === editingUsername)?.isConnected ?? false,
    updatedAt: serverTimestamp(),
  };

  if (!userData.Firstname || !userData.Lastname || !userData.username || !userData.password) {
    showToast("Veuillez remplir tous les champs");
    return;
  }

  if (editingUsername && editingUsername !== username) {
    await deleteDoc(doc(db, "users", editingUsername));
  }

  await setDoc(doc(db, "users", username), userData, { merge: true });
  els.userModal.close();
  showToast("Utilisateur enregistre");
}

async function deleteUser(user) {
  const username = user.username ?? user.id;
  const confirmed = window.confirm(`Supprimer ${username} ?`);
  if (!confirmed) return;
  await deleteDoc(doc(db, "users", username));
  showToast("Utilisateur supprime");
}

function ensureMap() {
  if (map) return;

  map = L.map("map", { zoomControl: true }).setView([36.7538, 3.0588], 13);
  L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`, {
    maxZoom: 20,
    attribution: "Geoapify | OpenStreetMap contributors",
  }).addTo(map);
  healthcareLayer = L.layerGroup().addTo(map);
  pinnedPlacesLayer = L.layerGroup().addTo(map);
}

function clearRouteLayers() {
  animationTimer && window.clearInterval(animationTimer);
  animationTimer = null;
  animationPoints = [];
  animationIndex = 0;
  animationPaused = false;
  routeLine?.remove();
  animatedRouteLine?.remove();
  currentMarker?.remove();
  routePointsLayer?.remove();
  routeLine = null;
  animatedRouteLine = null;
  currentMarker = null;
  routePointsLayer = null;
  updateAnimationButton();
}

function updateAnimationButton() {
  const hasAnimation = animationPoints.length > 0 && animationIndex < animationPoints.length;
  els.pauseRoute.disabled = !hasAnimation;
  els.pauseRoute.innerHTML = `<span aria-hidden="true">${animationPaused ? "â–¶" : "â…¡"}</span>`;
  els.pauseRoute.title = animationPaused ? "Resume animation" : "Pause animation";
  els.pauseRoute.setAttribute("aria-label", animationPaused ? "Resume animation" : "Pause animation");
}

function toggleRouteAnimation() {
  if (!animationPoints.length || animationIndex >= animationPoints.length) return;
  animationPaused = !animationPaused;
  updateAnimationButton();
}

async function toggleMapFullscreen() {
  const isNativeFullscreen = document.fullscreenElement === els.mapShell;

  if (isNativeFullscreen || mapExpanded) {
    if (isNativeFullscreen) {
      await document.exitFullscreen();
    }
    setMapExpanded(false);
    return;
  }

  try {
    await els.mapShell.requestFullscreen();
  } catch (error) {
    setMapExpanded(true);
  }
  window.setTimeout(() => map?.invalidateSize(), 120);
}

function updateFullscreenButton() {
  const isFull = document.fullscreenElement === els.mapShell || mapExpanded;
  els.fullscreenMap.innerHTML = `<span aria-hidden="true">${isFull ? "Ã—" : "â›¶"}</span>`;
  els.fullscreenMap.title = isFull ? "Exit full screen" : "Full screen";
  els.fullscreenMap.setAttribute("aria-label", isFull ? "Exit full screen" : "Full screen");
  window.setTimeout(() => map?.invalidateSize(), 80);
}

function setMapExpanded(expanded) {
  mapExpanded = expanded;
  els.mapShell.classList.toggle("is-expanded", expanded);
  document.body.classList.toggle("map-expanded", expanded);
  updateFullscreenButton();
}

async function loadHealthcarePlaces(lat, lon) {
  const params = new URLSearchParams({
    categories: [
      "healthcare.dentist",
      "healthcare.clinic_or_praxis",
      "healthcare.hospital",
      "healthcare.pharmacy",
      "healthcare.laboratory",
    ].join(","),
    filter: `circle:${lon},${lat},30000`,
    bias: `proximity:${lon},${lat}`,
    limit: "100",
    apiKey: GEOAPIFY_KEY,
  });

  const response = await fetch(`https://api.geoapify.com/v2/places?${params}`);
  if (!response.ok) return;

  const data = await response.json();
  healthcareLayer.clearLayers();
  const seen = new Set();

  for (const feature of data.features ?? []) {
    const props = feature.properties ?? {};
    const placeLat = Number(props.lat);
    const placeLon = Number(props.lon);
    if (!Number.isFinite(placeLat) || !Number.isFinite(placeLon)) continue;

    const key = props.place_id ?? `${placeLat},${placeLon}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const isDental = String(props.categories ?? "").includes("dentist");
    const title = props.name || (isDental ? "Cabinet dentaire" : "Etablissement medical");
    L.circleMarker([placeLat, placeLon], {
      radius: isDental ? 7 : 6,
      color: isDental ? "#7c3aed" : "#0f766e",
      fillColor: isDental ? "#a78bfa" : "#2dd4bf",
      fillOpacity: 0.9,
      weight: 2,
    })
      .bindPopup(`<strong>${escapeHtml(title)}</strong><br>${escapeHtml(props.formatted ?? "")}`)
      .addTo(healthcareLayer);
  }
}

async function loadUserPinnedPlaces(selectedUser) {
  if (!pinnedPlacesLayer) return [];

  pinnedPlacesLayer.clearLayers();
  const latLngs = [];
  const userIds = users
    .map((user) => user.username ?? user.id)
    .filter(Boolean);

  if (selectedUser && !userIds.includes(selectedUser)) {
    userIds.push(selectedUser);
  }

  for (const userId of userIds) {
    const user = users.find((item) => (item.username ?? item.id) === userId) ?? {};
    const placesQuery = query(
      collection(db, "users", userId, "locations"),
      where("isManualPlace", "==", true),
      limit(200)
    );
    const snapshot = await getDocs(placesQuery);

    snapshot.docs
      .map((item) => item.data())
      .filter((data) => data.isDeleted !== true)
      .filter((data) => Number.isFinite(Number(data.latitude)) && Number.isFinite(Number(data.longitude)))
      .forEach((data) => {
      const lat = Number(data.latitude);
      const lon = Number(data.longitude);
      latLngs.push([lat, lon]);
      const label = data.label || "Point";
      const type = data.type || "Lieu";
      const creatorName = `${data.firstname ?? user.Firstname ?? ""} ${data.lastname ?? user.Lastname ?? ""}`.trim();
      const username = data.username ?? userId;
      const createdBy = creatorName || username;
      const popupHtml = `
        <strong>Client : ${escapeHtml(label)}</strong><br>
        Type : ${escapeHtml(type)}<br>
        Cree par : ${escapeHtml(createdBy)}<br>
        Username : ${escapeHtml(username)}<br>
        Date/time : ${escapeHtml(formatDateTime(data.createdAt ?? data.deviceRecordedAt))}<br>
        Latitude : ${lat.toFixed(6)}<br>
        Longitude : ${lon.toFixed(6)}
      `;

      L.circleMarker([lat, lon], {
        radius: 9,
        color: "#1d4ed8",
        fillColor: "#60a5fa",
        fillOpacity: 0.95,
        weight: 3,
      })
        .bindTooltip(escapeHtml(label), {
          permanent: true,
          direction: "top",
          offset: [0, -10],
          className: "manual-place-label",
        })
        .bindPopup(popupHtml)
        .addTo(pinnedPlacesLayer);
    });
  }

  return latLngs;
}

async function getLastPosition() {
  const selectedUser = els.mapUserSelect.value;
  if (!selectedUser) {
    showToast("Select a user");
    return null;
  }

  clearRouteLayers();
  const locationsQuery = query(
    collection(db, "users", selectedUser, "locations"),
    orderBy("sortTime", "desc"),
    limit(25)
  );
  const snapshot = await getDocs(locationsQuery);

  const gpsDocs = snapshot.docs.filter((item) => item.data().isManualPlace !== true);

  if (!gpsDocs.length) {
    const pinnedLatLngs = await loadUserPinnedPlaces(selectedUser);
    if (pinnedLatLngs.length) {
      map.fitBounds(L.latLngBounds(pinnedLatLngs), { padding: [40, 40] });
      showToast("Clients pointes charges");
      return pinnedLatLngs[pinnedLatLngs.length - 1];
    }
    showToast("No GPS position available");
    return null;
  }

  const data = gpsDocs[0].data();
  const lat = Number(data.latitude);
  const lon = Number(data.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  currentMarker = L.marker([lat, lon]).addTo(map).bindPopup(`User : ${escapeHtml(selectedUser)}`);
  map.setView([lat, lon], 16);
  await loadHealthcarePlaces(lat, lon);
  await loadUserPinnedPlaces(selectedUser);
  return [lat, lon];
}

function startTracking() {
  ensureMap();
  stopTracking();
  getLastPosition();
  liveTimer = window.setInterval(getLastPosition, 5000);
  showToast("Tracking started");
}

function stopTracking() {
  if (liveTimer) {
    window.clearInterval(liveTimer);
    liveTimer = null;
  }
}

async function showFilteredRoute() {
  ensureMap();
  stopTracking();
  clearRouteLayers();

  const selectedUser = els.mapUserSelect.value;
  if (!selectedUser) {
    showToast("Select a user");
    return;
  }

  const date = els.historyDate.value;
  const startTime = els.historyStart.value || "00:00";
  const endTime = els.historyEnd.value || "23:59";
  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(`${date}T${endTime}:00`);

  if (!date || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    showToast("End time must be after start time");
    return;
  }

  const locationsQuery = query(
    collection(db, "users", selectedUser, "locations"),
    where("sortTime", ">=", start.getTime()),
    where("sortTime", "<=", end.getTime()),
    orderBy("sortTime")
  );

  const snapshot = await getDocs(locationsQuery);
  await loadUserPinnedPlaces(selectedUser);
  const points = snapshot.docs
    .map((item) => item.data())
    .filter((data) => data.isManualPlace !== true)
    .filter((data) => Number.isFinite(Number(data.latitude)) && Number.isFinite(Number(data.longitude)))
    .filter((data) => {
      const sortTime = Number(data.sortTime);
      return Number.isFinite(sortTime) && sortTime >= start.getTime() && sortTime <= end.getTime();
    })
    .map((data) => ({
      latLng: [Number(data.latitude), Number(data.longitude)],
      label: `${data.firstname ?? ""} ${data.lastname ?? ""}`.trim(),
      username: data.username ?? selectedUser,
      time: data.deviceRecordedAt,
      sortTime: Number(data.sortTime),
    }));

  if (!points.length) {
    showToast("No GPS points in this period");
    return;
  }

  showToast(`Route from ${startTime} to ${endTime}`);
  animateRoute(points);
}

function animateRoute(points) {
  clearRouteLayers();

  const allLatLngs = points.map((point) => point.latLng);
  animatedRouteLine = L.polyline([], { color: "#2563eb", weight: 5 }).addTo(map);
  routePointsLayer = L.layerGroup().addTo(map);
  animationPoints = points;
  animationIndex = 0;
  animationPaused = false;
  updateAnimationButton();

  map.fitBounds(L.latLngBounds(allLatLngs), { padding: [40, 40] });

  animationTimer = window.setInterval(() => {
    if (animationPaused) return;

    if (animationIndex >= animationPoints.length) {
      window.clearInterval(animationTimer);
      animationTimer = null;
      updateAnimationButton();
      return;
    }

    const point = animationPoints[animationIndex];
    animatedRouteLine.addLatLng(point.latLng);
    addRoutePointMarker(point, animationIndex, animationPoints.length);
    currentMarker?.remove();
    currentMarker = L.marker(point.latLng)
      .addTo(map)
      .bindPopup(
        `<strong>${escapeHtml(point.label || point.username)}</strong><br>${escapeHtml(point.username)}<br>${escapeHtml(formatDateTime(point.time))}`
      );
    animationIndex += 1;
    updateAnimationButton();
  }, 90);
}

function addRoutePointMarker(point, pointIndex, totalPoints) {
  const isFirst = pointIndex === 0;
  const isLast = pointIndex === totalPoints - 1;
  const color = isFirst ? "#12805c" : isLast ? "#d3342f" : "#2563eb";
  const label = isFirst ? "Depart" : isLast ? "Arrivee" : `Point ${pointIndex + 1}`;
  const popupHtml = `
    <strong>${escapeHtml(label)}</strong><br>
    User : ${escapeHtml(point.label || point.username)}<br>
    Username : ${escapeHtml(point.username)}<br>
    Date/time : ${escapeHtml(formatDateTime(point.time))}<br>
    Latitude : ${point.latLng[0].toFixed(6)}<br>
    Longitude : ${point.latLng[1].toFixed(6)}
  `;

  L.circleMarker(point.latLng, {
    radius: isFirst || isLast ? 8 : 5,
    color,
    fillColor: color,
    fillOpacity: 0.92,
    weight: 2,
  })
    .bindPopup(popupHtml)
    .addTo(routePointsLayer);
}

els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.querySelector("#admin-email").value.trim();
  const password = document.querySelector("#admin-password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      els.loginForm.reset();
      els.loginError.textContent = "";
    })
    .catch((error) => {
      els.loginError.textContent = firebaseAuthErrorMessage(error.code);
    });
});

function firebaseAuthErrorMessage(code) {
  const messages = {
    "auth/invalid-email": "Email invalide.",
    "auth/user-disabled": "Ce compte est desactive.",
    "auth/user-not-found": "Compte superviseur introuvable.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/invalid-credential": "Email ou mot de passe incorrect.",
    "auth/too-many-requests": "Trop de tentatives. Reessayez plus tard.",
  };

  return messages[code] ?? "Connexion impossible. Verifiez les identifiants.";
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    els.loginError.textContent = "";
    showDashboard();
  } else {
    showLogin();
  }
});

els.logoutButton.addEventListener("click", () => {
  logout().catch((error) => showToast(`Logout error: ${error.message}`));
});
els.refreshUsers.addEventListener("click", refreshUsersOnce);
els.openUserModal.addEventListener("click", () => openUserModal());
els.cancelUser.addEventListener("click", () => els.userModal.close());
els.userForm.addEventListener("submit", saveUser);
els.startTracking.addEventListener("click", startTracking);
els.stopTracking.addEventListener("click", () => {
  stopTracking();
  showToast("Tracking stopped");
});
els.showRoute.addEventListener("click", showFilteredRoute);
els.pauseRoute.addEventListener("click", toggleRouteAnimation);
els.refreshClients.addEventListener("click", loadAllClients);
els.exportClients.addEventListener("click", exportClientsToExcel);
els.clientsUserFilter.addEventListener("change", loadAllClients);
els.refreshReports.addEventListener("click", loadAllReports);
els.exportReports.addEventListener("click", () => exportReportsToExcel());
els.reportsUserFilter.addEventListener("change", loadAllReports);
els.reportsDateFilter.addEventListener("change", loadAllReports);
els.fullscreenMap.addEventListener("click", () => {
  toggleMapFullscreen().catch((error) => showToast(`Full screen error: ${error.message}`));
});
document.addEventListener("fullscreenchange", updateFullscreenButton);
els.mapUserSelect.addEventListener("change", () => {
  stopTracking();
  clearRouteLayers();
});

els.navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewTarget));
});

els.historyDate.value = todayInputValue();

