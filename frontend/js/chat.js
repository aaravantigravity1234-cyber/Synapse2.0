// ============================================
// Synapse AI — Chat Logic (Aura AI)
// ============================================


const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const heroSection = document.getElementById("hero-section");
const emptyState = document.getElementById("empty-state");
const userNameEl = document.getElementById("user-display-name");
const userAvatarEl = document.getElementById("user-avatar");
const logoutBtn = document.getElementById("logout-btn");

// UI Elements for History & Navigation
const navNewChatBtn = document.getElementById("nav-new-chat-btn");
const navHistoryBtn = document.getElementById("nav-history-btn");
const historyModal = document.getElementById("history-modal");
const historyModalContent = document.getElementById("history-modal-content");
const closeHistoryBtn = document.getElementById("close-history-btn");
const historyListContainer = document.getElementById("history-list-container");
const drawerToggle = document.getElementById("drawer-toggle");
const headerLogo = document.getElementById("header-logo");

// UI Elements for File Attachments
const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const attachmentPreviewContainer = document.getElementById("attachment-preview-container");
// We removed individual preview elements as they will be injected dynamically

// UI Elements for Model Selector
const modelSelectorBtn = document.getElementById("model-selector-btn");
const modelDropdown = document.getElementById("model-dropdown");
const currentModelNameEl = document.getElementById("current-model-name");
const modelOptions = document.querySelectorAll(".model-option");

// UI Elements for Settings
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const cancelSettingsBtn = document.getElementById("cancel-settings-btn");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const personaInput = document.getElementById("persona-input");

// ── State ──
let conversationHistory = [];
let isStreaming = false;
let currentChatId = generateId();
let attachedFiles = []; // Array of { filename, mimeType, data, isImage, size }
let currentModel = localStorage.getItem("selected_model") || "z-ai/glm4.7";
let currentModelName = localStorage.getItem("selected_model_name") || "Aura 1";
let abortController = null; // For stopping generation

// ── Aura 1 Toggle State ──
let aura1Mode = localStorage.getItem("aura1_mode") || "deep_think"; // "deep_think" or "fast"

// Stop button
const stopBtn = document.getElementById("stop-btn");

if (currentModelNameEl) currentModelNameEl.textContent = currentModelName;

// Aura 1 Mode Toggle DOM
const aura1ModeToggle = document.getElementById("aura1-mode-toggle");
const modeDeepThinkBtn = document.getElementById("mode-deep-think-btn");
const modeFastBtn = document.getElementById("mode-fast-btn");

function updateAura1ToggleUI() {
  if (!aura1ModeToggle) return;
  if (currentModelName === "Aura 1") {
    aura1ModeToggle.style.display = "flex";
    if (aura1Mode === "deep_think") {
      modeDeepThinkBtn.className = "px-2.5 py-1 rounded-lg text-xs font-bold transition-all text-on-surface bg-white/10 shadow-sm";
      modeFastBtn.className = "px-2.5 py-1 rounded-lg text-xs font-bold transition-all text-on-surface-variant hover:text-on-surface";
      modeDeepThinkBtn.dataset.active = "true";
      modeFastBtn.removeAttribute("data-active");
      currentModel = "z-ai/glm4.7";
    } else {
      modeFastBtn.className = "px-2.5 py-1 rounded-lg text-xs font-bold transition-all text-on-surface bg-white/10 shadow-sm";
      modeDeepThinkBtn.className = "px-2.5 py-1 rounded-lg text-xs font-bold transition-all text-on-surface-variant hover:text-on-surface";
      modeFastBtn.dataset.active = "true";
      modeDeepThinkBtn.removeAttribute("data-active");
      currentModel = "openai/gpt-oss-120b";
    }
    localStorage.setItem("selected_model", currentModel);
  } else {
    aura1ModeToggle.style.display = "none";
  }
}

if (modeDeepThinkBtn) {
  modeDeepThinkBtn.addEventListener("click", () => {
    aura1Mode = "deep_think";
    localStorage.setItem("aura1_mode", aura1Mode);
    updateAura1ToggleUI();
  });
}
if (modeFastBtn) {
  modeFastBtn.addEventListener("click", () => {
    aura1Mode = "fast";
    localStorage.setItem("aura1_mode", aura1Mode);
    updateAura1ToggleUI();
  });
}

// Initial UI sync
updateAura1ToggleUI();


// ── Helpers ──
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ── IndexedDB Helper (for persistent images & artifacts) ──
const dbName = "SynapseDB";
const dbVersion = 1;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("attachments")) {
        db.createObjectStore("attachments", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("artifacts")) {
        db.createObjectStore("artifacts", { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveToDB(storeName, id, data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put({ id, data });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getFromDB(storeName, id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result?.data);
    request.onerror = () => reject(request.error);
  });
}

// ── Auth Guard + User Info ──
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "/";
    return;
  }
  if (userNameEl) userNameEl.textContent = user.displayName || user.email?.split("@")[0] || "User";
  if (userAvatarEl) {
    if (user.photoURL) {
      const avatarImg = document.createElement('img');
      avatarImg.src = user.photoURL;
      avatarImg.alt = 'Profile';
      avatarImg.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
      userAvatarEl.innerHTML = '';
      userAvatarEl.appendChild(avatarImg);
    } else {
      const initial = (user.displayName || user.email || "U")[0].toUpperCase();
      userAvatarEl.innerHTML = `<span style="font-size:16px;font-weight:700;color:#00dbe9;">${initial}</span>`;
    }
  }
  loadHistoryIndex(); // Load past chats when user logs in
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
    window.location.href = '/index.html';
  });
}


if (attachBtn) attachBtn.addEventListener("click", () => fileInput.click());

// ── Image Compression Helper ──
function compressImage(dataUrl, maxWidth = 1024, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      
      // Scale down if larger than maxWidth
      if (w > maxWidth || h > maxWidth) {
        const ratio = Math.min(maxWidth / w, maxWidth / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      
      // Compress as JPEG
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
}

if (fileInput) {
  fileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      if (attachedFiles.length >= 5) {
        alert("Aura supports a maximum of 5 files.");
        break;
      }
      
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();
      
      const readPromise = new Promise((resolve) => {
        reader.onload = async (ev) => {
          let fileData = ev.target.result;
          if (isImage) {
            fileData = await compressImage(fileData, 1024, 0.7);
          }
          attachedFiles.push({
            filename: file.name,
            mimeType: isImage ? "image/jpeg" : file.type,
            data: fileData,
            isImage: isImage,
            size: file.size
          });
          resolve();
        };
      });
      
      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
      
      await readPromise;
    }
    
    // Reset file input so re-selecting the same file triggers change event
    if (fileInput) fileInput.value = "";
    renderAttachments();
  });
}

function renderAttachments() {
  if (attachedFiles.length === 0) {
    attachmentPreviewContainer.classList.add("hidden");
    attachmentPreviewContainer.innerHTML = "";
    return;
  }
  
  attachmentPreviewContainer.classList.remove("hidden");
  attachmentPreviewContainer.innerHTML = "";
  
  attachedFiles.forEach((attachment, index) => {
    const item = document.createElement("div");
    item.className = "relative w-16 h-16 rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30 group flex-shrink-0 bg-surface-variant/30";
    
    let previewHtml = "";
    if (attachment.isImage) {
      previewHtml = `<img src="${attachment.data}" class="w-full h-full object-cover" />`;
    } else {
      previewHtml = `<div class="w-full h-full flex items-center justify-center text-on-surface-variant"><span class="material-symbols-outlined text-2xl">description</span></div>`;
    }
    
    item.innerHTML = `
      ${previewHtml}
      <button type="button" onclick="removeAttachment(${index})" class="absolute top-1 right-1 w-5 h-5 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-black/80 focus:opacity-100 z-10" title="Remove attachment">
        <span class="material-symbols-outlined" style="font-size:14px;">close</span>
      </button>
    `;
    attachmentPreviewContainer.appendChild(item);
  });
}

window.removeAttachment = function(index) {
  attachedFiles.splice(index, 1);
  if (attachedFiles.length === 0) {
    fileInput.value = "";
  }
  renderAttachments();
};

// ── AI Personality System ──
const personalityCards = document.querySelectorAll(".personality-card");
const customPersonaSection = document.getElementById("custom-persona-section");
const personalityBadge = document.getElementById("personality-badge");
const personalityBadgeName = document.getElementById("personality-badge-name");
let selectedPersonalityId = localStorage.getItem("personality_id") || "default";

// Map personality IDs to display names for badge
const personalityNames = {
  default: "Default",
  creative: "Creative",
  coder: "Code Expert",
  tutor: "Study Buddy",
  coach: "Coach",
  debate: "Debate",
  storyteller: "Storyteller",
  custom: "Custom"
};

// Initialize personality badge on load
function updatePersonalityBadge() {
  if (!personalityBadge) return;
  const name = personalityNames[selectedPersonalityId] || "Default";
  if (personalityBadgeName) personalityBadgeName.textContent = name;
  
  if (selectedPersonalityId !== "default") {
    personalityBadge.classList.remove("hidden");
    personalityBadge.classList.add("flex");
  } else {
    personalityBadge.classList.add("hidden");
    personalityBadge.classList.remove("flex");
  }
}

updatePersonalityBadge();

// Clicking the badge opens the personality modal
if (personalityBadge) {
  personalityBadge.addEventListener("click", () => {
    openPersonalityModal();
  });
}

function openPersonalityModal() {
  // Sync UI state with stored personality
  selectedPersonalityId = localStorage.getItem("personality_id") || "default";
  
  personalityCards.forEach(card => {
    card.classList.toggle("active", card.dataset.personality === selectedPersonalityId);
  });
  
  // Show/hide custom textarea
  if (customPersonaSection) {
    if (selectedPersonalityId === "custom") {
      customPersonaSection.classList.remove("hidden");
    } else {
      customPersonaSection.classList.add("hidden");
    }
  }
  
  // Load custom persona text
  if (personaInput) {
    personaInput.value = localStorage.getItem("custom_persona_text") || "";
  }
  
  settingsModal.classList.remove("hidden");
  setTimeout(() => {
    settingsModal.classList.remove("opacity-0");
    const content = document.getElementById("settings-modal-content");
    if (content) content.classList.remove("scale-95");
  }, 10);
}

// Card click handlers
personalityCards.forEach(card => {
  card.addEventListener("click", () => {
    // Deactivate all cards
    personalityCards.forEach(c => c.classList.remove("active"));
    // Activate clicked card
    card.classList.add("active");
    selectedPersonalityId = card.dataset.personality;
    
    // Show/hide custom textarea
    if (customPersonaSection) {
      if (selectedPersonalityId === "custom") {
        customPersonaSection.classList.remove("hidden");
        if (personaInput) personaInput.focus();
      } else {
        customPersonaSection.classList.add("hidden");
      }
    }
  });
});

if (settingsBtn) {
  settingsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (drawerToggle) drawerToggle.checked = false;
    openPersonalityModal();
  });
}

function closeSettings() {
  settingsModal.classList.add("opacity-0");
  const content = document.getElementById("settings-modal-content");
  if (content) content.classList.add("scale-95");
  setTimeout(() => {
    settingsModal.classList.add("hidden");
  }, 300);
}

