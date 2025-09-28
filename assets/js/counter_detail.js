(function(){
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
  
    const titleEl = document.getElementById("taskTitle");
    const nameEl = document.getElementById("taskName");
    const minEl = document.getElementById("taskMin");
    const todayEl = document.getElementById("todayCount");
    const btnBig = document.getElementById("btnBig");
    const hundredsInfo = document.getElementById("hundredsInfo");
    const btnMinus = document.getElementById("btnMinus");
    const btnReset = document.getElementById("btnReset");
  
    function loadTask(){
      const task = Store.getTask(id);
      if(!task){
        alert("Görev bulunamadı");
        location.href = "counter.html";
        return;
      }
      titleEl.innerHTML = `<i class="fa-solid fa-stopwatch me-2"></i>${task.name}`;
      nameEl.textContent = task.name;
      minEl.textContent = task.min || "-";
      updateUI();
    }
  
    function updateUI(){
      const total = Store.getTodayCount(id);
      const hundreds = Math.floor(total / 100);
      const remainder = total % 100;
  
      btnBig.textContent = remainder;
      hundredsInfo.textContent = `${hundreds} × 100 + ${remainder}`;
      todayEl.textContent = total;
    }
  
    function inc(delta){
      let total = Store.getTodayCount(id) + delta;
      if(total < 0) total = 0;
      Store.setTodayCount(id, total);
      updateUI();
    }
  
    // eventler
    btnBig.addEventListener("click", ()=> inc(1));
    btnMinus.addEventListener("click", ()=> inc(-1));
    btnReset.addEventListener("click", ()=>{
      if(confirm("Bugünkü değeri sıfırlamak istiyor musun?")){
        Store.setTodayCount(id, 0);
        updateUI();
      }
    });
  
    loadTask();
  })();
  