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
let animationTimer = null;
let animationPoints = [];
let animationIndex = 0;
let animationPaused = false;
let mapExpanded = false;
let map = null;

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
  };
  els.pageTitle.textContent = titles[view][0];
  els.pageSubtitle.textContent = titles[view][1];

  if (view === "map") {
    ensureMap();
    setTimeout(() => map.invalidateSize(), 60);
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
  els.pauseRoute.innerHTML = `<span aria-hidden="true">${animationPaused ? "▶" : "Ⅱ"}</span>`;
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
  els.fullscreenMap.innerHTML = `<span aria-hidden="true">${isFull ? "×" : "⛶"}</span>`;
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

async function getLastPosition() {
  const selectedUser = els.mapUserSelect.value;
  if (!selectedUser) {
    showToast("Select a user");
    return null;
  }

  const locationsQuery = query(
    collection(db, "users", selectedUser, "locations"),
    orderBy("sortTime", "desc"),
    limit(1)
  );
  const snapshot = await getDocs(locationsQuery);

  if (snapshot.empty) {
    showToast("No GPS position available");
    return null;
  }

  const data = snapshot.docs[0].data();
  const lat = Number(data.latitude);
  const lon = Number(data.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  clearRouteLayers();
  currentMarker = L.marker([lat, lon]).addTo(map).bindPopup(`User : ${escapeHtml(selectedUser)}`);
  map.setView([lat, lon], 16);
  await loadHealthcarePlaces(lat, lon);
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
  const points = snapshot.docs
    .map((item) => item.data())
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
