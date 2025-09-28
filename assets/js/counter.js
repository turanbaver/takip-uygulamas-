(function(){
    // DOM referansları
    const elName = document.getElementById("taskName");
    const elMin = document.getElementById("taskMin");
    const btnAdd = document.getElementById("btnAdd");
    const list = document.getElementById("taskList");
    const emptyMsg = document.getElementById("emptyMsg");
  
    const btnShowTable = document.getElementById("btnShowTable");
    const tableModalEl = document.getElementById("tableModal");
    const historyTable = document.getElementById("historyTable");
    const historyList = document.getElementById("historyList");
  
    const btnExportJson = document.getElementById("btnExportJson");
    const btnExportCsv = document.getElementById("btnExportCsv");
    const fileImportJson = document.getElementById("fileImportJson");
    const fileImportCsv = document.getElementById("fileImportCsv");
  
    let tableModal;
  
    function ensureModal(){
      if(!tableModal){
        tableModal = new bootstrap.Modal(tableModalEl);
      }
    }
  
    // Listeyi çiz
    function renderList(){
      const tasks = Store.listTasks();
      list.innerHTML = "";
  
      if(!tasks.length){
        emptyMsg.classList.remove("d-none");
        return;
      }
      emptyMsg.classList.add("d-none");
  
      tasks.forEach(t=>{
        const today = Store.getTodayCount(t.id);
        const min = t.min || 0;
  
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";
        li.style.cursor = "pointer";
  
        const left = document.createElement("div");
        left.className = "d-flex align-items-center gap-2";
        left.innerHTML = `
          <i class="fa-solid fa-circle text-primary-emphasis"></i>
          <span class="fw-semibold">${t.name}</span>
        `;
  
        const badge = document.createElement("span");
        badge.className = "badge rounded-pill me-2";
        if(min > 0){
          badge.textContent = `${today} / ${min}`;
          badge.classList.add(today >= min ? "bg-success" : "bg-warning");
        } else {
          badge.textContent = `${today}`;
          badge.classList.add("bg-secondary");
        }
  
        // sağ taraf (badge + silme ikonu)
        const right = document.createElement("div");
        right.className = "d-flex align-items-center gap-2";
        right.appendChild(badge);
  
        const btnDel = document.createElement("button");
        btnDel.className = "btn btn-sm btn-outline-danger";
        btnDel.innerHTML = `<i class="fa-solid fa-trash"></i>`;
        btnDel.addEventListener("click",(e)=>{
          e.stopPropagation(); // satır tıklamasını engelle
          if(confirm(`"${t.name}" görevini silmek istiyor musun?`)){
            Store.removeTask(t.id);
            renderList();
          }
        });
        right.appendChild(btnDel);
  
        li.appendChild(left);
        li.appendChild(right);
  
        // satıra tıklama → detay sayfası
        li.addEventListener("click", ()=>{
          location.href = `counter_detail.html?id=${encodeURIComponent(t.id)}`;
        });
  
        list.appendChild(li);
      });
    }
  
    // Ekle
    function addTask(){
      const name = (elName.value||"").trim();
      const min = parseInt(elMin.value,10) || 0;
      if(!name){
        elName.focus();
        return;
      }
      Store.addTask(name, min);
      elName.value = "";
      elMin.value = "";
      renderList();
    }
  
    // Tablo görünümü
    function renderTable(){
      const rows = Store.exportCountersCSV();
      const headers = rows[0].map((h,i)=> i===0 ? "Tarih" : h);
      const data = rows.slice(1).map(r=>{
        const copy = r.slice();
        if(copy[0]) copy[0] = Utils.fmtDateHuman(copy[0]);
        return copy;
      });
  
      historyTable.innerHTML = "";
      const table = Utils.buildTable(headers, data);
      historyTable.replaceWith(table);
      table.id = "historyTable";
    }
  
    // Günlük stacked liste
    function renderDailyList(){
      historyList.innerHTML = "";
      const rows = Store.exportCountersCSV();
      if(rows.length<=1) return;
  
      const headers = rows[0];
      const taskNames = headers.slice(1);
  
      rows.slice(1).forEach(r=>{
        const dayISO = r[0];
        const dayHuman = Utils.fmtDateHuman(dayISO);
  
        const wrap = document.createElement("div");
        wrap.className = "day-card";
  
        const title = document.createElement("div");
        title.className = "day-title";
        title.textContent = dayHuman;
  
        const ul = document.createElement("ul");
        ul.className = "list-group list-group-flush";
  
        for(let i=1;i<r.length;i++){
          const li = document.createElement("li");
          li.className = "list-group-item d-flex justify-content-between align-items-center";
          li.innerHTML = `
            <span>${taskNames[i-1]}</span>
            <span class="badge rounded-pill text-bg-primary">${r[i]}</span>
          `;
          ul.appendChild(li);
        }
  
        wrap.appendChild(title);
        wrap.appendChild(ul);
        historyList.appendChild(wrap);
      });
    }
  
    // Eventler
    btnAdd.addEventListener("click", addTask);
    elName.addEventListener("keydown", e=>{ if(e.key==="Enter") addTask(); });
    elMin.addEventListener("keydown", e=>{ if(e.key==="Enter") addTask(); });
  
    btnShowTable.addEventListener("click", ()=>{
      ensureModal();
      renderTable();
      renderDailyList();
      tableModal.show();
    });
  
    // Export / Import
    btnExportJson.addEventListener("click", ()=>{
      const json = Store.exportCountersJSON();
      Utils.downloadText("counters.json", json);
    });
    btnExportCsv.addEventListener("click", ()=>{
      const rows = Store.exportCountersCSV();
      Utils.downloadCSV("counters.csv", rows);
    });
  
    fileImportJson.addEventListener("change", async (e)=>{
      const f = e.target.files[0]; if(!f) return;
      try{
        const text = await Utils.readFileAsText(f);
        Store.importCountersJSON(text);
        alert("JSON içe aktarıldı.");
        renderList();
        renderTable();
        renderDailyList();
      }catch(err){ alert("Hata: "+err.message); }
      e.target.value = "";
    });
  
    fileImportCsv.addEventListener("change", async (e)=>{
      const f = e.target.files[0]; if(!f) return;
      try{
        const text = await Utils.readFileAsText(f);
        const rows = Utils.parseCsv(text);
        Store.importCountersCSV(rows);
        alert("CSV içe aktarıldı.");
        renderList();
        renderTable();
        renderDailyList();
      }catch(err){ alert("Hata: "+err.message); }
      e.target.value = "";
    });
  
    // başlangıç
    renderList();
  })();
