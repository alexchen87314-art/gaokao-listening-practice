(() => {
  const exams = window.LISTENING_EXAMS || [];
  const app = document.getElementById("app");
  const state = { page: "library", filter: "全部", exam: null, answers: [], current: 0, submitted: false, speed: 1 };
  const years = [...new Set(exams.map((exam) => exam.year))].sort((a, b) => b.localeCompare(a));
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  function renderLibrary() {
    state.page = "library";
    const visible = state.filter === "全部" ? exams : exams.filter((exam) => exam.year === state.filter);
    app.innerHTML = `
      <section class="hero">
        <p class="eyebrow">REAL EXAM · LISTENING PRACTICE</p>
        <h1>听一套真题，<br>练出考试节奏。</h1>
        <p class="hero-copy">从 2022 至 2026 年的听力真题中任选一套。配套原卷音频与答案，完成 20 题后查看得分和逐题答案。</p>
        <div class="stats" aria-label="练习规则">
          <span class="stat"><strong>20</strong> 道选择题</span>
          <span class="stat"><strong>1.5</strong> 分 / 题</span>
          <span class="stat"><strong>30</strong> 分满分</span>
          <span class="stat">支持手机与平板</span>
        </div>
      </section>
      <section aria-labelledby="library-title">
        <div class="library-head"><h2 id="library-title">选择一套试卷</h2><p>${visible.length} 套可练习</p></div>
        <div class="filters" role="group" aria-label="按年份筛选">
          ${["全部", ...years].map((year) => `<button class="filter ${state.filter === year ? "active" : ""}" data-year="${year}" aria-pressed="${state.filter === year}">${year === "全部" ? "全部年份" : `${year} 年`}</button>`).join("")}
        </div>
        <div class="exam-list">
          ${visible.map((exam) => `
            <article class="exam-card">
              <div class="year-badge">${escapeHtml(exam.year)}</div>
              <div class="exam-info"><h3>${escapeHtml(exam.title.replace(/^20\d{2}年/, ""))}</h3><p>20 题 · 原卷音频 · 答案已配套</p></div>
              <button class="start-button" data-exam="${exam.id}">开始练习</button>
            </article>`).join("") || `<p class="empty">这一年没有试卷。</p>`}
        </div>
      </section>`;
    app.querySelectorAll("[data-year]").forEach((button) => button.addEventListener("click", () => { state.filter = button.dataset.year; renderLibrary(); }));
    app.querySelectorAll("[data-exam]").forEach((button) => button.addEventListener("click", () => startExam(button.dataset.exam)));
    app.focus({ preventScroll: true });
  }

  function startExam(id) {
    state.exam = exams.find((exam) => exam.id === id);
    if (!state.exam) return;
    state.page = "practice";
    state.answers = Array(20).fill(null);
    state.current = 0;
    state.submitted = false;
    state.speed = 1;
    renderPractice();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderPractice() {
    const exam = state.exam;
    const title = exam.title.replace(/^20\d{2}年/, "");
    app.innerHTML = `
      <section class="practice" aria-label="听力练习">
        <button class="back-button" id="back-to-library">←　返回试卷列表</button>
        <div class="test-heading">
          <div><p class="eyebrow">${escapeHtml(exam.year)} 年听力真题</p><h1>${escapeHtml(title)}</h1><p>答完全部 20 题后提交，系统会按每题 1.5 分计分。</p></div>
          <span class="tag">20 题 · 30 分</span>
        </div>
        <section class="audio-card" aria-label="配套听力音频">
          <div class="audio-label"><strong>配套听力音频</strong><span>MP3 · 可暂停、拖动和调速</span></div>
          <audio id="exam-audio" controls preload="metadata" playsinline webkit-playsinline aria-label="${escapeHtml(title)} 听力音频">
            <source src="${escapeHtml(exam.audio)}" type="audio/mpeg">
            你的浏览器暂不支持 MP3 音频，请更新浏览器后重试。
          </audio>
          <div class="audio-tools"><span id="audio-status">建议先完整听一遍，再开始作答。</span><button class="speed-button" id="speed-button" type="button" aria-label="切换播放速度">1.0× 倍速</button></div>
        </section>
        <section aria-label="作答进度">
          <div class="progress-row"><strong id="progress-count">已作答 0 / 20</strong><span>每题 1.5 分</span></div>
          <div class="progress-track" role="progressbar" aria-label="作答进度" aria-valuemin="0" aria-valuemax="20" aria-valuenow="0"><div class="progress-fill"></div></div>
          <nav class="number-grid" id="number-grid" aria-label="跳转题目"></nav>
        </section>
        <div class="result-banner" id="result-banner" role="status">
          <div><h2 id="result-title">练习完成</h2><p id="result-detail"></p></div><div class="score" id="score"></div>
        </div>
        <section class="question-card" id="question-card" aria-live="polite"></section>
        <div class="question-controls">
          <button class="secondary" id="previous-question">上一题</button>
          <button class="primary" id="next-question">下一题</button>
        </div>
        <div class="finish-row">
          <p id="finish-hint">完成所有题目后即可交卷。</p>
          <button class="primary" id="finish-button" disabled>完成并查看分数</button>
        </div>
        <p class="notice">音频来自压缩包原始 MP3。手机或平板播放时，请保持页面打开；若音频没有加载，请检查网络后重试。</p>
      </section>`;

    document.getElementById("back-to-library").addEventListener("click", renderLibrary);
    document.getElementById("previous-question").addEventListener("click", () => showQuestion(state.current - 1));
    document.getElementById("next-question").addEventListener("click", () => showQuestion(state.current + 1));
    document.getElementById("speed-button").addEventListener("click", toggleSpeed);
    document.querySelector(".brand").onclick = (event) => { event.preventDefault(); renderLibrary(); };
    const audio = document.getElementById("exam-audio");
    audio.addEventListener("error", () => { document.getElementById("audio-status").textContent = "音频暂时无法加载；请检查网络连接后重试。"; });
    audio.addEventListener("canplay", () => { document.getElementById("audio-status").textContent = "音频已就绪。"; });
    drawNumberGrid();
    showQuestion(0);
  }

  function drawNumberGrid() {
    const grid = document.getElementById("number-grid");
    grid.innerHTML = state.exam.questions.map((question, index) => {
      let status = state.answers[index] ? "answered" : "";
      if (state.submitted) status = state.answers[index] === state.exam.answers[index] ? "correct" : "incorrect";
      return `<button class="number-button ${status} ${index === state.current ? "current" : ""}" data-question="${index}" aria-label="第 ${index + 1} 题${state.answers[index] ? "，已作答" : "，未作答"}">${index + 1}</button>`;
    }).join("");
    grid.querySelectorAll("[data-question]").forEach((button) => button.addEventListener("click", () => showQuestion(Number(button.dataset.question))));
  }

  function showQuestion(index) {
    if (index < 0 || index > 19) return;
    state.current = index;
    const question = state.exam.questions[index];
    const selected = state.answers[index];
    document.getElementById("question-card").innerHTML = `
      <p class="question-count">QUESTION ${String(index + 1).padStart(2, "0")} / 20</p>
      <h2 class="question-prompt">${escapeHtml(question.prompt)}</h2>
      <div class="options" role="group" aria-label="选择一个答案">
        ${["A", "B", "C"].map((letter) => {
          const correct = state.submitted && state.exam.answers[index] === letter;
          const wrong = state.submitted && selected === letter && !correct;
          const chosen = selected === letter;
          const marker = correct ? "correct-answer" : wrong ? "wrong-answer" : chosen ? "selected" : "";
          return `<button class="option-button ${marker}" data-option="${letter}" aria-pressed="${chosen}" ${state.submitted ? "disabled" : ""}>
            <span class="option-letter">${letter}</span><span>${escapeHtml(question.options[letter])}</span>
          </button>`;
        }).join("")}
      </div>`;
    if (!state.submitted) {
      document.querySelectorAll("[data-option]").forEach((button) => button.addEventListener("click", () => selectOption(button.dataset.option)));
    }
    document.getElementById("previous-question").disabled = index === 0;
    document.getElementById("next-question").disabled = index === 19;
    document.getElementById("next-question").textContent = index === 19 ? "已到最后一题" : "下一题";
    drawNumberGrid();
    updateProgress();
  }

  function selectOption(letter) {
    state.answers[state.current] = letter;
    document.querySelectorAll("[data-option]").forEach((button) => {
      const selected = button.dataset.option === letter;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    drawNumberGrid();
    updateProgress();
  }

  function updateProgress() {
    const completed = state.answers.filter(Boolean).length;
    document.getElementById("progress-count").textContent = state.submitted ? `已完成 20 / 20` : `已作答 ${completed} / 20`;
    document.querySelector("[role=progressbar]").setAttribute("aria-valuenow", completed);
    document.querySelector(".progress-fill").style.width = `${completed * 5}%`;
    const remaining = 20 - completed;
    const finish = document.getElementById("finish-button");
    finish.disabled = state.submitted || remaining > 0;
    finish.textContent = state.submitted ? "重新练习这套" : "完成并查看分数";
    finish.onclick = state.submitted ? () => startExam(state.exam.id) : finishExam;
    document.getElementById("finish-hint").textContent = state.submitted ? "答案已显示，可按题号回看。" : remaining ? `还差 ${remaining} 题未作答。` : "20 题已全部完成，可以交卷。";
  }

  function finishExam() {
    if (state.submitted || state.answers.some((answer) => !answer)) return;
    state.submitted = true;
    const correctCount = state.answers.reduce((count, answer, index) => count + (answer === state.exam.answers[index] ? 1 : 0), 0);
    const score = correctCount * 1.5;
    document.getElementById("result-title").textContent = score >= 24 ? "完成得很稳" : score >= 18 ? "练习已完成" : "这套题可以再听一遍";
    document.getElementById("result-detail").textContent = `答对 ${correctCount} 题，答错 ${20 - correctCount} 题。绿色选项为正确答案。`;
    document.getElementById("score").textContent = `${Number.isInteger(score) ? score : score.toFixed(1)} / 30`;
    document.getElementById("result-banner").classList.add("visible");
    showQuestion(state.current);
    updateProgress();
  }

  function toggleSpeed() {
    const speeds = [1, 1.25, 1.5, 0.75];
    const audio = document.getElementById("exam-audio");
    state.speed = speeds[(speeds.indexOf(state.speed) + 1) % speeds.length];
    audio.playbackRate = state.speed;
    document.getElementById("speed-button").textContent = `${state.speed.toFixed(1)}× 倍速`;
  }

  renderLibrary();
})();