if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", closeSettings);
if (cancelSettingsBtn) cancelSettingsBtn.addEventListener("click", closeSettings);
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener("click", () => {
    // Get the selected card's personality
    const activeCard = document.querySelector(".personality-card.active");
    if (!activeCard) return;
    
    const personalityId = activeCard.dataset.personality;
    const builtInPrompt = activeCard.dataset.prompt;
    
    localStorage.setItem("personality_id", personalityId);
    
    if (personalityId === "custom") {
      const customText = personaInput?.value?.trim() || "";
      localStorage.setItem("custom_persona_text", customText);
      localStorage.setItem("system_persona", customText);
    } else if (personalityId === "default") {
      localStorage.removeItem("system_persona");
    } else {
      localStorage.setItem("system_persona", builtInPrompt);
    }
    
    selectedPersonalityId = personalityId;
    updatePersonalityBadge();
    closeSettings();
  });
}

// ── Sidebar Logic ──
if (modelSelectorBtn && modelDropdown) {
  modelSelectorBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = modelDropdown.classList.contains("hidden");
    if (isHidden) {
      modelDropdown.classList.remove("hidden");
      modelDropdown.classList.remove("pointer-events-none");
      setTimeout(() => {
        modelDropdown.classList.remove("opacity-0");
        modelDropdown.classList.remove("translate-y-2");
      }, 10);
    } else {
      closeModelDropdown();
    }
  });

  document.addEventListener("click", (e) => {
    if (!modelDropdown.contains(e.target) && !modelSelectorBtn.contains(e.target)) {
      closeModelDropdown();
    }
  });
}

function closeModelDropdown() {
  if (!modelDropdown) return;
  modelDropdown.classList.add("opacity-0");
  modelDropdown.classList.add("translate-y-2");
  modelDropdown.classList.add("pointer-events-none");
  setTimeout(() => {
    modelDropdown.classList.add("hidden");
  }, 200);
}



if (modelOptions) {
  modelOptions.forEach(option => {
    option.addEventListener("click", () => {
      const selectedModel = option.getAttribute("data-model");
      const selectedName = option.getAttribute("data-name");



      // Set model name first, then update toggle UI
      currentModelName = selectedName;
      localStorage.setItem("selected_model_name", currentModelName);

      if (selectedName === "Aura 1") {
        updateAura1ToggleUI(); // Sets currentModel internally based on toggle state
      } else {
        currentModel = selectedModel;
        localStorage.setItem("selected_model", currentModel);
        updateAura1ToggleUI(); // Hide the toggle for non-Aura1 models
      }

      if (currentModelNameEl) currentModelNameEl.textContent = currentModelName;
      // Apply accent color to model name
      if (currentModelName === 'Aura 1') currentModelNameEl.style.color = '#00dbe9';
      else if (currentModelName === 'Aura 2') currentModelNameEl.style.color = '#4caf50';
      else if (currentModelName === 'Aura Coder') currentModelNameEl.style.color = '#dcb8ff';
      else if (currentModelName === 'Aura imagin') currentModelNameEl.style.color = '#ff9800';
      
      // Update active indicator in dropdown
      updateActiveModelIndicator(currentModelName);
      
      updateDynamicTheme(currentModelName);
      closeModelDropdown();
      createNewChat();
      showToast(`Switched to ${currentModelName}`, 'success');
    });
  });
}

// ── Dynamic Theming ──
function updateDynamicTheme(modelName) {
  const root = document.documentElement;
  
  const themes = {
    "Aura 1": {
      blob1: "#6366f1", // Indigo
      blob2: "#0ea5e9", // Cyan
      blob3: "#ec4899"  // Pink
    },
    "Aura 2": {
      blob1: "#10b981", // Emerald
      blob2: "#4caf50", // Green
      blob3: "#00dbe9"  // Teal
    },
    "Aura Coder": {
      blob1: "#7701d0", // Deep Purple
      blob2: "#dcb8ff", // Lavender
      blob3: "#6366f1"  // Indigo
    },
    "Aura imagin": {
      blob1: "#ff9800", // Orange
      blob2: "#ff5722", // Deep Orange
      blob3: "#ffc107"  // Amber
    }
  };

  const theme = themes[modelName] || themes["Aura 1"];
  
  root.style.setProperty("--blob-1-color", theme.blob1);
  root.style.setProperty("--blob-2-color", theme.blob2);
  root.style.setProperty("--blob-3-color", theme.blob3);
}

// Initialize theme on load
updateDynamicTheme(currentModelName);

// ── Active Model Indicator ──
function updateActiveModelIndicator(activeModelName) {
  modelOptions.forEach(option => {
    const name = option.getAttribute('data-name');
    if (name === activeModelName) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
}

// Initialize active indicator on load
updateActiveModelIndicator(currentModelName);

// window so onclick from html works
window.loadSession = loadSession;
window.deleteSession = deleteSession;

// ── Local Storage History ──
function getHistoryIndex() {
  const index = localStorage.getItem("chat_index");
  return index ? JSON.parse(index) : [];
}

function saveHistoryIndex(index) {
  localStorage.setItem("chat_index", JSON.stringify(index));
}

function saveSession() {
  if (conversationHistory.length === 0) return;
  
  try {
    // (#20) Move base64 image data to IndexedDB to save localStorage space & persist
    const stripped = conversationHistory.map(msg => {
      if (Array.isArray(msg.content)) {
        return {
          ...msg,
          content: msg.content.map(block => {
            if (block.type === 'image_url' && block.image_url?.url?.startsWith('data:')) {
              const imgId = `img_${currentChatId}_${Math.random().toString(36).substr(2, 9)}`;
              saveToDB("attachments", imgId, block.image_url.url);
              return { type: 'image_url', image_url: { url: `db:${imgId}` } };
            }
            return block;
          })
        };
      }
      return msg;
    });
    localStorage.setItem(`chat_${currentChatId}`, JSON.stringify(stripped));
    
    let index = getHistoryIndex();
    let existing = index.find(c => c.id === currentChatId);
    
    if (existing) {
      existing.updatedAt = Date.now();
    } else {
      // Generate title from first message
      let firstMsg = conversationHistory.find(m => m.role === "user")?.content || "New Chat";
      if (typeof firstMsg === "string") {
        firstMsg = firstMsg.slice(0, 30) + (firstMsg.length > 30 ? "..." : "");
      } else if (Array.isArray(firstMsg)) {
        firstMsg = firstMsg.find(b => b.type === "text")?.text || "Attachment Chat";
        firstMsg = firstMsg.slice(0, 30) + (firstMsg.length > 30 ? "..." : "");
      } else {
        firstMsg = "Attachment Chat";
      }
      index.push({ id: currentChatId, title: firstMsg, updatedAt: Date.now(), model: currentModelName });
    }
    
    // Sort by newest
    index.sort((a, b) => b.updatedAt - a.updatedAt);
    saveHistoryIndex(index);

    // Clear draft on successful save
    localStorage.removeItem('synapse_draft_input');
    if (chatInput) chatInput.classList.remove('has-draft');
  } catch (e) {
    console.warn("Could not save session to local storage:", e);
  }
}

// (#2) Auto-rename chat title after first AI response
function autoRenameChat(aiResponse) {
  const index = getHistoryIndex();
  const entry = index.find(c => c.id === currentChatId);
  if (!entry || entry._renamed) return;
  
  // Simple client-side heuristic: extract first sentence or key phrase
  const text = typeof aiResponse === 'string' ? aiResponse : '';
  const userMsg = conversationHistory.find(m => m.role === 'user');
  let userText = '';
  if (userMsg) {
    userText = typeof userMsg.content === 'string' ? userMsg.content : 
               (Array.isArray(userMsg.content) ? (userMsg.content.find(c => c.type === 'text')?.text || '') : '');
  }
  
  // Use the user message to generate a better title (max 40 chars)
  let title = userText.trim();
  // Remove filler words at the start
  title = title.replace(/^(hey|hi|hello|can you|please|help me|i need|i want)\s+/i, '');
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  // Truncate
  if (title.length > 40) title = title.slice(0, 40) + '...';
  if (title.length < 3) return; // too short to rename
  
  entry.title = title;
  entry._renamed = true;
  saveHistoryIndex(index);
}

async function loadSession(id) {
  const data = localStorage.getItem(`chat_${id}`);
  if (!data) return;
  
  // Clear artifact store from previous chat to prevent stale references & memory leaks
  artifactStore.clear();
  artifactCounter = 0;
  
  conversationHistory = JSON.parse(data);
  currentChatId = id;
  
  // Resolve images from IndexedDB
  for (const msg of conversationHistory) {
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "image_url" && block.image_url.url.startsWith("db:")) {
          const imgId = block.image_url.url.split("db:")[1];
          const realUrl = await getFromDB("attachments", imgId);
          if (realUrl) block.image_url.url = realUrl;
        }
      }
    }
  }

  chatMessages.innerHTML = "";
  if (heroSection) heroSection.style.display = "none";
  if (emptyState) emptyState.style.display = "none";
  
  conversationHistory.forEach((msg, idx) => {
    // Handling multimodal historical messages
    if (msg.role === "assistant") {
      appendMessage("ai", msg.content || "", idx);
    } else {
      // User message
      let htmlContent = "";
      if (typeof msg.content === "string") {
        htmlContent = escapeHtml(msg.content);
      } else if (Array.isArray(msg.content)) {
        const textItem = msg.content.find(c => c.type === "text");
        let rawText = textItem ? textItem.text : "[Attachment]";
        
        // Strip out appended file contents so only the user's typed message shows
        let displayIdx = rawText.indexOf("\n\nAttached file contents (");
        if (displayIdx !== -1) {
          rawText = rawText.substring(0, displayIdx);
        }
        htmlContent = escapeHtml(rawText);
        
        let previews = [];
        for (const block of msg.content) {
          if (block.type === "image_url") {
            const src = block.image_url.url.startsWith("db:") ? "#" : block.image_url.url;
            const dbAttr = block.image_url.url.startsWith("db:") ? `data-db-id="${block.image_url.url.split("db:")[1]}"` : "";
            previews.push(`<img src="${src}" ${dbAttr} class="lazy-db-img" style="max-height: 200px; border-radius: 8px; margin-top: 8px; border: 1px solid rgba(255,255,255,0.1);"/>`);
          }
        }
        if (previews.length > 0) {
          htmlContent += `<br><div style="display:flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">${previews.join("")}</div>`;
        }
      }
      appendMessage("user", htmlContent, idx, true);
    }
  });
  
  // Lazy load images from DB for user bubbles
  document.querySelectorAll(".lazy-db-img").forEach(async img => {
    if (img.dataset.dbId) {
      const data = await getFromDB("attachments", img.dataset.dbId);
      if (data) img.src = data;
      img.classList.remove("lazy-db-img");
    }
  });

  scrollToBottom(true);
  closeHistoryModal();
  if (drawerToggle) drawerToggle.checked = false; // close drawer
  
  // (#10) Show model warning if chat was with a different model
  const histIndex = getHistoryIndex();
  const chatEntry = histIndex.find(c => c.id === id);
  if (chatEntry?.model) showModelWarning(chatEntry.model);
  
  // (#6) Apply syntax highlighting to loaded code blocks
  if (window.hljs) {
    document.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }
}

