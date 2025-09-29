/* assets/js/note_edit.js
   - Kayıt/Sil/Undo akışı korunur.
   - Eklentiler:
     • Sürüklenebilir yuvarlak FAB: #btnFabToolbar
     • FAB'a tıklayınca açılıp kapanan mini toolbar: #floatingToolbar
     • Aktif komut ikon durumları (bold/italic/underline, hizalama, listeler vb.)
     • Renk paleti, link ekleme vb. eskisi gibi
*/

(function () {
  "use strict";

  // ---------- DOM ----------
  const titleInput = document.getElementById("noteTitle");
  const editor = document.getElementById("editor");
  const metaTimes = document.getElementById("metaTimes");

  const btnSave = document.getElementById("btnSave");
  const btnDelete = document.getElementById("btnDelete");

  // Yeni: sürüklenebilir fab ve yüzen toolbar
  const toolbar = document.getElementById("floatingToolbar");
  const btnFabToolbar = document.getElementById("btnFabToolbar");

  // (Varsa) toolbar içindeki özel butonlar
  const btnInsertLink = document.getElementById("btnInsertLink");
  const btnColorReset = document.getElementById("btnColorReset");

  // Delete modal & toast
  const deleteModalEl = document.getElementById("deleteNoteModal");
  const btnDeleteConfirm = document.getElementById("btnDeleteConfirm");
  const undoToastEl = document.getElementById("undoToast");
  const btnUndoDelete = document.getElementById("btnUndoDelete");

  let deleteModal = null;
  let undoToast = null;

  // ---------- State ----------
  const params = new URLSearchParams(location.search);
  let currentId = params.get("id") || null;

  let original = { title: "", html: "" }; // karşılaştırma için
  let dirty = false; // kaydedilmemiş değişiklik var mı?

  // FAB/toolbar state
  let toolbarOpen = false;
  let fabDrag = { dragging: false, startX: 0, startY: 0, left: 0, top: 0 };

  // ---------- Helpers ----------
  function ensureModalToast() {
    if (deleteModalEl && !deleteModal) deleteModal = new bootstrap.Modal(deleteModalEl);
    if (undoToastEl && !undoToast) undoToast = new bootstrap.Toast(undoToastEl, { delay: 8000 });
  }

  function setDirtyFlag() {
    dirty =
      (titleInput?.value || "") !== (original.title || "") ||
      (getHTML(editor) || "") !== (original.html || "");
  }

  function getHTML(el) {
    if (!el) return "";
    const html = (el.innerHTML || "").trim();
    if (!html || html === "<br>") return "";
    return html;
  }

  function setHTML(el, html) {
    if (!el) return;
    el.innerHTML = html || "";
  }

  function fmtMetaTimes(n) {
    if (!metaTimes) return;
    if (!n) { metaTimes.textContent = "—"; return; }
    const created = UtilsNotes?.fmtDateTimeHuman?.(n.created) || "";
    const updated = UtilsNotes?.fmtDateTimeHuman?.(n.updated) || "";
    metaTimes.textContent = created && updated ? `Oluşturma: ${created} • Güncelleme: ${updated}` : "—";
  }

  function goBackToList() {
    location.href = "notes.html";
  }

  // execCommand sarmalayıcı (deprecated ama iş görüyor)
  function runCmd(cmd, value = null) {
    try {
      document.execCommand(cmd, false, value);
      editor?.focus();
      // Komut sonrası ikon durumlarını güncelle
      updateActiveStates();
    } catch (_) {}
  }

  // Blok biçimlendirme: H1/H2/P/blockquote
  function setBlock(tag) {
    const t = (tag || "P").toUpperCase();
    try {
      if (t === "BLOCKQUOTE") {
        document.execCommand("formatBlock", false, "BLOCKQUOTE");
      } else {
        document.execCommand("formatBlock", false, t);
      }
    } catch (_) {}
    editor?.focus();
    updateActiveStates();
  }

  // Link insert
  function insertLink() {
    const url = prompt("Bağlantı URL’si girin:", "https://");
    if (!url) return;
    runCmd("createLink", url);
  }

  // Renk
  function applyColor(hex) {
    runCmd("foreColor", hex);
  }
  function resetColor() {
    runCmd("removeFormat");
  }

  // ---------- Load existing or new ----------
  function loadNote() {
    if (!currentId) {
      // Yeni not
      original = { title: "", html: "" };
      if (titleInput) titleInput.value = "";
      setHTML(editor, "");
      fmtMetaTimes(null);
      dirty = false;
      return;
    }
    const n = window.StoreNotes?.getNote(currentId);
    if (!n) {
      goBackToList();
      return;
    }
    if (titleInput) titleInput.value = n.title || "";
    setHTML(editor, n.html || "");
    fmtMetaTimes(n);
    original = { title: n.title || "", html: n.html || "" };
    dirty = false;
  }

  // ---------- Save / Delete ----------
  function saveNote() {
    const title = (titleInput?.value || "").trim();
    const html = getHTML(editor);
    const text = window.StoreNotes?.htmlToText?.(html) || "";

    if (!window.StoreNotes) {
      console.warn("[note_edit] StoreNotes yok — script yüklenmemiş olabilir.");
      return;
    }

    if (!currentId) {
      // yeni
      currentId = window.StoreNotes.addNote({ title, html, text });
    } else {
      // güncelle
      window.StoreNotes.updateNote(currentId, { title, html, text });
    }

    dirty = false;
    goBackToList(); // kayıttan sonra her zaman listeye dön
  }

  function askDelete() {
    if (!currentId) {
      if (confirm("Bu not henüz kaydedilmedi. Alanlar temizlensin mi?")) {
        if (titleInput) titleInput.value = "";
        setHTML(editor, "");
        original = { title: "", html: "" };
        dirty = false;
      }
      return;
    }
    ensureModalToast();
    deleteModal?.show();
  }

  function doDelete() {
    if (!currentId || !window.StoreNotes) return;
    window.StoreNotes.removeNote(currentId);
    deleteModal?.hide();
    ensureModalToast();
    undoToast?.show();
    setTimeout(goBackToList, 150);
  }

  function undoDelete() {
    if (!window.StoreNotes) return;
    const id = window.StoreNotes.undoLastDelete();
    if (!id) return;
    undoToast?.hide();
    location.href = `note_edit.html?id=${encodeURIComponent(id)}`;
  }

  // ---------- Toolbar click handling ----------
  function onToolbarClick(e) {
    const btn = e.target.closest("button");
    if (!btn || !toolbar?.contains(btn)) return;

    // Renk paleti (mini grid) — data-color
    if (btn.classList.contains("color-swatch")) {
      const color = btn.getAttribute("data-color");
      if (color) applyColor(color);
      return;
    }

    const cmd = btn.getAttribute("data-cmd");
    const val = btn.getAttribute("data-value");
    if (!cmd) return;

    e.preventDefault();

    switch (cmd) {
      case "bold":
      case "italic":
      case "underline":
      case "undo":
      case "redo":
      case "justifyLeft":
      case "justifyCenter":
      case "justifyRight":
      case "insertUnorderedList":
      case "insertOrderedList":
      case "removeFormat":
        runCmd(cmd);
        break;

      case "blockquote":
        setBlock("BLOCKQUOTE");
        break;

      case "formatBlock":
        setBlock(val || "P");
        break;

      default:
        break;
    }
  }

  // ---------- Aktif ikon durumları ----------
  function queryStateSafe(cmd) {
    try { return document.queryCommandState(cmd); } catch { return false; }
  }
  function updateActiveStates() {
    if (!toolbar) return;
    const buttons = toolbar.querySelectorAll('button[data-cmd]');
    buttons.forEach(b=>{
      const c = b.getAttribute('data-cmd');
      let active = false;
      if (c) {
        // Bazı komutların state'ini okumak anlamlı
        if (["bold","italic","underline","justifyLeft","justifyCenter","justifyRight","insertUnorderedList","insertOrderedList"].includes(c)) {
          active = !!queryStateSafe(c);
        }
      }
      b.classList.toggle('active', !!active);
    });
  }

  // ---------- Link ve renk reset ----------
  function bindExtras() {
    if (btnInsertLink) {
      btnInsertLink.addEventListener("click", (e) => {
        e.preventDefault();
        insertLink();
      });
    }
    if (btnColorReset) {
      btnColorReset.addEventListener("click", (e) => {
        e.preventDefault();
        resetColor();
      });
    }
  }

  // ---------- Dirty detection ----------
  function bindDirtyDetection() {
    titleInput?.addEventListener("input", setDirtyFlag);
    editor?.addEventListener("input", setDirtyFlag);
    editor?.addEventListener("keydown", () => {
      setTimeout(setDirtyFlag, 0);
    });

    window.addEventListener("beforeunload", (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    });

    // Seçim değiştikçe aktif ikonları güncelle
    document.addEventListener("selectionchange", () => {
      if (!toolbarOpen) return; // açıksa güncelle
      updateActiveStates();
    });
  }

  // ---------- Shortcuts ----------
  function bindShortcuts() {
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNote();
      }
    });
  }

  // ---------- FAB ve Floating Toolbar ----------
  function toggleToolbar(force) {
    if (!toolbar || !btnFabToolbar) return;
    const willOpen = typeof force === "boolean" ? force : !toolbarOpen;
    toolbarOpen = willOpen;
    toolbar.style.display = willOpen ? "block" : "none";
    btnFabToolbar.classList.toggle("active", willOpen);
    if (willOpen) {
      positionToolbarNearFab();
      updateActiveStates();
    }
  }

  function positionToolbarNearFab() {
    if (!toolbar || !btnFabToolbar) return;
    // Toolbar'ı FAB'ın sol üstüne yakın bir yerde gösterecek şekilde konumlayalım (fixed)
    const fabRect = btnFabToolbar.getBoundingClientRect();
    const tRect = toolbar.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = fabRect.left - (tRect.width + 12);
    let top  = fabRect.top - (tRect.height + 12);

    // Ekran dışına taşmayı engelle
    if (left < 8) left = 8;
    if (top < 8) top = fabRect.bottom + 12; // yukarı sığmazsa aşağı koy
    if (left + tRect.width > vw - 8) left = vw - tRect.width - 8;
    if (top + tRect.height > vh - 8) top = vh - tRect.height - 8;

    // fixed konumla
    toolbar.style.position = "fixed";
    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;
    toolbar.style.zIndex = "1000";
  }

  function clamp(val, min, max){ return Math.max(min, Math.min(max, val)); }

  function initFabDrag() {
    if (!btnFabToolbar) return;

    // Stil: fixed (eğer değilse)
    const cs = window.getComputedStyle(btnFabToolbar);
    if (cs.position !== "fixed") {
      btnFabToolbar.style.position = "fixed";
      // Sağ-alt köşeye başlangıç
      btnFabToolbar.style.right = "16px";
      btnFabToolbar.style.bottom = "16px";
    }

    const start = (clientX, clientY) => {
      fabDrag.dragging = true;
      // Mevcut konum (left/top) hesapla
      const rect = btnFabToolbar.getBoundingClientRect();
      fabDrag.left = rect.left;
      fabDrag.top  = rect.top;
      fabDrag.startX = clientX;
      fabDrag.startY = clientY;
      // sürüklerken toolbar'ı kapatma
    };

    const move = (clientX, clientY) => {
      if (!fabDrag.dragging) return;
      const dx = clientX - fabDrag.startX;
      const dy = clientY - fabDrag.startY;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = btnFabToolbar.getBoundingClientRect();
      let newLeft = clamp(fabDrag.left + dx, 8, vw - rect.width - 8);
      let newTop  = clamp(fabDrag.top  + dy, 8, vh - rect.height - 8);

      btnFabToolbar.style.left = `${newLeft}px`;
      btnFabToolbar.style.top  = `${newTop}px`;
      btnFabToolbar.style.right = "auto";
      btnFabToolbar.style.bottom = "auto";

      if (toolbarOpen) positionToolbarNearFab();
    };

    const end = () => { fabDrag.dragging = false; };

    // Mouse
    btnFabToolbar.addEventListener("mousedown", (e)=>{
      // Sürüklemeyi başlat, ama kısa tıklamada toggle yapmaya da izin verelim — bu yüzden threshold kullanacağız
      start(e.clientX, e.clientY);
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e)=> move(e.clientX, e.clientY));
    document.addEventListener("mouseup", end);

    // Touch
    btnFabToolbar.addEventListener("touchstart", (e)=>{
      const t = e.touches[0];
      start(t.clientX, t.clientY);
    }, {passive:true});
    document.addEventListener("touchmove", (e)=>{
      const t = e.touches[0];
      move(t.clientX, t.clientY);
    }, {passive:true});
    document.addEventListener("touchend", end);

    // Tıklama ile aç/kapat (sürükleme eşiği kontrolü)
    let clickBlock = false;
    let downX=0, downY=0;
    btnFabToolbar.addEventListener("pointerdown", (e)=>{ downX=e.clientX; downY=e.clientY; clickBlock=false; });
    btnFabToolbar.addEventListener("pointerup", (e)=>{
      const dist = Math.hypot((e.clientX-downX), (e.clientY-downY));
      // 6px üzeri hareket sürükleme sayılır, tıklama tetiklemeyelim
      clickBlock = dist > 6;
      if (!clickBlock) toggleToolbar();
    });
  }

  // ---------- Buttons ----------
  function bindButtons() {
    btnSave?.addEventListener("click", saveNote);
    btnDelete?.addEventListener("click", askDelete);
    btnDeleteConfirm?.addEventListener("click", doDelete);
    btnUndoDelete?.addEventListener("click", undoDelete);

    // Toolbar click delegation
    toolbar?.addEventListener("click", onToolbarClick);
  }

  // ---------- Init ----------
  function init() {
    ensureModalToast();
    loadNote();
    bindButtons();
    bindExtras();
    bindDirtyDetection();
    bindShortcuts();
    initFabDrag();

    // Toolbar başlangıçta kapalı dursun
    if (toolbar) {
      toolbar.style.display = "none";
    }

    if (!currentId) {
      setTimeout(() => editor?.focus(), 150);
    }

    // Pencere döndüğünde/klavye etkilerinde toolbar pozisyonunu düzelt
    window.addEventListener("resize", ()=> { if (toolbarOpen) positionToolbarNearFab(); });
  }

  init();
})();
