(function(){
    "use strict";
  
    // DOM referansları
    const grid = document.getElementById("notesGrid");
    const emptyMsg = document.getElementById("emptyMsg");
  
    const fabAdd = document.getElementById("fabAdd");
    const searchInput = document.getElementById("searchInput");
    const btnClearSearch = document.getElementById("btnClearSearch");
  
    const btnOpenTable = document.getElementById("btnOpenTable");
    const tableModalEl = document.getElementById("notesTableModal");
    const notesTable = document.getElementById("notesTable");
  
    const btnExportJson = document.getElementById("btnExportNotesJson");
    const btnExportCsv = document.getElementById("btnExportNotesCsv");
    const fileImportJson = document.getElementById("fileImportNotesJson");
    const fileImportCsv = document.getElementById("fileImportNotesCsv");
  
    let tableModal;
    let currentQuery = "";
  
    function ensureModal(){
      if(!tableModal){
        tableModal = new bootstrap.Modal(tableModalEl);
      }
    }
  
    // ----------------------------------------
    // Not kartları çiz
    // ----------------------------------------
    function renderList(){
      const allNotes = StoreNotes.listNotes({sortBy:"updated", order:"desc"});
      let filtered = allNotes;
  
      if(currentQuery){
        const q = currentQuery.toLowerCase();
        filtered = allNotes.filter(n =>
          (n.title||"").toLowerCase().includes(q) ||
          (n.text||"").toLowerCase().includes(q)
        );
      }
  
      grid.innerHTML = "";
      if(!filtered.length){
        emptyMsg.classList.remove("d-none");
        return;
      }
      emptyMsg.classList.add("d-none");
  
      filtered.forEach(n=>{
        const card = document.createElement("div");
        card.className = "note-card";
  
        // içerik
        const title = n.title || "Başlıksız not";
        const excerpt = UtilsNotes.summarizeText(n.text, 160);
        const date = UtilsNotes.fmtDateTimeHuman(n.updated);
  
        card.innerHTML = `
          <div class="nc-topline">
            <div class="nc-icon"><i class="fa-regular fa-note-sticky"></i></div>
            <div class="nc-title">${UtilsNotes.highlight(title, currentQuery)}</div>
          </div>
          <div class="nc-excerpt">${UtilsNotes.highlight(excerpt, currentQuery)}</div>
          <div class="nc-meta">
            <div class="dot"></div>
            <span>${date}</span>
          </div>
        `;
  
        // tıklama → detay sayfası
        card.addEventListener("click", ()=>{
          location.href = `note_edit.html?id=${encodeURIComponent(n.id)}`;
        });
  
        grid.appendChild(card);
      });
    }
  
    // ----------------------------------------
    // Tablo görünümü
    // ----------------------------------------
    function renderTable(){
      const rows = StoreNotes.exportNotesCSV();
      if(!rows.length){
        notesTable.innerHTML = "<tr><td class='text-secondary p-3'>Henüz not yok</td></tr>";
        return;
      }
  
      const headers = rows[0];
      const data = rows.slice(1);
  
      // table oluştur
      const thead = document.createElement("thead");
      const trh = document.createElement("tr");
      headers.forEach(h=>{
        const th = document.createElement("th");
        th.textContent = h;
        trh.appendChild(th);
      });
      thead.appendChild(trh);
  
      const tbody = document.createElement("tbody");
      data.forEach(r=>{
        const tr = document.createElement("tr");
        r.forEach(c=>{
          const td = document.createElement("td");
          td.textContent = c;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
  
      notesTable.innerHTML = "";
      notesTable.appendChild(thead);
      notesTable.appendChild(tbody);
    }
  
    // ----------------------------------------
    // Eventler
    // ----------------------------------------
    fabAdd.addEventListener("click", ()=>{
      location.href = "note_edit.html"; // yeni not
    });
  
    searchInput.addEventListener("input", e=>{
      currentQuery = e.target.value.trim();
      renderList();
    });
  
    btnClearSearch.addEventListener("click", ()=>{
      searchInput.value = "";
      currentQuery = "";
      renderList();
    });
  
    btnOpenTable.addEventListener("click", ()=>{
      ensureModal();
      renderTable();
      tableModal.show();
    });
  
    // Export / Import
    btnExportJson.addEventListener("click", ()=>{
      const json = StoreNotes.exportNotesJSON();
      UtilsNotes.downloadText("notes.json", json);
    });
    btnExportCsv.addEventListener("click", ()=>{
      const rows = StoreNotes.exportNotesCSV();
      UtilsNotes.downloadCSV("notes.csv", rows);
    });
  
    fileImportJson.addEventListener("change", async (e)=>{
      const f = e.target.files[0]; if(!f) return;
      try{
        const text = await UtilsNotes.readFileAsText(f);
        StoreNotes.importNotesJSON(text);
        alert("JSON içe aktarıldı.");
        renderList();
        renderTable();
      }catch(err){ alert("Hata: "+err.message); }
      e.target.value = "";
    });
  
    fileImportCsv.addEventListener("change", async (e)=>{
      const f = e.target.files[0]; if(!f) return;
      try{
        const text = await UtilsNotes.readFileAsText(f);
        const rows = UtilsNotes.parseCsv(text);
        StoreNotes.importNotesCSV(rows);
        alert("CSV içe aktarıldı.");
        renderList();
        renderTable();
      }catch(err){ alert("Hata: "+err.message); }
      e.target.value = "";
    });
  
    // ----------------------------------------
    // Başlangıç
    // ----------------------------------------
    renderList();
  
  })();
  