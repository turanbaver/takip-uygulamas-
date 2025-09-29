/* assets/js/note_edit.js
   Not Detay/Düzenleme sayfası
   - Toolbar tıklamalarında seçim kaybını önler (mousedown prevent + selection restore)
   - Kaydet: addNote/updateNote → notlar listesine geri döner
   - Sil: onay modalı + Geri Al (undo)
   - Ayrılırken kaydedilmemiş değişiklik uyarısı
*/

(function () {
  "use strict";

  // ---------------- DOM ----------------
  const titleInput   = document.getElementById("noteTitle");
  const editor       = document.getElementById("editor");
  const metaTimes    = document.getElementById("metaTimes");

  const btnSave      = document.getElementById("btnSave");
  const btnDelete    = document.getElementById("btnDelete");

  // Üstte sabit toolbar
  const toolbar      = document.getElementById("editorToolbar");
  const btnInsertLink= document.getElementById("btnInsertLink");
  const btnColorReset= document.getElementById("btnColorReset");

  // Silme modal & toast
  const deleteModalEl  = document.getElementById("deleteNoteModal");
  const btnDeleteConfirm = document.getElementById("btnDeleteConfirm");
  const undoToastEl    = document.getElementById("undoToast");
  const btnUndoDelete  = document.getElementById("btnUndoDelete");

  let deleteModal = null;
  let undoToast   = null;

  // ---------------- State ----------------
  const params = new URLSearchParams(location.search);
  let currentId = params.get("id") || null;

  let original = { title: "", html: "" };
  let dirty    = false;

  // Seçim (range) snapshot — toolbar tıklamasında geri yüklemek için
  let savedRange = null;

  // ---------------- Utils ----------------
  function ensureModalToast() {
    if (!deleteModal) deleteModal = new bootstrap.Modal(deleteModalEl);
    if (!undoToast)   undoToast   = new bootstrap.Toast(undoToastEl, { delay: 8000 });
  }

  function getHTML(el) {
    const html = (el.innerHTML || "").trim();
    if (!html || html === "<br>") return "";
    return html;
  }
  function setHTML(el, html) {
    el.innerHTML = html || "";
  }

  function fmtMetaTimes(n) {
    if (!n) { metaTimes.textContent = "—"; return; }
    const created = UtilsNotes.fmtDateTimeHuman(n.created);
    const updated = UtilsNotes.fmtDateTimeHuman(n.updated);
    metaTimes.textContent = (created && updated) ? `Oluşturma: ${created} • Güncelleme: ${updated}` : "—";
  }

  function goBackToList() {
    location.href = "notes.html";
  }

  function setDirtyFlag() {
    dirty = (titleInput.value || "") !== (original.title || "") ||
            (getHTML(editor) || "")  !== (original.html  || "");
  }

  // ----- Selection save/restore (cursor zıplamasın) -----
  function saveSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { savedRange = null; return; }
    // Clone range (değişmesin)
    savedRange = sel.getRangeAt(0).cloneRange();
  }
  function restoreSelection() {
    if (!savedRange) return;
    editor.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  // ----- execCommand helper -----
  function runCmd(cmd, value = null) {
    try {
      // Komut çalışmadan önce seçimi geri yükle
      restoreSelection();
      document.execCommand(cmd, false, value);
      // Komuttan sonra da güncel range’i yine kaydet
      saveSelection();
      editor.focus();
    } catch (_) {}
  }

  // Block set (H1/H2/P/BLOCKQUOTE)
  function setBlock(tag) {
    const t = (tag || "P").toUpperCase();
    restoreSelection();
    if (t === "BLOCKQUOTE") {
      try {
        document.execCommand("formatBlock", false, "BLOCKQUOTE");
      } catch (_) {
        // bazı tarayıcılar için basit fallback
        wrapSelectionWith("<blockquote>", "</blockquote>");
      }
    } else {
      document.execCommand("formatBlock", false, t);
    }
    saveSelection();
    editor.focus();
  }

  // Fallback wrap
  function wrapSelectionWith(startTag, endTag) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const frag  = range.extractContents();

    const wrapStart = document.createElement("div");
    wrapStart.innerHTML = startTag;
    const node = wrapStart.firstChild;
    node.appendChild(frag);

    const wrapEnd = document.createElement("div");
    wrapEnd.innerHTML = endTag;
    const after = wrapEnd.firstChild;

    range.insertNode(node);
    node.parentNode.insertBefore(after, node.nextSibling);

    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.setStartAfter(after);
    newRange.collapse(true);
    sel.addRange(newRange);
  }

  // Renk & Link
  function applyColor(hex) { runCmd("foreColor", hex); }
  function resetColor()    { runCmd("removeFormat"); }
  function insertLink() {
    restoreSelection();
    const url = prompt("Bağlantı URL’si girin:", "https://");
    if (!url) return;
    runCmd("createLink", url);
  }

  // ---------------- Load ----------------
  function loadNote() {
    if (!currentId) {
      original = { title: "", html: "" };
      titleInput.value = "";
      setHTML(editor, "");
      fmtMetaTimes(null);
      dirty = false;
      return;
    }
    const n = StoreNotes.getNote(currentId);
    if (!n) { goBackToList(); return; }
    titleInput.value = n.title || "";
    setHTML(editor, n.html || "");
    fmtMetaTimes(n);
    original = { title: n.title || "", html: n.html || "" };
    dirty = false;
  }

  // ---------------- Save / Delete ----------------
  function saveNote() {
    const title = (titleInput.value || "").trim();
    const html  = getHTML(editor);
    const text  = StoreNotes.htmlToText(html);

    if (!currentId) {
      currentId = StoreNotes.addNote({ title, html, text });
    } else {
      StoreNotes.updateNote(currentId, { title, html, text });
    }
    dirty = false;
    goBackToList();
  }

  function askDelete() {
    if (!currentId) {
      if (confirm("Bu not henüz kaydedilmedi. Alanlar temizlensin mi?")) {
        titleInput.value = "";
        setHTML(editor, "");
        original = { title: "", html: "" };
        dirty = false;
      }
      return;
    }
    ensureModalToast();
    deleteModal.show();
  }

  function doDelete() {
    if (!currentId) return;
    StoreNotes.removeNote(currentId);
    deleteModal.hide();
    ensureModalToast();
    undoToast.show();
    setTimeout(goBackToList, 150);
  }

  function undoDelete() {
    const id = StoreNotes.undoLastDelete();
    if (!id) return;
    undoToast.hide();
    location.href = `note_edit.html?id=${encodeURIComponent(id)}`;
  }

  // ---------------- Events ----------------

  // 1) Editor: selection & dirty takip
  editor.addEventListener("keyup", saveSelection);
  editor.addEventListener("mouseup", saveSelection);
  editor.addEventListener("input",  () => { saveSelection(); setDirtyFlag(); });
  editor.addEventListener("keydown", () => { setTimeout(() => { saveSelection(); setDirtyFlag(); }, 0); });

  // 2) Başlık
  titleInput.addEventListener("input", setDirtyFlag);

  // 3) Toolbar: mousedown → selection korunur (focus kaybını önle)
  toolbar.addEventListener("mousedown", (e) => {
    const target = e.target.closest("button, .color-swatch");
    if (!target) return;
    // Buton/fare aşağı tıklanınca odak kaybını engelle
    e.preventDefault();
    // Mevcut seçim snapshot'ı dursun (veya editor odak değilse, son kaydı kullanacağız)
    restoreSelection();
  });

  // 4) Toolbar: click → komut çalıştır
  function onToolbarClick(e) {
    const btn = e.target.closest("button, .color-swatch");
    if (!btn) return;

    // Renk paleti
    if (btn.classList.contains("color-swatch")) {
      const color = btn.getAttribute("data-color");
      if (color) applyColor(color);
      return;
    }

    const cmd = btn.getAttribute("data-cmd");
    const val = btn.getAttribute("data-value");
    if (!cmd) return;

    // Burada selection restore zaten mousedown’da yapıldı; yine de garanti olsun
    restoreSelection();

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
  toolbar.addEventListener("click", onToolbarClick);

  // 5) Link & Renk temizle
  btnInsertLink.addEventListener("click", (e) => { e.preventDefault(); insertLink(); });
  btnColorReset.addEventListener("click", (e) => { e.preventDefault(); resetColor(); });

  // 6) Kısayollar
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveNote();
    }
  });

  // 7) Butonlar
  btnSave.addEventListener("click", saveNote);
  btnDelete.addEventListener("click", askDelete);
  btnDeleteConfirm.addEventListener("click", doDelete);
  btnUndoDelete.addEventListener("click", undoDelete);

  // 8) Ayrılma koruması
  window.addEventListener("beforeunload", (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  // ---------------- Init ----------------
  function init() {
    ensureModalToast();
    loadNote();

    // Editor’a ilk odak (yeni notsa)
    if (!currentId) {
      setTimeout(() => { editor.focus(); saveSelection(); }, 150);
    } else {
      // Mevcut not — imleci sona al
      setTimeout(() => {
        editor.focus();
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        saveSelection();
      }, 150);
    }
  }

  init();
})();