function deleteSession(id) {
  localStorage.removeItem(`chat_${id}`);
  let index = getHistoryIndex();
  index = index.filter(c => c.id !== id);
  saveHistoryIndex(index);
  
  if (id === currentChatId) {
    createNewChat();
  }
  loadHistoryIndex();
}

function deleteAllHistory() {
  const index = getHistoryIndex();
  index.forEach(chat => {
    localStorage.removeItem(`chat_${chat.id}`);
  });
  localStorage.removeItem("chat_index");
  createNewChat();
  loadHistoryIndex();
  closeDeleteHistoryModal();
  showToast('All history cleared', 'success'); // (#4)
}

const deleteAllHistoryBtn = document.getElementById("delete-all-history-btn");
const deleteHistoryModal = document.getElementById("delete-history-modal");
const deleteHistoryModalContent = document.getElementById("delete-history-modal-content");
const confirmDeleteHistoryBtn = document.getElementById("confirm-delete-history-btn");
const cancelDeleteHistoryBtn = document.getElementById("cancel-delete-history-btn");

function openDeleteHistoryModal() {
  if (!deleteHistoryModal) return;
  deleteHistoryModal.classList.remove("hidden");
  deleteHistoryModal.classList.add("flex");
  setTimeout(() => {
    deleteHistoryModal.classList.remove("opacity-0");
    if (deleteHistoryModalContent) deleteHistoryModalContent.classList.remove("scale-95");
  }, 10);
  if (drawerToggle) drawerToggle.checked = false;
}

function closeDeleteHistoryModal() {
  if (!deleteHistoryModal) return;
  deleteHistoryModal.classList.add("opacity-0");
  if (deleteHistoryModalContent) deleteHistoryModalContent.classList.add("scale-95");
  setTimeout(() => {
    deleteHistoryModal.classList.add("hidden");
    deleteHistoryModal.classList.remove("flex");
  }, 300);
}

if (deleteAllHistoryBtn) {
  deleteAllHistoryBtn.addEventListener("click", openDeleteHistoryModal);
}
if (cancelDeleteHistoryBtn) {
  cancelDeleteHistoryBtn.addEventListener("click", closeDeleteHistoryModal);
}
if (confirmDeleteHistoryBtn) {
  confirmDeleteHistoryBtn.addEventListener("click", deleteAllHistory);
}

// (#3) Undo snackbar state
let _undoSnackbarTimeout = null;
let _previousChatId = null;
let _previousHistory = null;

function createNewChat(skipUndo = false) {
  // If there's an active conversation, offer undo (#3)
  if (!skipUndo && conversationHistory.length > 0) {
    _previousChatId = currentChatId;
    _previousHistory = [...conversationHistory];
    showUndoSnackbar();
  }
  
  currentChatId = generateId();
  conversationHistory = [];
  chatMessages.innerHTML = "";
  
  // Clear artifact store to free memory from previous chat
  artifactStore.clear();
  artifactCounter = 0;
  
  if (heroSection) heroSection.style.display = "";
  if (emptyState) emptyState.style.display = "flex";
  
  // Render Dynamic Category Chips based on current model
  renderSuggestionChips();
  
  // Show empty state CTA
  const ctaEl = document.getElementById('empty-state-cta');
  if (ctaEl) ctaEl.style.display = '';
  
  if (drawerToggle) drawerToggle.checked = false;
  
  isStreaming = false;
  updateSendButton(false);
  setOrbState('idle');
}

// (#3) Undo Snackbar
function showUndoSnackbar() {
  let snackbar = document.getElementById('undo-snackbar');
  if (!snackbar) {
    snackbar = document.createElement('div');
    snackbar.id = 'undo-snackbar';
    snackbar.className = 'undo-snackbar';
    snackbar.innerHTML = '<span>New chat started</span><button class="undo-snackbar-btn" id="undo-new-chat-btn">Undo</button>';
    document.body.appendChild(snackbar);
    document.getElementById('undo-new-chat-btn').addEventListener('click', undoNewChat);
  }
  if (_undoSnackbarTimeout) clearTimeout(_undoSnackbarTimeout);
  requestAnimationFrame(() => snackbar.classList.add('show'));
  _undoSnackbarTimeout = setTimeout(() => {
    snackbar.classList.remove('show');
    _previousChatId = null;
    _previousHistory = null;
  }, 4000);
}

function undoNewChat() {
  if (!_previousChatId || !_previousHistory) return;
  currentChatId = _previousChatId;
  conversationHistory = _previousHistory;
  _previousChatId = null;
  _previousHistory = null;
  
  // Rebuild DOM
  chatMessages.innerHTML = '';
  if (heroSection) heroSection.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';
  conversationHistory.forEach((msg, idx) => {
    if (msg.role === 'assistant') {
      appendMessage('ai', msg.content || '', idx);
    } else {
      let htmlContent = typeof msg.content === 'string' ? escapeHtml(msg.content) : '[Attachment]';
      appendMessage('user', htmlContent, idx, true);
    }
  });
  scrollToBottom(true);
  
  const snackbar = document.getElementById('undo-snackbar');
  if (snackbar) snackbar.classList.remove('show');
  if (_undoSnackbarTimeout) clearTimeout(_undoSnackbarTimeout);
  showToast('Chat restored', 'success');
}

// ── UI Modal & Navigation ──
if (navNewChatBtn) {
  navNewChatBtn.addEventListener("click", () => {
    createNewChat();
  });
}

if (headerLogo) {
  headerLogo.addEventListener("click", () => {
    createNewChat();
    // In case drawer is open (though logo is on top), ensure it closes
    if (drawerToggle) drawerToggle.checked = false;
  });
}

function openHistoryModal() {
  loadHistoryIndex();
  historyModal.classList.remove("hidden");
  historyModal.classList.add("flex");
  // Trigger animation next frame
  setTimeout(() => {
    historyModal.classList.remove("opacity-0");
    // Mobile: slide up from bottom; Desktop: scale in
    historyModalContent.classList.remove("scale-95");
    historyModalContent.classList.remove("translate-y-full");
  }, 10);
  if (drawerToggle) drawerToggle.checked = false;
  // (#19) Focus trap
  trapFocus(historyModalContent);
  // (#22) ARIA
  historyModal.setAttribute('role', 'dialog');
  historyModal.setAttribute('aria-modal', 'true');
  historyModal.setAttribute('aria-label', 'Chat history');
  // Focus the search input
  const searchInput = document.getElementById('history-search-input');
  if (searchInput) setTimeout(() => searchInput.focus(), 100);
}

function closeHistoryModal() {
  historyModal.classList.add("opacity-0");
  // Mobile: slide back down; Desktop: scale out (no translate on desktop)
  if (window.innerWidth < 640) {
    historyModalContent.classList.add("translate-y-full");
  }
  historyModalContent.classList.add("scale-95");
  // (#19) Release focus trap
  releaseFocusTrap(historyModalContent);
  // Clear search
  const searchInput = document.getElementById('history-search-input');
  if (searchInput) searchInput.value = '';
  setTimeout(() => {
    historyModal.classList.add("hidden");
    historyModal.classList.remove("flex");
    // Reset translate for next open
    historyModalContent.classList.remove("translate-y-full");
  }, 300);
}

if (navHistoryBtn) navHistoryBtn.addEventListener("click", openHistoryModal);
if (closeHistoryBtn) closeHistoryBtn.addEventListener("click", closeHistoryModal);

// (#1) History Search
const historySearchInput = document.getElementById('history-search-input');
if (historySearchInput) {
  historySearchInput.addEventListener('input', () => {
    const query = historySearchInput.value.trim().toLowerCase();
    loadHistoryIndex(query);
  });
}



function loadHistoryIndex(searchQuery = '') {
  let index = getHistoryIndex();
  
  // (#1) Filter by search query
  if (searchQuery) {
    index = index.filter(chat => chat.title.toLowerCase().includes(searchQuery));
  }
  historyListContainer.innerHTML = "";
  
  if (index.length === 0) {
    historyListContainer.innerHTML = '<p class="text-on-surface-variant text-center my-8 text-sm">No recent chats.</p>';
    return;
  }

  // Group by time periods
  const now = Date.now();
  const dayMs = 86400000;
  const groups = {
    'Today': [],
    'Yesterday': [],
    'Last 7 Days': [],
    'Older': []
  };

  index.forEach(chat => {
    const age = now - chat.updatedAt;
    if (age < dayMs) groups['Today'].push(chat);
    else if (age < 2 * dayMs) groups['Yesterday'].push(chat);
    else if (age < 7 * dayMs) groups['Last 7 Days'].push(chat);
    else groups['Older'].push(chat);
  });

  Object.entries(groups).forEach(([label, chats]) => {
    if (chats.length === 0) return;

    const groupLabel = document.createElement('p');
    groupLabel.className = 'text-xs text-on-surface-variant/50 font-bold uppercase tracking-wider mt-3 mb-1.5 px-1';
    groupLabel.textContent = label;
    historyListContainer.appendChild(groupLabel);

    chats.forEach(chat => {
      const item = document.createElement("div");
      item.className = "history-item";
      const date = formatRelativeTime(chat.updatedAt);
      item.innerHTML = `
        <div class="flex-1 overflow-hidden" onclick="loadSession('${chat.id}')">
          <p class="text-on-surface font-bold text-sm truncate">${escapeHtml(chat.title)}</p>
          <p class="text-on-surface-variant text-xs">${date}</p>
        </div>
        <button onclick="event.stopPropagation(); deleteSession('${chat.id}')" class="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-white/5 transition-colors" aria-label="Delete chat">
          <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
        </button>
      `;
      historyListContainer.appendChild(item);
    });
  });
}

