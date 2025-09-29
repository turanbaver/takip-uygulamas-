/* assets/js/store_notes.js
   - Notlar için localStorage tabanlı veri katmanı
   - Özellikler:
     • CRUD: addNote, getNote, updateNote, removeNote, undoLastDelete
     • Listeleme & Arama: listNotes({query, sortBy, order}), searchNotes(query)
     • Dışa/İçe Aktarma: exportNotesJSON, importNotesJSON, exportNotesCSV, importNotesCSV
     • Güvenli saklama: { id, title, html, text, created, updated }
     • Dayanıklılık: bozuk JSON toleransı, eski verilerin şemaya yükseltilmesi
*/
(function (global) {
    "use strict";
  
    const KEY = "takip_programi_notes_v1";
  
    // ------------------------------
    // Dahili yardımcılar
    // ------------------------------
    function safeParse(json, fallback) {
      try { 
        if (!json) return fallback;  // null veya boş string gelirse fallback dön
        return JSON.parse(json); 
      } catch { 
        return fallback; 
      }
    }
    function save(db) {
      localStorage.setItem(KEY, JSON.stringify(db));
    }
    function load() {
      const raw = localStorage.getItem(KEY);
      const db = safeParse(raw, { notes: {} });
      if (!db.notes || typeof db.notes !== "object") db.notes = {};
      // Şema yükseltme: tüm notlara zorunlu alanları ekle
      Object.entries(db.notes).forEach(([id, n]) => {
        if (typeof n.id === "undefined") n.id = id;
        if (typeof n.title === "undefined") n.title = "";
        if (typeof n.html === "undefined") n.html = "";
        if (typeof n.text === "undefined") n.text = htmlToText(n.html || "");
        if (typeof n.created !== "number") n.created = Date.now();
        if (typeof n.updated !== "number") n.updated = n.created;
      });
      return db;
    }
  
    // Basit uid
    function uid() {
      return "n_" + Math.random().toString(36).slice(2, 10);
    }
  
    // HTML → düz metin (özet/arama için)
    function htmlToText(html) {
      if (!html) return "";
      // Etiketleri temizle
      let text = String(html)
        // line breaks for block-ish tags
        .replace(/<\/(p|div|h[1-6]|li|br|blockquote)>/gi, "$&\n")
        .replace(/<[^>]+>/g, "");
      // HTML entity decode (kısıtlı)
      const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
      text = text.replace(/(&amp;|&lt;|&gt;|&quot;|&#39;)/g, m => entities[m] || m);
      // Whitespace düzenle
      return text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
    }
  
    // Tarihi ISO (YYYY-MM-DD) üret (CSV import için kullanılabilir)
    function dateISO(d = new Date()) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  
    // ------------------------------
    // DB belleğe çekilir
    // ------------------------------
    let db = load();
  
    // Son silinen notu geri alabilmek için RAM tamponu
    let _lastDeleted = null;
  
    // ------------------------------
    // CRUD
    // ------------------------------
    /**
     * addNote({ title?, html?, text? }) : string id
     */
    function addNote(input) {
      const now = Date.now();
      const id = uid();
      const title = String((input && input.title) || "").trim();
      const html = String((input && input.html) || "");
      const text = (input && typeof input.text === "string") ? input.text : htmlToText(html);
  
      db.notes[id] = {
        id, title, html, text,
        created: now,
        updated: now
      };
      save(db);
      return id;
    }
  
    /**
     * getNote(id) : {id,title,html,text,created,updated} | null
     */
    function getNote(id) {
      const n = db.notes[id];
      return n ? { ...n } : null;
    }
  
    /**
     * updateNote(id, patch)
     * patch: { title?, html?, text? }
     * - html verilirse text verilmediyse otomatik htmlToText(html)
     * - updated timestamp güncellenir
     */
    function updateNote(id, patch) {
      const n = db.notes[id];
      if (!n) return;
      const p = patch || {};
      if (typeof p.title !== "undefined") n.title = String(p.title || "").trim();
      if (typeof p.html !== "undefined") n.html = String(p.html || "");
      if (typeof p.text !== "undefined") n.text = String(p.text || "");
      // html güncellenip text verilmediyse üret
      if (typeof p.html !== "undefined" && typeof p.text === "undefined") {
        n.text = htmlToText(n.html);
      }
      n.updated = Date.now();
      save(db);
    }
  
    /**
     * removeNote(id) : {removed: true, note} | null
     * - Silinen notu _lastDeleted içine koyar (undoLastDelete ile geri alınabilir)
     */
    function removeNote(id) {
      const n = db.notes[id];
      if (!n) return null;
      _lastDeleted = { ...n };
      delete db.notes[id];
      save(db);
      return { removed: true, note: { ..._lastDeleted } };
    }
  
    /**
     * undoLastDelete() : string id | null
     * - Son silinen notu geri yükler
     */
    function undoLastDelete() {
      if (!_lastDeleted) return null;
      const note = { ..._lastDeleted };
      // Aynı id başka bir notla çakışırsa yeni id ile ekleyelim
      let id = note.id;
      if (db.notes[id]) id = uid();
      note.id = id;
      db.notes[id] = note;
      _lastDeleted = null;
      save(db);
      return id;
    }
  
    /**
     * clearAllNotes() : NOT DİKKAT — tüm notları siler
     */
    function clearAllNotes() {
      db.notes = {};
      save(db);
    }
  
    // ------------------------------
    // Listeleme & Arama
    // ------------------------------
    /**
     * listNotes(opts?)
     *  - opts.query? : string (başlık + text içinde arama, case-insensitive)
     *  - opts.sortBy? : "updated" | "created" | "title" (default "updated")
     *  - opts.order?  : "desc" | "asc" (default "desc")
     *  - returns: Array<note>
     */
    function listNotes(opts) {
      const o = opts || {};
      const q = (o.query || "").toLowerCase().trim();
      const sortBy = o.sortBy || "updated";
      const order = (o.order || "desc").toLowerCase();
  
      let arr = Object.values(db.notes).map(n => ({ ...n }));
  
      if (q) {
        arr = arr.filter(n =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.text && n.text.toLowerCase().includes(q))
        );
      }
  
      arr.sort((a, b) => {
        let cmp = 0;
        if (sortBy === "title") cmp = String(a.title || "").localeCompare(String(b.title || ""), "tr");
        else if (sortBy === "created") cmp = (a.created || 0) - (b.created || 0);
        else /* updated */ cmp = (a.updated || 0) - (b.updated || 0);
        return order === "asc" ? cmp : -cmp;
      });
  
      return arr;
    }
  
    /**
     * searchNotes(query) : Array<note>
     */
    function searchNotes(query) {
      return listNotes({ query, sortBy: "updated", order: "desc" });
    }
  
    // ------------------------------
    // Export / Import — JSON
    // ------------------------------
    /**
     * exportNotesJSON() : string (pretty JSON)
     */
    function exportNotesJSON() {
      // Basit bir kapsayıcı ile ver
      return JSON.stringify({ notes: db.notes }, null, 2);
    }
  
    /**
     * importNotesJSON(text)
     * - Aynı id varsa "daha yeni updated" olan kazanır (merge)
     * - Dönüş: { imported: number, merged: number, skipped: number }
     */
    function importNotesJSON(text) {
      const obj = safeParse(text, null);
      if (!obj || typeof obj !== "object" || typeof obj.notes !== "object") {
        throw new Error("Geçersiz JSON formatı (notes bekleniyordu).");
      }
      let imported = 0, merged = 0, skipped = 0;
      Object.entries(obj.notes).forEach(([id, incoming]) => {
        // giriş verisini normalize et
        const norm = {
          id: incoming.id || id,
          title: String(incoming.title || "").trim(),
          html: String(incoming.html || ""),
          text: typeof incoming.text === "string" ? incoming.text : htmlToText(incoming.html || ""),
          created: typeof incoming.created === "number" ? incoming.created : Date.now(),
          updated: typeof incoming.updated === "number" ? incoming.updated : Date.now(),
        };
  
        const exist = db.notes[norm.id];
        if (!exist) {
          db.notes[norm.id] = norm;
          imported++;
        } else {
          // Yeni mi eski mi?
          if ((norm.updated || 0) > (exist.updated || 0)) {
            db.notes[norm.id] = norm;
            merged++;
          } else {
            skipped++;
          }
        }
      });
      save(db);
      return { imported, merged, skipped };
    }
  
    // ------------------------------
    // Export / Import — CSV
    // ------------------------------
    /**
     * exportNotesCSV() : rows[][] (ilk satır header)
     * - Kolonlar: id, title, created_iso, updated_iso, text
     * - HTML metni CSV'ye koymuyoruz; text (strip html) koyuyoruz.
     */
    function exportNotesCSV() {
      const rows = [["id", "title", "created_iso", "updated_iso", "text"]];
      const notes = listNotes({ sortBy: "updated", order: "desc" });
      notes.forEach(n => {
        const createdIso = dateISO(new Date(n.created || Date.now()));
        const updatedIso = dateISO(new Date(n.updated || n.created || Date.now()));
        rows.push([n.id, n.title || "", createdIso, updatedIso, (n.text || "").replace(/\r?\n/g, " ")]);
      });
      return rows;
    }
  
    /**
     * importNotesCSV(rows)
     * - Beklenen başlıklar: id?, title?, created_iso?, updated_iso?, text?
     * - id verilmezse yeni id atanır.
     * - created/updated ISO verilmeyebilir → now
     * - text'ten html üretilemeyeceği için html=text olarak kaydedilir (basit paragraf)
     * - Dönüş: { imported, merged }
     */
    function importNotesCSV(rows) {
      if (!rows || !rows.length) return { imported: 0, merged: 0 };
      const header = rows[0].map(h => String(h || "").toLowerCase().trim());
      const idx = {
        id: header.indexOf("id"),
        title: header.indexOf("title"),
        created_iso: header.indexOf("created_iso"),
        updated_iso: header.indexOf("updated_iso"),
        text: header.indexOf("text"),
      };
      let imported = 0, merged = 0;
  
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i]; if (!r || !r.length) continue;
  
        let id = idx.id >= 0 ? (r[idx.id] || "").trim() : "";
        if (!id) id = uid();
  
        const title = idx.title >= 0 ? String(r[idx.title] || "").trim() : "";
        const text = idx.text >= 0 ? String(r[idx.text] || "") : "";
  
        const created = idx.created_iso >= 0 && r[idx.created_iso] ? Date.parse(r[idx.created_iso]) : Date.now();
        const updated = idx.updated_iso >= 0 && r[idx.updated_iso] ? Date.parse(r[idx.updated_iso]) : created;
  
        const html = text ? `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>` : "";
  
        const incoming = { id, title, html, text: htmlToText(html), created, updated };
  
        const exist = db.notes[id];
        if (!exist) {
          db.notes[id] = incoming;
          imported++;
        } else {
          if ((incoming.updated || 0) > (exist.updated || 0)) {
            db.notes[id] = incoming;
            merged++;
          }
        }
      }
      save(db);
      return { imported, merged };
    }
  
    // Basit HTML escape (CSV import için html üretirken kullanıldı)
    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      })[s]);
    }
  
    // ------------------------------
    // Public API
    // ------------------------------
    global.StoreNotes = {
      // temel
      addNote,
      getNote,
      updateNote,
      removeNote,
      undoLastDelete,
      clearAllNotes,
  
      // liste & arama
      listNotes,
      searchNotes,
  
      // dışa/ içe aktarma
      exportNotesJSON,
      importNotesJSON,
      exportNotesCSV,
      importNotesCSV,
  
      // yardımcılar (bazı sayfalar ihtiyaç duyabilir)
      htmlToText,
    };
  
  })(window);
  