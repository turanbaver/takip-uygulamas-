(function(){
  // ---- DOM ----
  const elDate = document.getElementById("taskDate");
  const elTime = document.getElementById("taskTime");
  const elTitle = document.getElementById("taskTitle");
  const elNote = document.getElementById("taskNote");
  const btnAdd = document.getElementById("btnAdd");
  const btnToday = document.getElementById("btnToday");
  const btnClearTime = document.getElementById("btnClearTime");

  const calendarGrid = document.getElementById("calendarGrid");
  const calendarLabel = document.getElementById("calendarLabel");
  const btnPrevMonth = document.getElementById("btnPrevMonth");
  const btnNextMonth = document.getElementById("btnNextMonth");

  const btnOpenTable = document.getElementById("btnOpenTable");
  const agendaTableModalEl = document.getElementById("agendaTableModal");
  const agendaHistoryTable = document.getElementById("agendaHistoryTable");
  let agendaTableModal;

  // ---- State ----
  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth(); // 0-11

  // ---- Helpers ----
  const MONTHS_TR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

  function toISO(d){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }
  function fromISO(iso){
    const [y,m,d] = iso.split("-").map(Number);
    return new Date(y, m-1, d);
  }
  function isPastDay(iso){
    // compare by date only
    const d = fromISO(iso);
    const t = new Date();
    t.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    return d.getTime() < t.getTime();
  }
  function isToday(iso){
    return iso === UtilsAgenda.todayKey();
  }
  function timeHasPassedToday(hhmm){
    if(!hhmm) return false;
    const [hh,mm] = hhmm.split(":").map(Number);
    const now = new Date();
    const cmp = new Date();
    cmp.setHours(hh||0, mm||0, 0, 0);
    return now.getTime() > cmp.getTime();
  }
  function fmtMonthYearTR(y, mIndex){ // mIndex: 0-11
    return `${MONTHS_TR[mIndex]} ${y}`;
  }
  function mondayFirstIndex(jsDay){ // JS: 0=Sun..6=Sat -> 0=Mon..6=Sun
    return (jsDay + 6) % 7;
  }

  // ---- Calendar Build (Pzt başlar) ----
  function buildCalendarMatrix(year, month, agendaData){
    const first = new Date(year, month, 1);
    const last = new Date(year, month+1, 0);
    const leading = mondayFirstIndex(first.getDay()); // boş hücre sayısı
    const weeks = [];
    let week = new Array(leading).fill(null);

    for(let d=1; d<=last.getDate(); d++){
      const dateObj = new Date(year, month, d);
      const iso = toISO(dateObj);
      const tasks = agendaData[iso] || [];
      week.push({ day:d, iso, tasks });
      if(week.length===7){
        weeks.push(week);
        week = [];
      }
    }
    if(week.length){
      while(week.length<7) week.push(null);
      weeks.push(week);
    }
    return weeks; // array of weeks of 7 cells
  }

  // ---- Render Calendar ----
  function renderCalendar(){
    calendarGrid.innerHTML = "";
    calendarLabel.textContent = fmtMonthYearTR(currentYear, currentMonth);

    const data = StoreAgenda.getAllAgenda();
    const weeks = buildCalendarMatrix(currentYear, currentMonth, data);

    const table = document.createElement("table");
    table.className="table table-bordered text-center mb-0 calendar-table";
    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].forEach(d=>{
      const th=document.createElement("th"); th.textContent=d; trh.appendChild(th);
    });
    thead.appendChild(trh); table.appendChild(thead);

    const tbody=document.createElement("tbody");

    weeks.forEach(week=>{
      const tr=document.createElement("tr");
      week.forEach(cell=>{
        const td=document.createElement("td");
        if(cell){
          td.textContent = cell.day;
          td.style.cursor="pointer";

          // bugünün vurgusu
          if(isToday(cell.iso)) td.classList.add("td-today");

          // görev var nokta
          if(cell.tasks.length){
            const dot=document.createElement("div");
            dot.className="agenda-dot";
            td.appendChild(dot);
          }

          // gün durumu (tamam / eksik)
          if(cell.tasks.length){
            const allDone = cell.tasks.every(t=> !!t.done);
            const hasPendingPast = isPastDay(cell.iso) && cell.tasks.some(t=> !t.done);
            const todayPendingByTime = isToday(cell.iso) && cell.tasks.some(t=> !t.done && timeHasPassedToday(t.time||""));

            if(allDone) td.classList.add("td-all-done");
            else if(hasPendingPast || todayPendingByTime) td.classList.add("td-has-pending");
          }

          // tıkla -> detay sayfası
          td.addEventListener("click", ()=>{
            location.href = `agenda_detail.html?date=${encodeURIComponent(cell.iso)}`;
          });
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    // Grid'e koy
    const wrap = document.createElement("div");
    wrap.className = "calendar-grid";
    wrap.appendChild(table);
    calendarGrid.replaceChildren(wrap);
  }

  // ---- Table Modal (Tabloyu Aç) ----
  function ensureTableModal(){
    if(!agendaTableModal){
      agendaTableModal = new bootstrap.Modal(agendaTableModalEl);
    }
  }

  function buildAgendaTable(){
    // Tablo sütunları: Tarih, Saat, Başlık, Not, Durum
    const all = StoreAgenda.getAllAgenda();
    const dates = Object.keys(all).sort();
    const headers = ["Tarih","Saat","Başlık","Not","Durum"];
    const rows = [];

    dates.forEach(date=>{
      (all[date]||[]).forEach(it=>{
        rows.push([
          UtilsAgenda.fmtDateHuman(date),
          it.time || "",
          it.title || "",
          it.note || "",
          it.done ? "Tamamlandı" : "Açık"
        ]);
      });
    });

    // tabloyu kur
    const table = UtilsAgenda.buildTable(headers, rows);
    table.id = "agendaHistoryTable";
    agendaHistoryTable.replaceWith(table);
  }

  // ---- Form Actions ----
  function setToday(){
    elDate.value = UtilsAgenda.todayKey();
  }
  function clearTime(){
    elTime.value = "";
  }
  function addAgenda(){
    const dateKey = elDate.value || UtilsAgenda.todayKey();
    const title = (elTitle.value||"").trim();
    const time = (elTime.value||"").trim();
    const note = (elNote.value||"").trim();

    if(!title){
      elTitle.focus();
      return;
    }
    StoreAgenda.addAgenda(dateKey, { title, time, note, done:false });
    // temizle
    elTitle.value=""; elNote.value=""; // saati isteğe bağlı koruyabiliriz
    // takvimi güncelle
    renderCalendar();
  }

  // ---- Export / Import (Modal içinden) ----
  function bindExportImport(){
    const btnExportJson = document.getElementById("btnExportAgendaJson");
    const btnExportCsv = document.getElementById("btnExportAgendaCsv");
    const fileImportJson = document.getElementById("fileImportAgendaJson");
    const fileImportCsv = document.getElementById("fileImportAgendaCsv");

    btnExportJson.addEventListener("click", ()=>{
      const json = StoreAgenda.exportAgendaJSON();
      UtilsAgenda.downloadText("agenda.json", json);
    });
    btnExportCsv.addEventListener("click", ()=>{
      const rows = StoreAgenda.exportAgendaCSV();
      UtilsAgenda.downloadCSV("agenda.csv", rows);
    });

    fileImportJson.addEventListener("change", async (e)=>{
      const f = e.target.files[0]; if(!f) return;
      try{
        const text = await UtilsAgenda.readFileAsText(f);
        StoreAgenda.importAgendaJSON(text);
        alert("JSON içe aktarıldı.");
        buildAgendaTable();
        renderCalendar();
      }catch(err){ alert("Hata: "+err.message); }
      e.target.value = "";
    });

    fileImportCsv.addEventListener("change", async (e)=>{
      const f = e.target.files[0]; if(!f) return;
      try{
        const text = await UtilsAgenda.readFileAsText(f);
        const rows = UtilsAgenda.parseCsv(text);
        StoreAgenda.importAgendaCSV(rows);
        alert("CSV içe aktarıldı.");
        buildAgendaTable();
        renderCalendar();
      }catch(err){ alert("Hata: "+err.message); }
      e.target.value = "";
    });
  }

  // ---- Events ----
  btnToday.addEventListener("click", setToday);
  btnClearTime.addEventListener("click", clearTime);
  btnAdd.addEventListener("click", addAgenda);
  elTitle.addEventListener("keydown", (e)=>{ if(e.key==="Enter") addAgenda(); });

  btnPrevMonth.addEventListener("click", ()=>{
    currentMonth--; if(currentMonth<0){ currentMonth=11; currentYear--; }
    renderCalendar();
  });
  btnNextMonth.addEventListener("click", ()=>{
    currentMonth++; if(currentMonth>11){ currentMonth=0; currentYear++; }
    renderCalendar();
  });

  btnOpenTable.addEventListener("click", ()=>{
    ensureTableModal();
    buildAgendaTable();
    bindExportImport(); // güvenli: birden çok kez bağlansa da input change sonrası sıfırlanıyor
    agendaTableModal.show();
  });

  // ---- Init ----
  setToday();
  renderCalendar();
})();