// ── Send Message ──
function sendMessage() {
  const text = chatInput.value.trim();
  if ((!text && attachedFiles.length === 0) || isStreaming) return;

  // Enforce character limit
  if (text.length > 4000) {
    showToast("Message is too long. Please keep it under 4000 characters.", "error");
    return;
  }

  if (heroSection) heroSection.style.display = "none";
  if (emptyState) emptyState.style.display = "none";

  let displayContent = escapeHtml(text);
  let backendPayload = text;

  // Handle multimodal Payload
  if (attachedFiles.length > 0) {
    const hasImage = attachedFiles.some(f => f.isImage);
    const hasAudio = attachedFiles.some(f => f.mimeType.startsWith("audio/"));
    const hasVideo = attachedFiles.some(f => f.mimeType.startsWith("video/"));
    const isMultimodal = hasImage || hasAudio || hasVideo;
    
    // Block image uploads for Aura 2 specifically as requested
    if (hasImage && currentModelName === "Aura 2") {
      appendMessage("ai", "⚠️ **This AI is not optimized for image analysis. Use Aura 1 or Aura Coder for vision.**");
      return;
    }

    // Render attachment previews for the user bubble
    let attachmentPreviews = [];
    for (const file of attachedFiles) {
      if (file.isImage) {
        attachmentPreviews.push(`<img src="${file.data}" alt="${escapeHtml(file.filename)}" style="max-height: 200px; border-radius: 8px; margin-top: 8px; border: 1px solid rgba(255,255,255,0.1);"/>`);
      } else if (file.mimeType.startsWith("audio/")) {
        attachmentPreviews.push(`<div style="display:flex;align-items:center;gap:8px;background:rgba(0,219,233,0.1);padding:8px;border-radius:8px;margin-top:8px;"><span class="material-symbols-outlined" style="color:#00dbe9;">audiotrack</span><span style="color:#dbfcff;font-size:0.8rem;">${escapeHtml(file.filename)}</span></div>`);
      } else if (file.mimeType.startsWith("video/")) {
        attachmentPreviews.push(`<div style="display:flex;align-items:center;gap:8px;background:rgba(220,184,255,0.1);padding:8px;border-radius:8px;margin-top:8px;"><span class="material-symbols-outlined" style="color:#dcb8ff;">movie</span><span style="color:#dbfcff;font-size:0.8rem;">${escapeHtml(file.filename)}</span></div>`);
      } else {
        attachmentPreviews.push(`<span style="color:#00dbe9;font-size:0.8rem; display: block;">📎 Attached: ${escapeHtml(file.filename)}</span>`);
      }
    }
    displayContent += `\n<br><div style="display:flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">${attachmentPreviews.join("")}</div>`;
    
    if (isMultimodal) {
      backendPayload = [
        { type: "text", text: text || "Please analyze the attached files." }
      ];
      
      for (const file of attachedFiles) {
        if (file.isImage) {
          backendPayload.push({ type: "image_url", image_url: { url: file.data } });
        } else if (file.mimeType.startsWith("audio/")) {
          backendPayload.push({ type: "audio_url", audio_url: { url: file.data } });
        } else if (file.mimeType.startsWith("video/")) {
          backendPayload.push({ type: "video_url", video_url: { url: file.data } });
        } else {
          backendPayload[0].text += `\n\nAttached file contents (${file.filename}):\n${file.data}`;
        }
      }
    } else {
      // Only text files attached
      let combinedFileContent = "";
      for (const file of attachedFiles) {
        combinedFileContent += `Attached file contents (${file.filename}):\n\n${file.data}\n\n`;
      }
      backendPayload = combinedFileContent + text;
    }
  }

  // Display user msg
  appendMessage("user", displayContent, -1, true);
  conversationHistory.push({ role: "user", content: backendPayload });
  saveSession();

  // Capture multimodal state BEFORE clearing attachedFiles
  const multimodalState = {
    hasImage: attachedFiles.some(f => f.isImage),
    hasAudio: attachedFiles.some(f => f.mimeType.startsWith("audio/")),
    hasVideo: attachedFiles.some(f => f.mimeType.startsWith("video/"))
  };

  // Reset input and attachments
  chatInput.value = "";
  chatInput.style.height = "auto";
  chatInput.dispatchEvent(new Event('input'));
  attachedFiles = [];
  if (fileInput) fileInput.value = "";
  renderAttachments();
  
  if (navigator.vibrate) navigator.vibrate(10);
  
  // Start AI response
  getAuraResponse(multimodalState);
}

// ── Stop Generation ──
function stopGeneration() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

if (stopBtn) {
  stopBtn.addEventListener("click", stopGeneration);
}

// ── Event Listeners ──
if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
}

if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
    // Animated send button — pulse when text is present
    animateSendButton();
  });
}

// ── Animated Send Button ──
function animateSendButton() {
  if (!sendBtn) return;
  const hasText = chatInput.value.trim().length > 0 || attachedFiles.length > 0;
  if (hasText) {
    sendBtn.style.background = "linear-gradient(135deg, #00dbe9, #7701d0)";
    sendBtn.style.boxShadow = "0 0 18px rgba(0,219,233,0.45)";
    sendBtn.style.transform = "scale(1.08)";
  } else {
    sendBtn.style.background = "";
    sendBtn.style.boxShadow = "";
    sendBtn.style.transform = "";
  }
}

// ── Category Chips Logic (empty state onboarding) ──
const categoryChipsContainer = document.getElementById('category-chips');
if (categoryChipsContainer) {
  categoryChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    const prompt = chip.dataset.prompt;
    if (prompt && chatInput) {
      chatInput.value = prompt;
      chatInput.dispatchEvent(new Event('input'));
      chatInput.focus();
      sendMessage();
    }
  });
}

function renderSuggestionChips() {
  if (!categoryChipsContainer) return;
  categoryChipsContainer.innerHTML = '';
  
  let chips = [];
  
  if (currentModelName === 'Aura Coder') {
    chips = [
      { icon: 'code_blocks', text: 'React', prompt: 'Write a modern React functional component with Tailwind styling', color: '#00dbe9' },
      { icon: 'bug_report', text: 'Debug', prompt: 'Help me debug a memory leak in my Node.js application', color: '#ffb4ab' },
      { icon: 'api', text: 'API', prompt: 'Design a RESTful API structure for an e-commerce platform', color: '#4caf50' },
      { icon: 'design_services', text: 'UI/UX', prompt: 'Write HTML and CSS for a sleek, responsive landing page', color: '#dcb8ff' },
      { icon: 'speed', text: 'Optimize', prompt: 'How can I optimize the performance of my JavaScript loops?', color: '#ff9800' },
      { icon: 'data_object', text: 'Algorithms', prompt: 'Explain how the QuickSort algorithm works with an example in Python', color: '#00bcd4' }
    ];
  } else if (currentModelName === 'Aura imagin') {
    chips = [
      { icon: 'lightbulb', text: 'Cyberpunk', prompt: 'A neon-lit cyberpunk city skyline at night in the rain, highly detailed', color: '#00dbe9' },
      { icon: 'brush', text: 'Abstract', prompt: 'An abstract painting with flowing vibrant colors and deep contrasts', color: '#e91e63' },
      { icon: 'nature', text: 'Fantasy', prompt: 'A mystical forest with glowing mushrooms and ancient ruins', color: '#4caf50' },
      { icon: 'person', text: 'Portrait', prompt: 'A hyper-realistic portrait of an astronaut looking at the stars', color: '#dcb8ff' },
      { icon: '3d_rotation', text: 'Isometric', prompt: 'A cute 3D isometric illustration of a cozy developer workspace', color: '#ff9800' },
      { icon: 'star', text: 'Logo', prompt: 'A minimalist vector logo of a futuristic AI company called Synapse', color: '#00bcd4' }
    ];
  } else {
    // Default / Aura 1 / Aura 2
    chips = [
      { icon: 'science', text: 'Science', prompt: 'Explain quantum physics in simple terms', color: '#00dbe9' },
      { icon: 'code', text: 'Code', prompt: 'Write a modern responsive landing page with HTML, CSS & JS', color: '#dcb8ff' },
      { icon: 'school', text: 'Study', prompt: 'Help me study for my math exam — quiz me on calculus', color: '#4caf50' },
      { icon: 'edit_note', text: 'Writing', prompt: 'Write a short creative story about a time traveler', color: '#ff9800' },
      { icon: 'calculate', text: 'Math', prompt: 'Solve this math problem step by step: integrate x^2 * e^x dx', color: '#e91e63' },
      { icon: 'forum', text: 'Debate', prompt: 'Debate: Is AI a threat to humanity? Take the opposing side', color: '#00bcd4' }
    ];
  }
  
  chips.forEach(chip => {
    const btn = document.createElement('button');
    btn.className = 'category-chip flex items-center gap-1.5 bg-surface-variant/20 hover:bg-white/5 border border-outline-variant/20 text-on-surface-variant text-xs px-3.5 py-2 rounded-full transition-all whitespace-nowrap active:scale-95';
    btn.dataset.prompt = chip.prompt;
    
    // Add hover color dynamically
    btn.onmouseover = () => {
      btn.style.borderColor = chip.color + '4D'; // 30% opacity
      btn.style.color = chip.color;
      btn.style.backgroundColor = chip.color + '1A'; // 10% opacity
    };
    btn.onmouseout = () => {
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.style.backgroundColor = '';
    };
    
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">${chip.icon}</span> ${chip.text}`;
    categoryChipsContainer.appendChild(btn);
  });
}

// Call on initial load
renderSuggestionChips();


// ── Orb State Management ──
function setOrbState(state) {
  const orb = document.getElementById('aura-state-orb');
  if (!orb) return;
  
  // Reset classes
  orb.classList.remove('orb-thinking', 'orb-responding', 'orb-error');
  
  switch (state) {
    case 'thinking':
      orb.classList.add('orb-thinking');
      break;
    case 'responding':
      orb.classList.add('orb-responding');
      break;
    case 'error':
      orb.classList.add('orb-error');
      setTimeout(() => orb.classList.remove('orb-error'), 1500);
      break;
    default: // 'idle'
      break;
  }
}

// ── Scroll-to-Bottom Button ──
const scrollToBottomBtn = document.getElementById("scroll-to-bottom-btn");

function updateScrollBtn() {
  if (!scrollToBottomBtn) return;
  const distFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
  // Compare distFromBottom; we use 200px threshold
  if (distFromBottom > 200) {
    scrollToBottomBtn.style.opacity = "1";
    scrollToBottomBtn.style.pointerEvents = "auto";
    scrollToBottomBtn.style.transform = "scale(1)";
  } else {
    scrollToBottomBtn.style.opacity = "0";
    scrollToBottomBtn.style.pointerEvents = "none";
    scrollToBottomBtn.style.transform = "scale(0.9)";
  }
}

// ── Scroll To Bottom ──
let userHasScrolledUp = false;
let lastScrollY = window.scrollY || 0;

window.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;
  const distFromBottom = document.documentElement.scrollHeight - currentScrollY - window.innerHeight;
  
  if (currentScrollY < lastScrollY) {
    if (distFromBottom > 200) {
      userHasScrolledUp = true;
    }
  } else if (distFromBottom <= 200) {
    userHasScrolledUp = false;
  }
  
  lastScrollY = currentScrollY;
  updateScrollBtn();
}, { passive: true });

if (scrollToBottomBtn) {
  scrollToBottomBtn.style.transition = "opacity 0.25s ease, transform 0.25s ease";
  scrollToBottomBtn.addEventListener("click", () => {
    userHasScrolledUp = false;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    updateScrollBtn();
  });
}

// ── Image Lightbox ──
window.closeLightbox = function(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const modal = document.getElementById("image-lightbox-modal");
  if (!modal) return;
  modal.style.opacity = "0";
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    const img = document.getElementById("lightbox-img");
    if (img) img.src = "";
  }, 250);
};

window.openLightbox = function(src) {
  const modal = document.getElementById("image-lightbox-modal");
  const img = document.getElementById("lightbox-img");
  if (!modal || !img) return;
  img.src = src;
  img.style.transform = "scale(0.9)";
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.style.opacity = "0";
  setTimeout(() => {
    modal.style.opacity = "1";
    modal.style.transition = "opacity 0.25s ease";
    img.style.transform = "scale(1)";
    img.style.transition = "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)";
  }, 10);
};

