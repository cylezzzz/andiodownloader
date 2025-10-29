(() => {
  const $ = (id) => document.getElementById(id);
  const hasAPI =
    typeof window !== "undefined" &&
    window.api &&
    typeof window.api.invoke === "function";

  /* =========================================================
   * Tabs
   * ======================================================= */
  const tabDownloads = $("tabDownloads");
  const tabWizard = $("tabWizard");
  const pageDownloads = $("pageDownloads");
  const pageWizard = $("pageWizard");

  function setTab(which) {
    tabDownloads.classList.toggle("active", which === "dl");
    tabWizard.classList.toggle("active", which === "wiz");
    pageDownloads.classList.toggle("hidden", which !== "dl");
    pageWizard.classList.toggle("hidden", which !== "wiz");
  }
  tabDownloads.onclick = () => setTab("dl");
  tabWizard.onclick = () => setTab("wiz");
  setTab("dl");

  /* =========================================================
   * GLOBAL STATUS MONITOR
   * ======================================================= */
  const STATUS = {
    downloads: { dot: $("stDownload"), text: $("stDownloadText") },
    wizard: { dot: $("stWizard"), text: $("stWizardText") },
    model: { dot: $("stModel"), text: $("stModelText") },
  };

  function setStatus(section, state, msg) {
    const el = STATUS[section];
    if (!el) return;
    const cls = { ok: "ok", warn: "warn", err: "err", idle: "idle" }[state] || "idle";
    el.dot.className = `dot ${cls}`;
    el.text.textContent = msg;
  }

  // Anfangsstatus
  setStatus("downloads", "idle", "Downloads inaktiv");
  setStatus("wizard", "idle", "Wizard inaktiv");
  setStatus("model", "idle", "Modell inaktiv");

  /* =========================================================
   * DOWNLOADS
   * ======================================================= */
  const linksEl = $("links"),
    chooseBtn = $("choose"),
    outDirEl = $("outDir"),
    btnStart = $("btnStart"),
    btnAbortAll = $("btnAbortAll"),
    queueBody = $("queueBody"),
    downloadStatus = $("downloadStatus");

  const logChat = (txt) => {
    const out = $("chatOut");
    out.textContent += txt + "\n";
    out.scrollTop = out.scrollHeight;
  };

  function fmtBytes(n) {
    if (!n) return "0 B";
    const u = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(1)} ${u[i]}`;
  }

  chooseBtn.onclick = async () => {
    const res = hasAPI
      ? await window.api.invoke("downloads:chooseDir")
      : { path: "C:\\Downloads" };
    if (res?.path) outDirEl.value = res.path;
  };

  function createRows(links) {
    queueBody.innerHTML = "";
    links.forEach((u, i) => {
      const name = (u.split("/").pop() || u).split("?")[0];
      queueBody.insertAdjacentHTML(
        "beforeend",
        `<tr id="row-${i}">
          <td>${i + 1}</td>
          <td>${name}</td>
          <td id="size-${i}">–</td>
          <td id="speed-${i}">–</td>
          <td><div class="progress"><div class="bar" id="bar-${i}"></div></div></td>
        </tr>`
      );
    });
  }

  btnStart.onclick = async () => {
    const links = linksEl.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!links.length) return logChat("⚠️ Keine Links angegeben.");
    const outDir = outDirEl.value.trim();
    if (!outDir) return logChat("⚠️ Kein Zielordner.");

    createRows(links);
    setStatus("downloads", "warn", "Downloads aktiv");
    downloadStatus.textContent = "Status: läuft…";
    logChat(`⬇️ Starte ${links.length} Downloads …`);

    if (hasAPI) {
      window.api.on("downloads:state", (s) => {
        const bar = $("bar-" + s.i),
          size = $("size-" + s.i),
          speed = $("speed-" + s.i);
        if (bar) bar.style.width = `${s.pct || 0}%`;
        if (size)
          size.textContent = s.total
            ? `${fmtBytes(s.done)} / ${fmtBytes(s.total)}`
            : fmtBytes(s.done);
        if (speed)
          speed.textContent = s.speed ? `${fmtBytes(s.speed)}/s` : "–";
      });
      await window.api.invoke("downloads:start", { links, outDir });
      setStatus("downloads", "ok", "Downloads abgeschlossen");
      downloadStatus.textContent = "Status: abgeschlossen";
      logChat("✅ Downloads beendet.");
    } else {
      // Demo
      for (let i = 0; i < links.length; i++) {
        const bar = $("bar-" + i);
        for (let p = 0; p <= 100; p += 20) {
          if (bar) bar.style.width = `${p}%`;
          await new Promise((r) => setTimeout(r, 150));
        }
      }
      setStatus("downloads", "ok", "Downloads abgeschlossen");
      downloadStatus.textContent = "Status: abgeschlossen (Demo)";
    }
  };

  btnAbortAll.onclick = async () => {
    setStatus("downloads", "err", "Downloads abgebrochen");
    downloadStatus.textContent = "Status: abgebrochen";
    if (hasAPI) await window.api.invoke("downloads:abortAll");
  };

  /* =========================================================
   * WIZARD (Datei-Erstellung)
   * ======================================================= */
  const wizardOutDir = $("wizardOutDir"),
    wizardChoose = $("wizardChoose"),
    wizardStart = $("wizardStart"),
    wizardSend = $("wizardSend"),
    wizardInput = $("wizardInput"),
    wizardOut = $("wizardOut"),
    wizardStatus = $("wizardStatus");

  wizardChoose.onclick = async () => {
    const res = hasAPI
      ? await window.api.invoke("downloads:chooseDir")
      : { path: "C:\\AndioAddons" };
    if (res?.path) wizardOutDir.value = res.path;
  };

  const wizLog = (txt) => {
    wizardOut.textContent += txt + "\n";
    wizardOut.scrollTop = wizardOut.scrollHeight;
  };

  let wizActive = false;
  wizardStart.onclick = () => {
    wizActive = true;
    wizLog("Wizard gestartet. Beschreibe dein Addon …");
    wizardStatus.textContent = "Status: aktiv";
    setStatus("wizard", "warn", "Wizard aktiv");
  };

  wizardSend.onclick = async () => {
    const msg = wizardInput.value.trim();
    if (!msg) return;
    wizardInput.value = "";
    wizLog("Du: " + msg);
    if (!wizActive) {
      wizLog("Bitte zuerst Wizard starten.");
      return;
    }
    const outDir = wizardOutDir.value.trim() || ".";
    const filename = `addon_${Date.now()}.js`;
    const content = `// Auto-generiert\nconsole.log('${msg}');`;
    if (hasAPI) {
      const res = await window.api.invoke("agent:createFile", {
        dir: outDir,
        name: filename,
        content,
      });
      if (res?.ok) {
        wizLog(`✅ Datei gespeichert unter: ${res.path}`);
        wizardStatus.textContent = "Status: abgeschlossen";
        setStatus("wizard", "ok", "Wizard abgeschlossen");
      } else {
        wizLog("❌ Fehler: " + res?.error);
        setStatus("wizard", "err", "Wizard Fehler");
      }
    } else {
      wizLog(`(Demo) Datei würde in ${outDir}\\${filename} gespeichert.`);
      wizardStatus.textContent = "Status: abgeschlossen (Demo)";
      setStatus("wizard", "ok", "Wizard abgeschlossen");
    }
  };

  /* =========================================================
   * CHAT / MODEL-STATUS
   * ======================================================= */
  const chatOut = $("chatOut"),
    chatInput = $("chatInput"),
    chatSend = $("chatSend");

  const pushChat = (who, msg) => {
    chatOut.textContent += `${who}: ${msg}\n`;
    chatOut.scrollTop = chatOut.scrollHeight;
  };

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatSend.click();
    }
  });

  chatSend.onclick = async () => {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    pushChat("Du", text);
    setStatus("model", "warn", "Modell arbeitet");
    try {
      const reply = hasAPI
        ? await window.api.invoke("chat:ask", {
            model: "mistral7b",
            prompt: text,
          })
        : `Echo: ${text}`;
      pushChat("Bot", reply);
      setStatus("model", "ok", "Modell bereit");
    } catch (e) {
      pushChat("Fehler", e.message || String(e));
      setStatus("model", "err", "Modellfehler");
    }
  };
})();
