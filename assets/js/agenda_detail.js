(function(){
    // ---- DOM ----
    const dateLabel = document.getElementById("dateLabel");
    const dayStateText = document.getElementById("dayStateText");
    const badgeDone = document.getElementById("badgeDone");
    const badgeTotal = document.getElementById("badgeTotal");
  
    const dayList = document.getElementById("dayList");
    const noTasksMsg = document.getElementById("noTasksMsg");
  
    // Modals
    const editModalEl = document.getElementById("editModal");
    const deleteModalEl = document.getElementById("deleteModal");
    let editModal, deleteModal;
  
    const editTitle = document.getElementById("editTitle");
    const editTime = document.getElementById("editTime");
    const editNote = document.getElementById("editNote");
    const editClearTime = document.getElementById("editClearTime");
    const btnEditSave = document.getElementById("btnEditSave");
    const btnDeleteConfirm = document.getElementById("btnDeleteConfirm");
  
    // ---- Params & State ----
    const params = new URLSearchParams(location.search);
    const dateKey = params.get("date") || UtilsAgenda.todayKey();
  
    let editingId = null;   // modal içinde düzenlenen task id
    let deletingId = null;  // modal içinde silinecek task id
  
    // ---- Helpers ----
    function fromISO(iso){
      const [y,m,d] = iso.split("-").map(Number);
      return new Date(y, m-1, d);
    }
    function isToday(iso){
      return iso === UtilsAgenda.todayKey();
    }
    function isPastDay(iso){
      const d = fromISO(iso), t = new Date();
      d.setHours(0,0,0,0); t.setHours(0,0,0,0);
      return d.getTime() < t.getTime();
    }
    function timeHasPassedToday(hhmm){
      if(!hhmm) return false;
      const [hh,mm] = hhmm.split(":").map(Number);
      const now = new Date();
      const target = new Date();
      target.setHours(hh||0, mm||0, 0, 0);
      return now.getTime() > target.getTime();
    }
    function isOverdue(item){
      // 1) Geçmiş gün ve tamamlanmamış -> overdue
      if(isPastDay(dateKey) && !item.done) return true;
      // 2) Bugün ve saat geçmiş + tamamlanmamış -> overdue
      if(isToday(dateKey) && !item.done && timeHasPassedToday(item.time||"")) return true;
      return false;
    }
  
    function ensureModals(){
      if(!editModal) editModal = new bootstrap.Modal(editModalEl);
      if(!deleteModal) deleteModal = new bootstrap.Modal(deleteModalEl);
    }
  
    // ---- Render Day List ----
    function render(){
      const items = StoreAgenda.listAgenda(dateKey)
        .slice()
        .sort((a,b)=> (a.time||"").localeCompare(b.time||"") || a.title.localeCompare(b.title));
  
      // Header info
      dateLabel.textContent = UtilsAgenda.fmtDateHuman(dateKey);
      const total = items.length;
      const doneCount = items.filter(x=>x.done).length;
      badgeTotal.textContent = `${total} görev`;
      badgeDone.textContent = `${doneCount} tamamlandı`;
      dayStateText.textContent = buildDayStateText(items);
  
      // List
      dayList.innerHTML = "";
      if(!items.length){
        noTasksMsg.classList.remove("d-none");
        return;
      }
      noTasksMsg.classList.add("d-none");
  
      items.forEach(it=>{
        const li = document.createElement("li");
        li.className = "list-group-item task-row";
  
        if(it.done) li.classList.add("completed");
        else if(isOverdue(it)) li.classList.add("overdue");
  
        // Row main
        const rowMain = document.createElement("div");
        rowMain.className = "row-main";
  
        // Toggle check
        const check = document.createElement("i");
        check.className = `fa-regular ${it.done ? "fa-square-check text-success" : "fa-square text-secondary"} toggle-check`;
        check.title = it.done ? "Tamamlandı olarak işaretlendi" : "Tamamlandı olarak işaretle";
        check.addEventListener("click", (e)=>{
          e.stopPropagation();
          StoreAgenda.toggleAgenda(dateKey, it.id);
          render();
        });
  
        // Title + meta
        const titleWrap = document.createElement("div");
        titleWrap.className = "title-wrap";
        const title = document.createElement("div");
        title.className = "task-title";
        title.textContent = it.title;
  
        const meta = document.createElement("div");
        meta.className = "task-meta";
        if(it.time){
          const b = document.createElement("span");
          b.className = "badge-time";
          b.innerHTML = `<i class="fa-regular fa-clock me-1"></i>${it.time}`;
          meta.appendChild(b);
        }
        if(it.note){
          const s = document.createElement("span");
          s.innerHTML = `<i class="fa-regular fa-note-sticky me-1"></i>${escapeHtmlShort(it.note)}`;
          meta.appendChild(s);
        }
  
        titleWrap.appendChild(title);
        titleWrap.appendChild(meta);
  
        // Right tools (edit / delete icons)
        const right = document.createElement("div");
        right.className = "right-tools";
  
        const btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.className = "icon-btn";
        btnEdit.title = "Düzenle";
        btnEdit.innerHTML = `<i class="fa-solid fa-pen-to-square"></i>`;
        btnEdit.addEventListener("click", (e)=>{
          e.stopPropagation();
          openEdit(it);
        });
  
        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "icon-btn";
        btnDel.title = "Sil";
        btnDel.innerHTML = `<i class="fa-solid fa-trash"></i>`;
        btnDel.addEventListener("click", (e)=>{
          e.stopPropagation();
          openDelete(it);
        });
  
        right.appendChild(btnEdit);
        right.appendChild(btnDel);
  
        rowMain.appendChild(check);
        rowMain.appendChild(titleWrap);
        rowMain.appendChild(right);
  
        // Details (accordion-like)
        const details = document.createElement("div");
        details.className = "task-details d-none";
        details.innerHTML = buildDetailsHTML(it);
  
        // Click row to toggle details
        li.addEventListener("click", (e)=>{
          if(e.target.closest(".icon-btn") || e.target.classList.contains("toggle-check")) return;
          details.classList.toggle("d-none");
        });
  
        li.appendChild(rowMain);
        li.appendChild(details);
        dayList.appendChild(li);
      });
    }
  
    function buildDayStateText(items){
      if(!items.length) return "Bugün için görev bulunmuyor.";
      const open = items.filter(x=>!x.done);
      const overdue = open.filter(isOverdue).length;
      if(open.length===0) return "Tüm görevler tamamlandı.";
      if(overdue>0) return `Açık ${open.length} görev var • ${overdue} tanesi geç kalmış.`;
      return `Açık ${open.length} görev var.`;
    }
  
    function buildDetailsHTML(it){
      const arr = [];
      arr.push(`<div><span class="muted">Başlık:</span> ${escapeHtmlShort(it.title)}</div>`);
      arr.push(`<div><span class="muted">Saat:</span> ${it.time ? escapeHtmlShort(it.time) : "-"}</div>`);
      arr.push(`<div><span class="muted">Not:</span> ${it.note ? nl2br(escapeHtml(it.note)) : "-"}</div>`);
      arr.push(`<div><span class="muted">Durum:</span> ${it.done ? "Tamamlandı" : (isOverdue(it) ? "Gecikmiş" : "Açık")}</div>`);
      return arr.join("");
    }
  
    // ---- Edit / Delete ----
    function openEdit(it){
      ensureModals();
      editingId = it.id;
      editTitle.value = it.title || "";
      editTime.value = it.time || "";
      editNote.value = it.note || "";
      editModal.show();
    }
  
    function openDelete(it){
      ensureModals();
      deletingId = it.id;
      deleteModal.show();
    }
  
    btnEditSave.addEventListener("click", ()=>{
      if(!editingId) return;
      const newTitle = (editTitle.value||"").trim();
      const newTime  = (editTime.value||"").trim();
      const newNote  = (editNote.value||"").trim();
      if(!newTitle){
        editTitle.focus();
        return;
      }
      StoreAgenda.updateAgenda(dateKey, editingId, { title:newTitle, time:newTime, note:newNote });
      editingId = null;
      editModal.hide();
      render();
    });
  
    editClearTime.addEventListener("click", ()=>{
      editTime.value = "";
    });
  
    btnDeleteConfirm.addEventListener("click", ()=>{
      if(!deletingId) return;
      StoreAgenda.removeAgenda(dateKey, deletingId);
      deletingId = null;
      deleteModal.hide();
      render();
    });
  
    // ---- Utils (tiny) ----
    function escapeHtml(str){
      return String(str).replace(/[&<>"']/g, s=>({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
      })[s]);
    }
    function escapeHtmlShort(str){
      // kısa alanlar için (başlık vs.)
      return escapeHtml(str);
    }
    function nl2br(str){
      return String(str).replace(/\n/g,"<br>");
    }
  
    // ---- Init ----
    dateLabel.textContent = UtilsAgenda.fmtDateHuman(dateKey);
    render();
  })();
  