window.downloadLightboxImage = function() {
  const img = document.getElementById("lightbox-img");
  if (!img || !img.src) return;
  
  const a = document.createElement("a");
  a.href = img.src;
  a.download = `Aura_Image_${Date.now()}.jpg`; // Default filename
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// Close lightbox on Escape key — only if no higher z-index modal is open
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Priority: code preview (z:200) > lightbox (z:150) > history/settings (z:100)
    const codePreview = document.getElementById("code-preview-modal");
    if (codePreview && !codePreview.classList.contains("hidden")) {
      window.closeCodePreview();
      return;
    }
    
    const lightboxModal = document.getElementById("image-lightbox-modal");
    if (lightboxModal && !lightboxModal.classList.contains("hidden")) {
      closeLightbox();
      return;
    }
    
    const settingsM = document.getElementById("settings-modal");
    if (settingsM && !settingsM.classList.contains("hidden")) {
      closeSettings();
      return;
    }
    
    const historyM = document.getElementById("history-modal");
    if (historyM && !historyM.classList.contains("hidden")) {
      closeHistoryModal();
      return;
    }
    
    const deleteM = document.getElementById("delete-history-modal");
    if (deleteM && !deleteM.classList.contains("hidden")) {
      closeDeleteHistoryModal();
      return;
    }
  }
});

// ── Get AI Response (SSE Stream) ──
async function getAuraResponse(multimodalState = {}) {
  isStreaming = true;
  abortController = new AbortController();
  updateSendButton(true);
  setOrbState('thinking');

  const typingEl = showTypingIndicator(multimodalState);

  // Hoisted so they're accessible in catch block
  let bubbleEl = null;
  let fullContent = "";
  let fullReasoning = "";
  let reasoningEl = null;

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    const idToken = await user.getIdToken();

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ 
        messages: conversationHistory,
        model: currentModel,
        persona: currentModelName === "Aura 2" 
          ? "You are Aura 2. Explain any topic in exactly TWO paragraphs (2-3 lines each). You MUST format your response exactly like this:\\n\\n**English:**\\n[Your English paragraph here with an example]\\n\\n**Hinglish:**\\n[Your Hinglish paragraph here with an example]\\n\\nDo NOT use bullet points or numbered lists, write only in continuous paragraph format."
          : (currentModelName === "Aura Coder"
              ? "You are Aura Coder. You are a world-class web developer and coding expert. When asked for code or technical solutions, you MUST always provide the full, ready-to-run HTML/CSS/JS code (in a single file if possible) with a modern and professional UI. First, briefly explain the features and architecture of the code. Then, provide the full code in a single ```html code block. Never provide just snippets unless specifically requested."
              : (localStorage.getItem("system_persona") || null))
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    typingEl.remove();

    ({ bubbleEl } = appendMessage("ai", ""));

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const data = JSON.parse(jsonStr);

          if (data.error) {
            fullContent += `\n\n⚠️ ${data.error}`;
            const errAnswerEl = bubbleEl.querySelector(".answer-content");
            if (errAnswerEl) errAnswerEl.innerHTML = renderMarkdown(fullContent);
            break;
          }

          if (data.done) break;

          if (data.reasoning && currentModelName !== "Aura 2") {
            fullReasoning += data.reasoning;
            // Create or update the thinking block
            if (!reasoningEl) {
              reasoningEl = document.createElement("details");
              reasoningEl.className = "thinking-block";
              reasoningEl.innerHTML = `<summary><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;margin-right:4px;">psychology</span>Thinking...<span class="deep-think-timer" style="margin-left:auto;font-size:0.7rem;color:rgba(220,184,255,0.5);font-weight:500;"></span></summary><div class="deep-think-progress"></div><div class="thinking-content"></div>`;
              reasoningEl.open = true;
              bubbleEl.prepend(reasoningEl);
              // Start a timer to show elapsed time
              reasoningEl._startTime = Date.now();
              reasoningEl._timer = setInterval(() => {
                const elapsed = Math.round((Date.now() - reasoningEl._startTime) / 1000);
                const timerEl = reasoningEl.querySelector(".deep-think-timer");
                if (timerEl) timerEl.textContent = `${elapsed}s`;
              }, 1000);
            }
            reasoningEl.querySelector(".thinking-content").innerHTML = renderMarkdown(fullReasoning);
            scrollToBottom();
          }

          if (data.content) {
            fullContent += data.content;
            // When content starts, stop the reasoning progress bar but keep block OPEN
            if (reasoningEl) {
              const progressBar = reasoningEl.querySelector(".deep-think-progress");
              if (progressBar) progressBar.remove();
              // Update summary text to show it's done reasoning
              const summary = reasoningEl.querySelector("summary");
              if (summary && !reasoningEl._contentStarted) {
                reasoningEl._contentStarted = true;
                // Stop the timer
                if (reasoningEl._timer) { clearInterval(reasoningEl._timer); reasoningEl._timer = null; }
                const elapsed = Math.round((Date.now() - reasoningEl._startTime) / 1000);
                summary.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;margin-right:4px;">psychology</span>Thought for ${elapsed}s`;
              }
            }
            // Render content after the reasoning block
            let contentContainer = bubbleEl.querySelector(".answer-content");
            if (!contentContainer) {
              contentContainer = document.createElement("div");
              contentContainer.className = "answer-content";
              bubbleEl.appendChild(contentContainer);
            }
            contentContainer.innerHTML = renderMarkdown(fullContent, true) + '<span class="typing-cursor"></span>';
            setOrbState('responding');
            scrollToBottom();
          }
        } catch (parseErr) {
          // Skip malformed chunks
        }
      }
    }

    // Finalize: remove typing cursor, wire lightbox, append action bar
    // Now collapse reasoning block after stream is fully complete
    if (reasoningEl) {
      if (reasoningEl._timer) { clearInterval(reasoningEl._timer); reasoningEl._timer = null; }
      reasoningEl.open = false;
      const summary = reasoningEl.querySelector("summary");
      if (summary) {
        const elapsed = Math.round((Date.now() - (reasoningEl._startTime || Date.now())) / 1000);
        summary.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;margin-right:4px;">psychology</span>View reasoning (${elapsed}s)`;
      }
    }
    const answerEl = bubbleEl.querySelector(".answer-content");
    if (answerEl) {
      answerEl.innerHTML = renderMarkdown(fullContent);
      answerEl.querySelectorAll("img").forEach(img => {
        img.style.cursor = "zoom-in";
        img.onclick = () => openLightbox(img.src);
      });
    }
    if (bubbleEl) appendActionBar(bubbleEl, fullContent);

    conversationHistory.push({ role: "assistant", content: fullContent });
    saveSession();
    
    // (#2) Auto-rename the chat title after first AI response
    autoRenameChat(fullContent);
    
    // (#6) Apply syntax highlighting to code blocks
    if (window.hljs && bubbleEl) {
      bubbleEl.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });
    }
  } catch (err) {
    console.error("Chat error:", err);
    if (typingEl && typingEl.parentNode) typingEl.remove();
    
    // Don't show error for intentional abort
    if (err.name === "AbortError") {
      // User stopped generation — finalize whatever was streamed
      if (fullContent && fullContent.trim()) {
        const answerEl = bubbleEl?.querySelector(".answer-content");
        if (answerEl) answerEl.innerHTML = renderMarkdown(fullContent);
        if (bubbleEl) appendActionBar(bubbleEl, fullContent);
        conversationHistory.push({ role: "assistant", content: fullContent });
        saveSession();
      }
    } else {
      // Check if error was already partially handled in stream
      const lastAiBubble = chatMessages.querySelector(".message-row.ai:last-child .ai-bubble");
      if (!lastAiBubble || lastAiBubble.textContent === "") {
          appendMessage(
            "ai",
            "⚠️ I'm having trouble connecting right now. Please check your connection and try again."
          );
      }
      setOrbState('error');
    }
  } finally {
    isStreaming = false;
    abortController = null;
    updateSendButton(false);
    animateSendButton();
    scrollToBottom();
    updateScrollBtn();
    setOrbState('idle');
  }
}

// ── Append Action Bar to AI Bubble ──
function appendActionBar(bubbleEl, content) {
  if (!bubbleEl) return;
  // Remove any existing action bar
  const old = bubbleEl.querySelector(".ai-action-bar");
  if (old) old.remove();

  const bar = document.createElement("div");
  bar.className = "ai-action-bar";

  // Copy
  const copyBtn = document.createElement("button");
  copyBtn.className = "action-btn";
  copyBtn.title = "Copy response";
  copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(content).then(() => {
      copyBtn.innerHTML = '<span class="material-symbols-outlined">check</span>';
      copyBtn.style.color = "#4ade80";
      setTimeout(() => {
        copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
        copyBtn.style.color = "";
      }, 2000);
    });
  };

  // Thumbs Up
  const thumbUpBtn = document.createElement("button");
  thumbUpBtn.className = "action-btn";
  thumbUpBtn.title = "Good response";
  thumbUpBtn.innerHTML = '<span class="material-symbols-outlined">thumb_up</span>';
  thumbUpBtn.onclick = () => {
    thumbUpBtn.style.color = "#00dbe9";
    thumbDownBtn.style.color = "";
    thumbUpBtn.querySelector("span").style.fontVariationSettings = "'FILL' 1";
    thumbDownBtn.querySelector("span").style.fontVariationSettings = "'FILL' 0";
  };

  // Thumbs Down
  const thumbDownBtn = document.createElement("button");
  thumbDownBtn.className = "action-btn";
  thumbDownBtn.title = "Bad response";
  thumbDownBtn.innerHTML = '<span class="material-symbols-outlined">thumb_down</span>';
  thumbDownBtn.onclick = () => {
    thumbDownBtn.style.color = "#ffb4ab";
    thumbUpBtn.style.color = "";
    thumbDownBtn.querySelector("span").style.fontVariationSettings = "'FILL' 1";
    thumbUpBtn.querySelector("span").style.fontVariationSettings = "'FILL' 0";
  };

  // Retry
  const retryBtn = document.createElement("button");
  retryBtn.className = "action-btn";
  retryBtn.title = "Retry response";
  retryBtn.innerHTML = '<span class="material-symbols-outlined">refresh</span>';
  retryBtn.onclick = () => {
    if (isStreaming) return;
    // Pop the last assistant message from history
    if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === "assistant") {
      conversationHistory.pop();
    }
    // Remove last AI row from DOM
    const rows = Array.from(chatMessages.querySelectorAll(".message-row.ai"));
    if (rows.length > 0) rows[rows.length - 1].remove();
    getAuraResponse();
  };

  // (#8) Export button
  const exportBtn = document.createElement("button");
  exportBtn.className = "action-btn";
  exportBtn.title = "Export chat";
  exportBtn.innerHTML = '<span class="material-symbols-outlined">download</span>';
  exportBtn.onclick = () => exportCurrentChat();

  bar.appendChild(copyBtn);
  bar.appendChild(thumbUpBtn);
  bar.appendChild(thumbDownBtn);
  bar.appendChild(retryBtn);
  bar.appendChild(exportBtn);
  bubbleEl.appendChild(bar);
}

