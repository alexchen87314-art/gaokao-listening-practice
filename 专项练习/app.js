(() => {
  const exams = window.LISTENING_SPECIALS || [];
  const app = document.getElementById("app");
  const state = { mode: "short", year: "全部", answers: {}, open: new Set() };
  const years = [...new Set(exams.map((exam) => exam.year))].sort((a, b) => b.localeCompare(a));
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const answerKey = (examId, number) => `${examId}-${number}`;

  function render() {
    const visible = state.year === "全部" ? exams : exams.filter((exam) => exam.year === state.year);
    const modeLabel = state.mode === "short" ? "短对话" : "长材料";
    app.innerHTML = `
      <section class="hero">
        <p class="eyebrow">2022—2026 · LISTENING FOCUS</p>
        <h1>把短对话和长材料，<br>分开练熟。</h1>
        <p class="hero-copy">按原卷整理了 14 套听力题。短对话集中练第 1–5 题；长材料按听力稿中的段落分组，组内保留对应的全部题目。选项作答后会立即显示正误和正确答案，不计分。</p>
        <div class="mode-tabs" role="group" aria-label="选择练习部分">
          <button class="mode-tab ${state.mode === "short" ? "active" : ""}" data-mode="short" aria-pressed="${state.mode === "short"}">短对话 · 每段 1 题</button>
          <button class="mode-tab ${state.mode === "long" ? "active" : ""}" data-mode="long" aria-pressed="${state.mode === "long"}">长材料 · 按原卷分组</button>
        </div>
        <div class="toolbar">
          <div class="field"><label for="year-filter">年份</label><select id="year-filter"><option value="全部">全部年份</option>${years.map((year) => `<option value="${year}" ${state.year === year ? "selected" : ""}>${year} 年</option>`).join("")}</select></div>
          <div class="field"><label for="paper-filter">试卷</label><select id="paper-filter"><option value="全部">全部试卷</option>${visible.map((exam) => `<option value="${exam.id}">${escapeHtml(exam.title)}</option>`).join("")}</select></div>
        </div>
      </section>
      <section aria-labelledby="list-title">
        <div class="list-title"><h2 id="list-title">${modeLabel}练习</h2><p>${visible.length} 套试卷 · ${visible.length * 5}${state.mode === "short" ? " 道题" : " 段材料"}</p></div>
        <div class="exam-list">${visible.map(renderExam).join("") || `<p class="empty">这一年没有试卷。</p>`}</div>
      </section>`;

    app.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { state.mode = button.dataset.mode; render(); }));
    document.getElementById("year-filter").addEventListener("change", (event) => { state.year = event.target.value; render(); });
    document.getElementById("paper-filter").addEventListener("change", (event) => {
      const selected = event.target.value;
      if (selected === "全部") state.open.clear();
      else state.open = new Set([selected]);
      render();
      if (selected !== "全部") document.querySelector(`[data-exam-id="${selected}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    app.querySelectorAll("details[data-exam-id]").forEach((details) => {
      details.open = state.open.has(details.dataset.examId);
      details.addEventListener("toggle", () => {
        if (details.open) state.open.add(details.dataset.examId);
        else state.open.delete(details.dataset.examId);
      });
    });
    app.querySelectorAll("audio").forEach((audio) => {
      const examId = audio.dataset.examId;
      const loop = app.querySelector(`[data-loop="${examId}"]`);
      const speed = app.querySelector(`[data-speed="${examId}"]`);
      loop.addEventListener("change", () => { audio.loop = loop.checked; });
      speed.addEventListener("change", () => { audio.playbackRate = Number(speed.value); });
      audio.addEventListener("error", () => {
        const status = app.querySelector(`[data-audio-status="${examId}"]`);
        if (status) status.textContent = "音频加载失败，请检查网络连接后重试。";
      });
      audio.addEventListener("canplay", () => {
        const status = app.querySelector(`[data-audio-status="${examId}"]`);
        if (status) status.textContent = "音频已就绪。";
      });
    });
    app.querySelectorAll("[data-option]").forEach((button) => button.addEventListener("click", () => choose(button)));
    restoreAnswers();
  }

  function renderExam(exam) {
    const shortCount = exam.shortDialogues.length;
    const materialCount = exam.longMaterials.length;
    const rows = state.mode === "short"
      ? `<div class="short-list">${exam.shortDialogues.map((item) => `<section class="short-item"><p class="short-label">短对话 ${item.number}</p>${renderQuestion(exam, item.question)}</section>`).join("")}</div>`
      : exam.longMaterials.map((material) => `
          <section class="material" aria-labelledby="${exam.id}-material-${material.number}">
            <div class="material-heading"><h3 id="${exam.id}-material-${material.number}">第 ${material.number} 段材料</h3><span>第 ${material.firstQuestion}–${material.lastQuestion} 题 · ${material.questions.length} 题</span></div>
            ${material.questions.map((question) => renderQuestion(exam, question)).join("")}
          </section>`).join("");
    const countLabel = state.mode === "short" ? `${shortCount} 个短对话 · 5 题` : `${materialCount} 段长材料 · ${exam.longMaterials.reduce((sum, item) => sum + item.questions.length, 0)} 题`;
    return `
      <details class="exam" data-exam-id="${exam.id}">
        <summary><span class="year-badge">${exam.year}</span><span class="exam-title"><strong>${escapeHtml(exam.title)}</strong><span>${countLabel}</span></span></summary>
        <div class="exam-content">
          <section class="audio-card" aria-label="${escapeHtml(exam.title)} 原卷音频">
            <div class="audio-heading"><strong>配套听力音频</strong><span>MP3 · 可重复播放与调速</span></div>
            <audio controls preload="none" playsinline webkit-playsinline data-exam-id="${exam.id}" aria-label="${escapeHtml(exam.title)} 听力音频">
              <source src="${escapeHtml(exam.audio)}" type="audio/mpeg">
              你的浏览器暂不支持 MP3 音频。
            </audio>
            <div class="audio-options">
              <label><input type="checkbox" data-loop="${exam.id}"> 循环播放</label>
              <label for="speed-${exam.id}">倍速</label>
              <select class="speed-control" id="speed-${exam.id}" data-speed="${exam.id}" aria-label="播放速度">
                <option value="0.75">0.75×</option><option value="1" selected>1.0×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option>
              </select>
              <span data-audio-status="${exam.id}" aria-live="polite">音频尚未加载。</span>
            </div>
            <p class="source-note">此套在压缩包中提供的是整套 MP3，播放器暂按整卷播放；每题和材料分组已按 Word 题目整理。播放时可拖动进度、循环和调速。</p>
          </section>
          ${rows}
        </div>
      </details>`;
  }

  function renderQuestion(exam, question) {
    const selected = state.answers[answerKey(exam.id, question.number)];
    const correct = exam.answers[question.number - 1];
    const feedback = selected ? selected === correct ? `回答正确，答案是 ${correct}。` : `正确答案是 ${correct}。` : "选一个答案查看正误。";
    const feedbackClass = selected ? selected === correct ? "is-correct" : "is-wrong" : "";
    return `
      <article class="question" data-question-card="${exam.id}-${question.number}">
        <div class="question-head"><span class="q-number">${question.number}</span><h4 class="prompt">${escapeHtml(question.prompt)}</h4></div>
        <div class="options" role="group" aria-label="第 ${question.number} 题选项">
          ${["A", "B", "C"].map((letter) => {
            const chosen = selected === letter;
            const reveal = Boolean(selected);
            const className = `${chosen ? "selected" : ""} ${reveal && letter === correct ? "correct" : ""} ${chosen && letter !== correct ? "wrong" : ""}`.trim();
            return `<button type="button" class="option ${className}" data-option="${letter}" data-exam="${exam.id}" data-question="${question.number}" aria-pressed="${chosen}"><span class="option-letter">${letter}</span><span>${escapeHtml(question.options[letter])}</span></button>`;
          }).join("")}
        </div>
        <p class="feedback ${feedbackClass}" data-feedback="${exam.id}-${question.number}" role="status">${feedback}</p>
      </article>`;
  }

  function choose(button) {
    const { exam: examId, question: number, option } = button.dataset;
    state.answers[answerKey(examId, number)] = option;
    const exam = exams.find((item) => item.id === examId);
    const correct = exam.answers[Number(number) - 1];
    const card = app.querySelector(`[data-question-card="${examId}-${number}"]`);
    card.querySelectorAll("[data-option]").forEach((optionButton) => {
      const isChosen = optionButton.dataset.option === option;
      const isCorrect = optionButton.dataset.option === correct;
      optionButton.classList.toggle("selected", isChosen);
      optionButton.classList.toggle("correct", isCorrect);
      optionButton.classList.toggle("wrong", isChosen && !isCorrect);
      optionButton.setAttribute("aria-pressed", String(isChosen));
    });
    const feedback = card.querySelector("[data-feedback]");
    feedback.className = `feedback ${option === correct ? "is-correct" : "is-wrong"}`;
    feedback.textContent = option === correct ? `回答正确，答案是 ${correct}。` : `正确答案是 ${correct}。`;
  }

  function restoreAnswers() {
    app.querySelectorAll("[data-option]").forEach((button) => {
      if (state.answers[answerKey(button.dataset.exam, button.dataset.question)] === button.dataset.option) {
        const exam = exams.find((item) => item.id === button.dataset.exam);
        choose(button);
      }
    });
  }

  app.addEventListener("toggle", (event) => {
    const details = event.target;
    if (details.matches?.("details[data-exam-id]")) {
      if (details.open) state.open.add(details.dataset.examId);
      else state.open.delete(details.dataset.examId);
    }
  }, true);

  render();
})();
