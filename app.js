const $ = (selector) => document.querySelector(selector);
const chatWindow = $("#chatWindow");
const timeline = $("#timeline");
let toastTimer;

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function addMessage(text, who = "assistant") {
  const row = document.createElement("div");
  row.className = `message ${who}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = who === "user" ? "YOU" : "A+";
  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";
  const speaker = document.createElement("span");
  speaker.className = "speaker";
  speaker.textContent = who === "user" ? "YOU" : "ALEXA TRUSTLAYER";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text; // Use textContent to avoid interpreting user input as HTML.
  wrap.append(speaker, bubble);
  row.append(avatar, wrap);
  chatWindow.append(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function renderEvents(events) {
  timeline.replaceChildren();
  $("#eventCount").textContent = `${events.length} EVENT${events.length === 1 ? "" : "S"}`;
  $("#timelineEmpty").hidden = events.length > 0;
  const icons = {success: "✓", failed: "×", running: "↻", info: "i"};
  for (const e of events) {
    const card = document.createElement("article");
    card.className = `event ${e.status}`;
    const top = document.createElement("div");
    top.className = "event-top";
    const icon = document.createElement("span");
    icon.className = "event-icon";
    icon.textContent = icons[e.status] || "·";
    const status = document.createElement("span");
    status.className = "event-status";
    status.textContent = e.status;
    top.append(icon, status);
    const title = document.createElement("strong");
    title.textContent = e.step;
    const detail = document.createElement("p");
    detail.textContent = e.detail;
    const time = document.createElement("time");
    time.textContent = new Date(e.time).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", second: "2-digit"});
    card.append(top, title, detail, time);
    timeline.append(card);
  }
}

function renderDevice(device) {
  if (!device) return;
  $("#bulb").classList.toggle("on", device.on);
  $("#deviceStatus").textContent = device.on ? "Verified · ON" : "Standby · OFF";
  $("#devicePill").textContent = device.on ? "ON" : "OFF";
  $("#devicePill").classList.toggle("on", device.on);
  $("#devicePill").classList.toggle("off", !device.on);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {"Content-Type": "application/json", ...(options.headers || {})},
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

async function refreshMemory() {
  const enabled = $("#memoryToggle").checked;
  $("#preferenceInput").disabled = !enabled;
  $("#memoryForm").querySelector("button").disabled = !enabled;
  $("#clearMemory").disabled = !enabled;
  if (!enabled) {
    $("#memoryList").replaceChildren();
    const note = document.createElement("div");
    note.className = "empty-state";
    note.textContent = "Memory is disabled for this session.";
    $("#memoryList").append(note);
    $("#memoryMeta").textContent = "Disabled";
    return;
  }
  try {
    const data = await api("/api/memory");
    $("#memoryList").replaceChildren();
    if (!data.preferences.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No preferences saved yet.";
      $("#memoryList").append(empty);
    } else {
      for (const preference of data.preferences) {
        const item = document.createElement("div");
        item.className = "memory-item";
        const diamond = document.createElement("span");
        diamond.textContent = "◈";
        const content = document.createElement("span");
        content.textContent = preference;
        item.append(diamond, content);
        $("#memoryList").append(item);
      }
    }
    $("#memoryMeta").textContent = `${data.preferences.length} saved · local`;
  } catch (error) {
    toast(error.message);
  }
}

$("#chatForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#messageInput");
  const message = input.value.trim();
  if (!message) return;
  addMessage(message, "user");
  input.value = "";
  const send = $("#chatForm button");
  send.disabled = true;
  try {
    const result = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        scenario: $("#scenario").value,
        memoryEnabled: $("#memoryToggle").checked
      })
    });
    addMessage(result.reply);
    renderEvents(result.events || []);
    renderDevice(result.device);
  } catch (error) {
    addMessage(`I couldn't complete that request: ${error.message}`);
    toast(error.message);
  } finally {
    send.disabled = false;
    input.focus();
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    $("#messageInput").value = button.dataset.prompt;
    $("#chatForm").requestSubmit();
  });
});

$("#memoryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!$("#memoryToggle").checked) return;
  const input = $("#preferenceInput");
  const preference = input.value.trim();
  if (!preference) {
    toast("Enter a preference first.");
    return;
  }
  try {
    await api("/api/memory", {method: "POST", body: JSON.stringify({preference})});
    input.value = "";
    await refreshMemory();
    toast("Preference saved locally.");
  } catch (error) {
    toast(error.message);
  }
});

$("#clearMemory").addEventListener("click", async () => {
  if (!confirm("Clear all saved preferences from this demo?")) return;
  try {
    await api("/api/memory", {method: "DELETE"});
    await refreshMemory();
    toast("Saved preferences cleared.");
  } catch (error) {
    toast(error.message);
  }
});

$("#memoryToggle").addEventListener("change", refreshMemory);
refreshMemory();