// ── Append Message to Chat ──
function appendMessage(role, content, explicitIndex = -1, isRawHtmlForUser = false) {
  // Use explicitIndex if provided (e.g. during loadSession), 
  // otherwise calculate based on current history length.
  const index = explicitIndex !== -1 ? explicitIndex : conversationHistory.length;
  
  const row = document.createElement("div");
  row.className = `message-row ${role}`;
  row.dataset.index = index;

  const avatar = document.createElement("div");
  avatar.className = `message-avatar ${role === "ai" ? "ai-avatar" : "user-avatar"}`;

  if (role === "ai") {
    avatar.innerHTML = "✦";
  } else {
    const user = auth.currentUser;
    if (user?.photoURL) {
      const avatarImg = document.createElement('img');
      avatarImg.src = user.photoURL;
      avatarImg.alt = 'You';
      avatar.innerHTML = '';
      avatar.appendChild(avatarImg);
    } else {
      const initial = (user?.displayName || user?.email || "U")[0].toUpperCase();
      avatar.textContent = initial;
    }
  }

  const bubble = document.createElement("div");
  bubble.className = role === "ai" ? "ai-bubble" : "user-bubble";
  
  // For user messages, wrap in a container to support edit button
  if (role === "user") {
    // Correctly handle either string content or multimodal content
    let textToDisplay = content;
    if (typeof content !== "string" && Array.isArray(content)) {
      const textItem = content.find(c => c.type === "text");
      textToDisplay = textItem ? textItem.text : "[Attachment]";
    }
    bubble.innerHTML = isRawHtmlForUser ? textToDisplay : escapeHtml(textToDisplay);
    
    // Add Edit Button
    const editBtn = document.createElement("button");
    editBtn.className = "edit-message-btn";
    editBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">edit</span>';
    editBtn.title = "Edit message";
    editBtn.onclick = () => openEditMode(row, index);
    row.appendChild(editBtn);
  } else {
    // Model badge removed per user request


    const contentDiv = document.createElement("div");
    contentDiv.className = "answer-content";
    contentDiv.innerHTML = renderMarkdown(content);
    // Wire up images for lightbox
    contentDiv.querySelectorAll("img").forEach(img => {
      img.style.cursor = "zoom-in";
      img.onclick = () => openLightbox(img.src);
    });
    bubble.appendChild(contentDiv);

    // Add action bar for completed (non-empty) AI messages (used during history load)
    if (content && content.trim()) {
      appendActionBar(bubble, content);
    }
  }

  row.appendChild(avatar);
  row.appendChild(bubble);

  // ── Message Timestamp ──
  const ts = document.createElement('div');
  ts.className = 'message-timestamp';
  ts.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  row.appendChild(ts);

  chatMessages.appendChild(row);
  // Force scroll for user messages; AI messages respect user's scroll position
  scrollToBottom(role === "user");
  updateScrollBtn();

  return { rowEl: row, bubbleEl: bubble };
}

// ── Typing Indicator (#16 — Skeleton Shimmer) ──
function showTypingIndicator(multimodalState = {}) {
  const row = document.createElement("div");
  row.className = "message-row ai";
  row.id = "typing-row";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar ai-avatar";
  avatar.innerHTML = "✦";

  // Smart typing text
  let typingText = "Aura is thinking";
  if (multimodalState.hasImage) {
    typingText = "Analyzing image";
  } else if (multimodalState.hasAudio) {
    typingText = "Listening to audio";
  } else if (multimodalState.hasVideo) {
    typingText = "Analyzing video";
  } else if (currentModelName === "Aura imagin") {
    typingText = "Generating image";
  } else if (currentModelName === "Aura 1" && aura1Mode === "deep_think") {
    typingText = "Reasoning deeply";
  }
  
  const typing = document.createElement("div");
  typing.className = "typing-indicator-skeleton";
  typing.innerHTML = `
    <div class="typing-label">
      <span class="skeleton-dot"></span>
      <span class="skeleton-dot"></span>
      <span class="skeleton-dot"></span>
      <span class="typing-label-text">${typingText}</span>
    </div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
  `;

  row.appendChild(avatar);
  row.appendChild(typing);
  chatMessages.appendChild(row);
  scrollToBottom();

  return row;
}

// ── Update Send Button State ──
function updateSendButton(streaming) {
  if (!sendBtn) return;
  if (streaming) {
    sendBtn.classList.add("hidden");
    if (stopBtn) stopBtn.classList.remove("hidden");
  } else {
    sendBtn.classList.remove("hidden");
    sendBtn.disabled = false;
    sendBtn.style.opacity = "1";
    if (stopBtn) stopBtn.classList.add("hidden");
    animateSendButton();
  }
}

function scrollToBottom(force = false) {
  if (force) userHasScrolledUp = false;
  // Only auto-scroll if user is near the bottom, or if forced (e.g. user sends a new message)
  if (!force && userHasScrolledUp) return;
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
  updateScrollBtn();
}

// ── Artifact Code Store (maps unique IDs to raw HTML strings) ──
const artifactStore = new Map();
let artifactCounter = 0;

// ── Simple Markdown Renderer ──
// NOTE: for user messages we might pass HTML strings intentionally if attachment is used, 
// so only escape if it's pure text. Escape logic is handled before calling this if needed.
function renderMarkdown(text, isStreaming = false) {
  if (!text) return "";

  // ── Step 1: Extract LaTeX blocks BEFORE escaping ──
  // We protect them from HTML escaping by replacing with placeholders
  const mathBlocks = [];
  let processed = text;

  // Block math: $$...$$ (can be multiline)
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    const idx = mathBlocks.length;
    mathBlocks.push({ math: math.trim(), display: true });
    return `%%MATH_BLOCK_${idx}%%`;
  });

  // Block math: \[...\] (can be multiline)
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    const idx = mathBlocks.length;
    mathBlocks.push({ math: math.trim(), display: true });
    return `%%MATH_BLOCK_${idx}%%`;
  });

  // Inline math: \(...\)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    const idx = mathBlocks.length;
    mathBlocks.push({ math: math.trim(), display: false });
    return `%%MATH_BLOCK_${idx}%%`;
  });

  // Inline math: $...$ (single dollar, not greedy, avoid matching $$)
  processed = processed.replace(/(?<!\$)\$(?!\$)([^\n$]+?)\$(?!\$)/g, (_, math) => {
    const idx = mathBlocks.length;
    mathBlocks.push({ math: math.trim(), display: false });
    return `%%MATH_BLOCK_${idx}%%`;
  });

  // ── Step 1b: Extract CODE BLOCKS before escaping ──
  const codeBlocks = [];
  processed = processed.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang || "", code: code.trimEnd() });
    return `%%CODE_BLOCK_${idx}%%`;
  });

  // ── Step 1c: Handle INCOMPLETE code blocks (still streaming) ──
  // Only check during streaming — match a trailing ``` that was NOT consumed by the complete regex
  // Anchored to line start (^) to avoid false positives from inline backticks
  if (isStreaming) {
    processed = processed.replace(/^```(\w*)(?:\n[\s\S]*)?$/gm, (match, lang) => {
      const langLabel = lang || "code";
      const isHtml = langLabel.toLowerCase() === "html";
      if (isHtml) {
        return `%%WRITING_ARTIFACT%%`;
      }
      return `%%WRITING_CODE_${langLabel}%%`;
    });
  }

  // ── Step 2: Normal markdown rendering ──
  let html = escapeHtml(processed);

  // Replace writing indicators
  html = html.replace(/%%WRITING_ARTIFACT%%/g, `
    <div class="artifact-card" style="background:rgba(0,219,233,0.05); border:1px solid rgba(0,219,233,0.2); border-radius:12px; padding:16px; margin:12px 0; display:flex; align-items:center; gap:12px;">
      <div style="width:40px; height:40px; background:rgba(0,219,233,0.15); border-radius:8px; display:flex; align-items:center; justify-content:center;">
        <span class="material-symbols-outlined" style="color:#00dbe9; font-size:22px; animation: spin 2s linear infinite;">progress_activity</span>
      </div>
      <div>
        <h4 style="margin:0; color:#dbfcff; font-size:15px; font-weight:600;">Building Web App...</h4>
        <p style="margin:0; color:rgba(185,202,203,0.7); font-size:12px;">Writing HTML / CSS / JS</p>
      </div>
    </div>
  `);
  html = html.replace(/%%WRITING_CODE_(\w+)%%/g, (_, lang) => `
    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:14px 16px; margin:12px 0; display:flex; align-items:center; gap:12px;">
      <span class="material-symbols-outlined" style="color:#dcb8ff; font-size:20px; animation: spin 2s linear infinite;">progress_activity</span>
      <span style="color:rgba(185,202,203,0.7); font-size:13px;">Writing ${lang} code...</span>
    </div>
  `);

  // Restore code blocks from placeholders
  html = html.replace(/%%CODE_BLOCK_(\d+)%%/g, (_, idx) => {
    const block = codeBlocks[parseInt(idx)];
    if (!block) return "";
    const langLabel = block.lang || "code";
    const isHtml = langLabel.toLowerCase() === "html";
    const escapedCodeForDisplay = escapeHtml(block.code);

    if (isHtml) {
      // Only store in artifact map during final render (not streaming)
      if (!isStreaming) {
        const artifactId = 'artifact_' + (artifactCounter++);
        artifactStore.set(artifactId, block.code);
        // Also save to IndexedDB for cross-session persistence
        saveToDB("artifacts", artifactId, block.code);
        return `
          <div class="artifact-card" data-artifact-id="${artifactId}" style="background:rgba(0,219,233,0.05); border:1px solid rgba(0,219,233,0.2); border-radius:12px; padding:16px; margin:12px 0; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; background:rgba(0,219,233,0.15); border-radius:8px; display:flex; align-items:center; justify-content:center;">
              <span class="material-symbols-outlined" style="color:#00dbe9; font-size:22px;">web</span>
            </div>
            <div>
              <h4 style="margin:0; color:#dbfcff; font-size:15px; font-weight:600;">Interactive Web App</h4>
              <p style="margin:0; color:rgba(185,202,203,0.7); font-size:12px;">HTML / CSS / JS</p>
            </div>
          </div>
          <button onclick="previewCode(this)" class="glass-btn-heavy" style="background:linear-gradient(135deg, #00dbe9, #006970); color:#002022; border:none; padding:8px 16px; border-radius:20px; font-weight:700; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px; transition:transform 0.15s, box-shadow 0.25s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 15px rgba(0,219,233,0.25)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
            <span class="material-symbols-outlined" style="font-size:18px;">play_arrow</span> Open Preview
          </button>
        </div>
      `;
      } else {
        // During streaming, show a completed-but-non-interactive card
        return `
          <div class="artifact-card" style="background:rgba(0,219,233,0.05); border:1px solid rgba(0,219,233,0.2); border-radius:12px; padding:16px; margin:12px 0; display:flex; align-items:center; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:40px; height:40px; background:rgba(0,219,233,0.15); border-radius:8px; display:flex; align-items:center; justify-content:center;">
                <span class="material-symbols-outlined" style="color:#00dbe9; font-size:22px;">check_circle</span>
              </div>
              <div>
                <h4 style="margin:0; color:#dbfcff; font-size:15px; font-weight:600;">Web App Ready</h4>
                <p style="margin:0; color:rgba(185,202,203,0.7); font-size:12px;">Preview available when generation completes</p>
              </div>
            </div>
          </div>
        `;
      }
    }

    // Standard code block for other languages — (#6) use hljs class
    return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang-label">${langLabel}</span><div style="display:flex;"><button class="copy-code-btn" onclick="copyCode(this)"><span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Copy</button></div></div><pre><code class="hljs language-${block.lang}">${escapedCodeForDisplay}</code></pre></div>`;
  });

  // (#5) Markdown Table Rendering
  html = html.replace(/((?:^\|.+\|\s*(?:<br>|\n))+)/gm, (tableBlock) => {
    const rows = tableBlock.split(/<br>|\n/).filter(r => r.trim());
    if (rows.length < 2) return tableBlock;
    
    // Separate header, separator, and data rows
    const headerRow = rows[0];
    const dataRows = rows.filter((row, i) => i > 0 && !/^\|[\s\-:|]+\|$/.test(row.trim()));
    
    const parseRow = (row) => row.split('|').filter((c, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
    
    let tableHtml = '<table><thead><tr>';
    parseRow(headerRow).forEach(cell => { tableHtml += `<th>${cell}</th>`; });
    tableHtml += '</tr></thead><tbody>';
    dataRows.forEach(row => {
      tableHtml += '<tr>';
      parseRow(row).forEach(cell => { tableHtml += `<td>${cell}</td>`; });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';
    return tableHtml;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^[\s]*[-*]\s+(.+)$/gm, "<li class=\"ul-item\">$1</li>");
  html = html.replace(/^[\s]*\d+\.\s+(.+)$/gm, "<li class=\"ol-item\">$1</li>");
  // Wrap adjacent ul-items in <ul> and ol-items in <ol>
  html = html.replace(/((?:<li class="ul-item">.*<\/li>\n?)+)/g, (match) => {
    return "<ul>" + match.replace(/ class="ul-item"/g, "") + "</ul>";
  });
  html = html.replace(/((?:<li class="ol-item">.*<\/li>\n?)+)/g, (match) => {
    return "<ol>" + match.replace(/ class="ol-item"/g, "") + "</ol>";
  });
  html = html.replace(/^### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^## (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>");
  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr>");
  // Blockquotes
  html = html.replace(/^&gt;\s?(.+)$/gm, "<blockquote>$1</blockquote>");
  // Images (must come before links so ![alt](url) isn't consumed by [alt](url))
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-2 shadow-lg border border-outline-variant/30" />');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Paragraphs and Newlines
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br>");
  html = `<p>${html}</p>`;
  html = html.replace(/<p>\s*<\/p>/g, "");

  // ── Step 3: Render LaTeX placeholders with KaTeX ──
  html = html.replace(/%%MATH_BLOCK_(\d+)%%/g, (_, idx) => {
    const block = mathBlocks[parseInt(idx)];
    if (!block) return "";
    try {
      if (typeof katex !== "undefined") {
        return katex.renderToString(block.math, {
          displayMode: block.display,
          throwOnError: false,
          output: "html",
        });
      }
      // KaTeX not loaded yet — fallback to styled raw LaTeX
      return block.display
        ? `<div class="math-fallback">${block.math}</div>`
        : `<span class="math-fallback">${block.math}</span>`;
    } catch (e) {
      return `<code class="math-error">${block.math}</code>`;
    }
  });

  return html;
}

function escapeHtml(text) {
  if (typeof text !== "string") return String(text ?? "");
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ── Copy Code to Clipboard ──
function copyCode(btn) {
  const wrapper = btn.closest(".code-block-wrapper");
  const codeEl = wrapper.querySelector("code");
  if (!codeEl) return;
  
  const text = codeEl.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add("copied");
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">check</span> Copied!`;
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Copy`;
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.cssText = "position:fixed;opacity:0;";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    btn.classList.add("copied");
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">check</span> Copied!`;
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Copy`;
    }, 2000);
  });
}
window.copyCode = copyCode;

// ── Relative Time Formatter ──
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Mobile Virtual Keyboard Handling ──
if (window.visualViewport) {
  const chatFooter = document.getElementById("chat-footer");
  const footerGradient = document.querySelector(".footer-gradient");
  
  window.visualViewport.addEventListener("resize", () => {
    if (!chatFooter) return;
    const offsetBottom = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;
    if (offsetBottom > 50) {
      // Keyboard is open
      chatFooter.style.bottom = offsetBottom + "px";
      if (footerGradient) footerGradient.style.bottom = offsetBottom + "px";
    } else {
      chatFooter.style.bottom = "0px";
      if (footerGradient) footerGradient.style.bottom = "0px";
    }
  });
}

// ── Conversation Branching (Edit Logic) ──
function openEditMode(rowEl, index) {
  const bubble = rowEl.querySelector(".user-bubble");
  if (!bubble || bubble.querySelector(".edit-textarea")) return;

  // Get current text from history
  let currentContent = conversationHistory[index]?.content;
  let textToEdit = "";
  
  if (typeof currentContent === "string") {
    textToEdit = currentContent;
  } else if (Array.isArray(currentContent)) {
    textToEdit = currentContent.find(c => c.type === "text")?.text || "";
  }

  // Preserve original HTML for cancel
  const originalHTML = bubble.innerHTML;

  // Build edit UI safely to prevent XSS from user content
  bubble.innerHTML = `
    <textarea class="edit-textarea"></textarea>
    <div class="edit-actions">
      <button class="edit-btn cancel">Cancel</button>
      <button class="edit-btn save">Save & Resubmit</button>
    </div>
  `;

  const textarea = bubble.querySelector(".edit-textarea");
  // Set value programmatically — prevents XSS from </textarea> injection
  textarea.value = textToEdit;
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  bubble.querySelector(".cancel").onclick = () => {
    bubble.innerHTML = originalHTML;
  };

  bubble.querySelector(".save").onclick = () => {
    const newText = textarea.value.trim();
    if (newText) {
      submitEdit(index, newText);
    } else {
      bubble.innerHTML = originalHTML;
    }
  };
}

async function submitEdit(index, newText) {
  // If we are currently streaming, stop it
  if (isStreaming && abortController) {
    abortController.abort();
  }

  // Double check index bounds
  if (index < 0 || index >= conversationHistory.length) {
    console.error("[Edit Logic] Index out of bounds:", index);
    return;
  }

  // 1. Truncate History
  conversationHistory = conversationHistory.slice(0, index + 1);
  
  // 2. Update the edited message
  const msg = conversationHistory[index];
  if (!msg) return;

  if (typeof msg.content === "string") {
    msg.content = newText;
  } else if (Array.isArray(msg.content)) {
    const textPart = msg.content.find(c => c.type === "text");
    if (textPart) textPart.text = newText;
  }

  // 3. Clear DOM after this message
  const rows = Array.from(chatMessages.querySelectorAll(".message-row"));
  rows.forEach(row => {
    const rowIndex = parseInt(row.dataset.index);
    if (rowIndex > index) {
      row.remove();
    }
  });

  // 4. Update the edited bubble UI
  const editedRow = chatMessages.querySelector(`.message-row[data-index="${index}"]`);
  if (editedRow) {
    const bubble = editedRow.querySelector(".user-bubble");
    bubble.innerHTML = escapeHtml(newText);
  }

  // 5. Trigger new response
  saveSession();
  getAuraResponse();
}

// ── Auto-focus Input ──
document.addEventListener("DOMContentLoaded", () => {
  // Only auto-focus on desktop (mobile would open keyboard)
  if (chatInput && window.innerWidth > 768) {
    setTimeout(() => chatInput.focus(), 500);
  }

  // ── Page Transition Fade-in ──
  const overlay = document.getElementById('page-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
  }

  // ── Draft Input Persistence ──
  const draftKey = 'synapse_draft_input';
  const savedDraft = localStorage.getItem(draftKey);
  if (savedDraft && chatInput) {
    chatInput.value = savedDraft;
    chatInput.dispatchEvent(new Event('input'));
    chatInput.classList.add('has-draft');
  }

  if (chatInput) {
    const charCounter = document.getElementById('char-counter');
    chatInput.addEventListener('input', () => {
      const val = chatInput.value;
      
      // Update character counter
      if (charCounter) {
        charCounter.textContent = `${val.length} / 4000`;
        if (val.length >= 4000) charCounter.style.color = '#ffb4ab';
        else charCounter.style.color = '';
      }

      // Handle draft persistence
      if (val.trim()) {
        localStorage.setItem(draftKey, val);
        chatInput.classList.add('has-draft');
      } else {
        localStorage.removeItem(draftKey);
        chatInput.classList.remove('has-draft');
      }
    });
  }


  // ── Swipe to Dismiss Drawer (Mobile) ──
  const drawerEl = document.getElementById('drawer');
  const drawerToggleEl = document.getElementById('drawer-toggle');
  if (drawerEl && drawerToggleEl) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    drawerEl.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      currentX = startX;
      isDragging = true;
    }, { passive: true });

    drawerEl.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      if (diff < 0) {
        // Dragging left — slide drawer out
        drawerEl.style.transform = `translateX(${Math.max(diff, -280)}px)`;
        drawerEl.style.transition = 'none';
      }
    }, { passive: true });

    drawerEl.addEventListener('touchend', () => {
      isDragging = false;
      drawerEl.style.transition = '';
      const diff = currentX - startX;
      if (diff < -80) {
        // Enough swipe to close
        drawerToggleEl.checked = false;
        drawerEl.style.transform = '';
      } else {
        drawerEl.style.transform = '';
      }
    });
  }

  // ── Keyboard Shortcuts ──
  document.addEventListener('keydown', (e) => {
    // Ctrl+K or Cmd+K to open/close history drawer
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (drawerToggleEl) {
        drawerToggleEl.checked = !drawerToggleEl.checked;
      }
    }
  });

  // ── Model Accent Colors in selector button ──
  updateModelAccentColor();
  updateActiveModelIndicator(currentModelName);
  
  // ── Header Scroll Shadow ──
  const headerEl = document.querySelector('header');
  if (headerEl) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        headerEl.classList.add('scrolled');
      } else {
        headerEl.classList.remove('scrolled');
      }
    }, { passive: true });
  }
  // (#6) Highlight existing code blocks on page load
  if (window.hljs) {
    document.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }
});

// (#8) Export Chat as Markdown
function exportCurrentChat() {
  if (conversationHistory.length === 0) {
    showToast('No conversation to export', 'error');
    return;
  }
  
  let md = `# Synapse AI — Chat Export\n`;
  md += `**Model:** ${currentModelName}\n`;
  md += `**Date:** ${new Date().toLocaleDateString()}\n\n---\n\n`;
  
  conversationHistory.forEach(msg => {
    const role = msg.role === 'assistant' ? '🤖 **Aura**' : '👤 **You**';
    let content = '';
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      const textItem = msg.content.find(c => c.type === 'text');
      content = textItem ? textItem.text : '[Attachment]';
    }
    md += `${role}\n\n${content}\n\n---\n\n`;
  });
  
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  // Use chat title for filename
  const index = getHistoryIndex();
  const entry = index.find(c => c.id === currentChatId);
  const title = (entry?.title || 'chat').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  a.download = `synapse_${title}_${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('Chat exported as Markdown', 'success');
}
window.exportCurrentChat = exportCurrentChat;

// (#10) Model Warning when loading old chat with different model
function showModelWarning(originalModel) {
  if (!originalModel || originalModel === currentModelName) return;
  
  // Remove existing warning
  const existing = document.querySelector('.model-warning-banner');
  if (existing) existing.remove();
  
  const banner = document.createElement('div');
  banner.className = 'model-warning-banner';
  banner.innerHTML = `
    <span class="material-symbols-outlined">info</span>
    <span class="warning-text">This chat was with <strong class="warning-model-name"></strong></span>
    <button class="switch-back-btn">Switch back</button>
    <button class="close-banner-btn" style="background:none;border:none;color:rgba(255,200,100,0.5);padding:2px;cursor:pointer;"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button>
  `;

  banner.querySelector('.warning-model-name').textContent = originalModel;

  const switchBackBtn = banner.querySelector('.switch-back-btn');
  switchBackBtn.dataset.model = originalModel;
  switchBackBtn.addEventListener('click', function() {
    switchToModel(this.dataset.model);
    banner.remove();
  });

  const closeBannerBtn = banner.querySelector('.close-banner-btn');
  closeBannerBtn.addEventListener('click', function() {
    banner.remove();
  });

  chatMessages.insertBefore(banner, chatMessages.firstChild);
}

window.switchToModel = function(modelName) {
  const option = Array.from(modelOptions).find(o => o.getAttribute('data-name') === modelName);
  if (option) option.click();
};

// (#29) PWA Install Prompt
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showPWAInstallBanner();
});

function showPWAInstallBanner() {
  if (localStorage.getItem('pwa_dismissed')) return;
  
  const drawerNav = document.querySelector('#drawer nav');
  if (!drawerNav) return;
  
  // Don't add duplicate
  if (document.querySelector('.pwa-install-banner')) return;
  
  const banner = document.createElement('div');
  banner.className = 'pwa-install-banner';
  banner.innerHTML = `
    <div class="pwa-icon">
      <span class="material-symbols-outlined" style="color:#fff;font-size:18px;font-variation-settings:'FILL' 1;">install_mobile</span>
    </div>
    <div class="pwa-text">
      <div class="pwa-title">Install Synapse AI</div>
      <div class="pwa-desc">Add to home screen for quick access</div>
    </div>
    <button class="pwa-close" onclick="event.stopPropagation(); this.closest('.pwa-install-banner').remove(); localStorage.setItem('pwa_dismissed','1');">
      <span class="material-symbols-outlined" style="font-size:16px;">close</span>
    </button>
  `;
  banner.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    if (result.outcome === 'accepted') {
      showToast('Synapse AI installed!', 'success');
    }
    deferredInstallPrompt = null;
    banner.remove();
  });
  
  // Insert before the divider in drawer nav
  const divider = drawerNav.querySelector('.h-px');
  if (divider) drawerNav.insertBefore(banner, divider);
  else drawerNav.appendChild(banner);
}

// ============================================
// (#19) Focus Trap Utility
// ============================================
const _focusTrapHandlers = new WeakMap();

function trapFocus(container) {
  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  
  function handler(e) {
    if (e.key !== 'Tab') return;
    
    const focusables = [...container.querySelectorAll(focusableSelector)].filter(el => el.offsetParent !== null);
    if (focusables.length === 0) return;
    
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    
    if (e.shiftKey) {
      if (document.activeElement === first || !container.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  
  _focusTrapHandlers.set(container, handler);
  document.addEventListener('keydown', handler);
}

function releaseFocusTrap(container) {
  const handler = _focusTrapHandlers.get(container);
  if (handler) {
    document.removeEventListener('keydown', handler);
    _focusTrapHandlers.delete(container);
  }
}

// ============================================
// (#22) ARIA Improvements — applied once on load
// ============================================
(function applyAriaLabels() {
  // Typing indicator area
  const chatMsgs = document.getElementById('chat-messages');
  if (chatMsgs) chatMsgs.setAttribute('aria-live', 'polite');
  
  // Model dropdown
  const modelDropdown = document.getElementById('model-dropdown');
  if (modelDropdown) {
    modelDropdown.setAttribute('role', 'listbox');
    modelDropdown.setAttribute('aria-label', 'AI model selection');
    modelDropdown.querySelectorAll('.model-option').forEach(opt => {
      opt.setAttribute('role', 'option');
    });
  }
  
  // Personality cards
  document.querySelectorAll('.personality-card').forEach(card => {
    card.setAttribute('role', 'button');
    const nameEl = card.querySelector('.personality-name');
    if (nameEl) card.setAttribute('aria-label', `Set personality to ${nameEl.textContent}`);
  });
  
  // Chat input
  const chatInputEl = document.getElementById('chat-input');
  if (chatInputEl) chatInputEl.setAttribute('aria-label', 'Message input');
  
  // Send button
  const sendBtnEl = document.getElementById('send-btn');
  if (sendBtnEl) sendBtnEl.setAttribute('aria-label', 'Send message');
})();

// ── Toast Notification System ──
let toastTimeout = null;
function showToast(message, type = 'default', duration = 2500) {
  let toast = document.getElementById('synapse-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'synapse-toast';
    toast.className = 'synapse-toast';
    document.body.appendChild(toast);
  }
  if (toastTimeout) clearTimeout(toastTimeout);
  
  // Build toast content with icon
  let iconHtml = '';
  if (type === 'success') {
    iconHtml = '<span class="material-symbols-outlined toast-icon" style="font-variation-settings:\'FILL\' 1;">check_circle</span>';
  } else if (type === 'error') {
    iconHtml = '<span class="material-symbols-outlined toast-icon" style="font-variation-settings:\'FILL\' 1;">error</span>';
  }
  
  toast.innerHTML = iconHtml + `<span>${message}</span>`;
  toast.className = `synapse-toast ${type}`;
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}
window.showToast = showToast;

// ── Model Accent Color Helper ──
function updateModelAccentColor() {
  const el = document.getElementById('current-model-name');
  if (!el) return;
  const name = currentModelName;
  if (name === 'Aura 1') { el.style.color = '#00dbe9'; }
  else if (name === 'Aura 2') { el.style.color = '#4caf50'; }
  else if (name === 'Aura Coder') { el.style.color = '#dcb8ff'; }
  else if (name === 'Aura imagin') { el.style.color = '#ff9800'; }
  else { el.style.color = ''; }
}

// ── One-Time Personality Intro Popup ──
// NOTE: Merged into the main onAuthStateChanged listener would be ideal,
// but to minimize diff risk we guard against the redirect race by checking
// that we're actually on the chat page before opening the modal.
(function initPersonalityIntro() {
  // Use a one-shot listener that piggybacks on the existing auth state
  const unsubPersonality = auth.onAuthStateChanged((user) => {
    if (!user) return;
    // Only show on chat page to avoid race with auth redirect
    if (!window.location.pathname.includes('chat')) return;
    const seenKey = `personality_intro_seen_${user.uid}`;
    if (!localStorage.getItem(seenKey)) {
      setTimeout(() => {
        openPersonalityModal();
        localStorage.setItem(seenKey, "true");
      }, 1500);
    }
    // Unsubscribe after first fire — no need to keep listening
    unsubPersonality();
  });
})();

// ── Code Preview (Artifact) Logic ──
window.previewCode = async function(btn) {
  // Find the artifact card associated with this button
  const wrapper = btn.closest(".artifact-card");
  if (!wrapper) return;
  
  // Get the raw HTML from the in-memory store
  const artifactId = wrapper.getAttribute("data-artifact-id");
  if (!artifactId) return;
  
  let rawCode = artifactStore.get(artifactId);
  
  // Fallback to IndexedDB if not in memory (e.g. after page reload)
  if (!rawCode) {
    rawCode = await getFromDB("artifacts", artifactId);
  }
  
  if (!rawCode) { showToast("Code not available. Please regenerate.", "error"); return; }

  // Get modal elements
  const modal = document.getElementById("code-preview-modal");
  const modalContent = document.getElementById("code-preview-content");
  const iframe = document.getElementById("code-preview-iframe");
  
  // Store raw code globally so the download button can access it
  window.currentPreviewCode = rawCode;

  if (!modal || !iframe) return;

  // Inject code via Blob URL (more reliable than srcdoc on mobile)
  const blob = new Blob([rawCode], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  iframe.removeAttribute("srcdoc");
  iframe.src = blobUrl;
  // Store for cleanup
  iframe._blobUrl = blobUrl;

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  
  // Trigger animation
  requestAnimationFrame(() => {
    modal.classList.remove("opacity-0");
    if (modalContent) modalContent.classList.remove("scale-95");
  });
};

window.closeCodePreview = function() {
  const modal = document.getElementById("code-preview-modal");
  const modalContent = document.getElementById("code-preview-content");
  const iframe = document.getElementById("code-preview-iframe");
  
  if (!modal) return;

  // Animate out
  modal.classList.add("opacity-0");
  if (modalContent) modalContent.classList.add("scale-95");

  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    if (iframe) {
      // Revoke old blob URL to free memory
      if (iframe._blobUrl) {
        URL.revokeObjectURL(iframe._blobUrl);
        iframe._blobUrl = null;
      }
      iframe.src = "about:blank";
    }
  }, 300);
};

// Close preview modal on escape key is now handled by the unified Escape handler above

// ── Download Artifact ──
window.downloadCodePreview = function() {
  if (!window.currentPreviewCode) {
    showToast("No code available to download.", "error");
    return;
  }
  
  const blob = new Blob([window.currentPreviewCode], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `synapse_artifact_${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast("Code downloaded successfully!", "success");
};

// ── Web Speech API (Voice Input) ──
const micBtn = document.getElementById("mic-btn");
if (micBtn) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    let isRecording = false;

    recognition.onstart = () => {
      isRecording = true;
      micBtn.classList.add("recording");
      chatInput.placeholder = "Listening...";
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        const currentVal = chatInput.value;
        chatInput.value = currentVal ? currentVal + " " + finalTranscript : finalTranscript;
        // Adjust height if necessary
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      isRecording = false;
      micBtn.classList.remove("recording");
      chatInput.placeholder = "Ask Aura";
      if (event.error !== 'no-speech') {
        let errorMsg = "Microphone error: " + event.error;
        if (event.error === 'not-allowed') {
          errorMsg = "Please allow microphone access in your browser settings.";
        } else if (event.error === 'network') {
          errorMsg = "Voice input requires an active internet connection.";
        } else if (event.error === 'audio-capture') {
          errorMsg = "No microphone found. Please check your hardware.";
        }
        showToast(errorMsg, "error");
      }
    };

    recognition.onend = () => {
      isRecording = false;
      micBtn.classList.remove("recording");
      chatInput.placeholder = "Ask Aura";
    };

    micBtn.addEventListener("click", () => {
      if (isRecording) {
        recognition.stop();
      } else {
        try {
          recognition.start();
        } catch(e) {
          console.error(e);
        }
      }
    });
  } else {
    micBtn.addEventListener("click", () => {
      showToast("Voice input is not supported in this browser.", "error");
    });
  }
}
