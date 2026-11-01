(() => {
  const $ = (id) => document.getElementById(id);
  const themes = [
    {
      id: "white",
      name: "Classic white",
      color: "#fffdf9",
      ink: "#342f2a",
      accent: "#d77d72",
    },
    {
      id: "pink",
      name: "Pastel pink",
      color: "#f8dfe1",
      ink: "#543b40",
      accent: "#b96e7b",
    },
    {
      id: "black",
      name: "Midnight",
      color: "#242323",
      ink: "#fff8ed",
      accent: "#d9b58c",
    },
    {
      id: "yellow",
      name: "Vintage yellow",
      color: "#f1dfaa",
      ink: "#51442c",
      accent: "#9d7440",
    },
    {
      id: "film",
      name: "Retro film",
      color: "#e7e0d2",
      ink: "#37342e",
      accent: "#7b6c55",
    },
  ];
  const state = {
    layout: "strip3",
    photos: [],
    theme: "white",
    stream: null,
    facing: "user",
    activeRetake: null,
    step: 1,
  };
  const video = $("video"),
    captureBtn = $("captureBtn"),
    startCamera = $("startCamera");
  const countFor = () => (state.layout === "strip3" ? 3 : 4);
  const labels = {
    1: "Pick your layout",
    2: "Your camera booth",
    3: "Make it yours",
    4: "Your photo strip",
  };
  function setStep(n) {
    state.step = n;
    document.querySelectorAll(".step").forEach((el) => {
      const s = +el.dataset.step;
      el.classList.toggle("active", s === n);
      el.classList.toggle("done", s < n);
    });
    $("stepLabel").textContent = `STEP 0${n} / 04`;
    $("mainTitle").textContent = labels[n];
    $("captureSection").classList.toggle("active", n === 2);
    $("customSection").classList.toggle("active", n === 3);
    $("previewSection").classList.toggle("active", n === 4);
    $("layoutPanel").style.opacity = n === 1 ? "1" : ".75";
    if (n === 4) renderStrip();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function renderThumbs() {
    const box = $("thumbs");
    box.innerHTML = "";
    for (let i = 0; i < countFor(); i++) {
      const wrap = document.createElement("div");
      wrap.className = "thumb" + (state.photos[i] ? " filled" : "");
      if (state.photos[i]) {
        const img = document.createElement("img");
        img.src = state.photos[i];
        wrap.append(img);
      } else wrap.textContent = "Empty";
      const idx = document.createElement("span");
      idx.className = "idx";
      idx.textContent = `${i + 1}`;
      wrap.append(idx);
      if (state.photos[i]) {
        const btn = document.createElement("button");
        btn.className = "retake";
        btn.textContent = "Retake";
        btn.onclick = () => {
          state.activeRetake = i;
          setStep(2);
          captureBtn.disabled = !state.stream;
          $("captureHint").textContent =
            `Retaking photo ${i + 1}. Your other photos will stay saved.`;
        };
        wrap.append(btn);
      }
      box.append(wrap);
    }
    $("photoCount").textContent =
      `${state.photos.filter(Boolean).length} / ${countFor()} saved`;
    $("thumbNote").textContent = state.photos.some(Boolean)
      ? "Tap Retake on a thumbnail to replace only that photo."
      : "Your photos will show up here. Tap a photo's retake button to replace just that shot.";
    $("toCustomize").disabled =
      state.photos.filter(Boolean).length !== countFor();
  }
  function chooseLayout(layout) {
    state.layout = layout;
    state.photos = [];
    state.activeRetake = null;
    document
      .querySelectorAll(".layout-option")
      .forEach((b) =>
        b.classList.toggle("selected", b.dataset.layout === layout),
      );
    renderThumbs();
    $("captureHint").textContent =
      `Take ${countFor()} photos. Each shot has a three-second countdown.`;
  }
  document
    .querySelectorAll(".layout-option")
    .forEach((b) =>
      b.addEventListener("click", () => chooseLayout(b.dataset.layout)),
    );

  async function enableCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Camera access is not available. Use HTTPS or localhost.");
      return;
    }

    try {
      // Stop the previous camera
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
        state.stream = null;
      }

      // Request the selected camera
      try {
        state.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: state.facing },
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
          audio: false,
        });
      } catch (error) {
        // Fallback for browsers that don't support exact facingMode
        state.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: state.facing,
          },
          audio: false,
        });
      }

      video.srcObject = state.stream;

      const mirror = state.facing === "user" ? -1 : 1;

      video.style.setProperty("transform", `scaleX(${mirror})`, "important");
      video.style.setProperty(
        "-webkit-transform",
        `scaleX(${mirror})`,
        "important",
      );

      await video.play();

      video.classList.add("ready");
      $("cameraPlaceholder").classList.add("hidden");
      $("cameraState").textContent = "CAMERA LIVE";
      startCamera.textContent = "Camera ready";

      captureBtn.disabled = false;
      $("switchCamera").disabled = false;
    } catch (err) {
      alert("Couldn't access the camera. " + err.message);
    }
  }

  startCamera.onclick = enableCamera;

  $("switchCamera").onclick = async () => {
    state.facing = state.facing === "user" ? "environment" : "user";

    await enableCamera();
  };

  function beep(freq = 660, duration = 0.12) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      osc.onended = () => ctx.close();
    } catch (e) {}
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function takePhoto() {
    if (!state.stream || video.readyState < 2) return;

    let index = state.activeRetake;

    // Find the first empty photo slot.
    if (index === null || index === undefined) {
      index = -1;

      for (let i = 0; i < countFor(); i++) {
        if (!state.photos[i]) {
          index = i;
          break;
        }
      }
    }

    // Stop if all slots are occupied.
    if (index === -1) {
      $("captureHint").textContent =
        "All photos are filled. Click Retake on a photo to replace it.";
      return;
    }

    captureBtn.disabled = true;
    $("switchCamera").disabled = true;

    const overlay = $("countdown");
    overlay.classList.add("show");

    for (let n = 3; n >= 1; n--) {
      overlay.textContent = n;
      beep(n === 1 ? 880 : 540);
      await wait(850);
    }

    overlay.textContent = "✦";
    beep(1100, 0.22);
    await wait(160);

    const c = document.createElement("canvas");
    c.width = video.videoWidth || 1280;
    c.height = video.videoHeight || 960;

    const ctx = c.getContext("2d");
    ctx.save();

    ctx.drawImage(video, 0, 0, c.width, c.height);

    ctx.restore();

    $("flash").classList.remove("on");
    void $("flash").offsetWidth;
    $("flash").classList.add("on");

    // Save the captured image in the selected slot.
    state.photos[index] = c.toDataURL("image/jpeg", 0.94);

    state.activeRetake = null;

    overlay.classList.remove("show");
    captureBtn.disabled = false;
    $("switchCamera").disabled = false;

    const saved = state.photos.filter(Boolean).length;

    $("captureHint").textContent =
      saved === countFor()
        ? "All photos are ready! Continue to customize your strip."
        : `Photo ${index + 1} saved. ${countFor() - saved} more to go.`;

    renderThumbs();
  }

  captureBtn.onclick = takePhoto;
  $("retakeAll").onclick = () => {
    state.photos = [];
    state.activeRetake = null;
    renderThumbs();
    setStep(2);
    $("captureHint").textContent =
      "All photos cleared. Start again whenever you're ready.";
  };
  $("toCustomize").onclick = () => setStep(3);
  $("backToLayout").onclick = () => setStep(1);
  $("backToCapture").onclick = () => setStep(2);
  $("toPreview").onclick = () => setStep(4);
  $("editAgain").onclick = () => setStep(3);
  function syncTheme(id) {
    state.theme = id;
    document
      .querySelectorAll(".swatch")
      .forEach((el) =>
        el.classList.toggle("selected", el.dataset.theme === id),
      );
  }
  function buildSwatches(target) {
    const box = $(target);
    box.innerHTML = "";
    themes.forEach((t) => {
      const b = document.createElement("button");
      b.className = "swatch";
      b.title = t.name;
      b.dataset.theme = t.id;
      b.style.background = t.color;
      b.onclick = () => syncTheme(t.id);
      box.append(b);
    });
  }
  buildSwatches("swatches");
  buildSwatches("sideSwatches");
  syncTheme("white");
  $("caption").addEventListener(
    "input",
    (e) => ($("sideCaption").value = e.target.value),
  );
  $("sideCaption").addEventListener(
    "input",
    (e) => ($("caption").value = e.target.value),
  );
  $("dateStamp").onchange = (e) => ($("sideDate").checked = e.target.checked);
  $("sideDate").onchange = (e) => ($("dateStamp").checked = e.target.checked);
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  async function renderStrip() {
    const theme = themes.find((t) => t.id === state.theme) || themes[0],
      canvas = $("resultCanvas"),
      ctx = canvas.getContext("2d");
    const grid = state.layout === "grid4",
      cols = grid ? 2 : 1,
      rows = grid ? 2 : countFor();
    const W = grid ? 1400 : 900;
    const photoW = grid ? 620 : 760;
    const photoH = grid ? 827 : 1013;
    const gap = grid ? 34 : 26;
    const pad = grid ? 55 : 60;
    const caption = ($("caption").value || "").trim(),
      date = $("dateStamp").checked
        ? new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "";
    const footer = caption || date ? 130 : 65;
    canvas.width = pad * 2 + cols * photoW + (cols - 1) * gap;
    canvas.height = pad * 2 + rows * photoH + (rows - 1) * gap + footer;
    ctx.fillStyle = theme.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (theme.id === "film") {
      ctx.fillStyle = theme.ink;
      for (let y = 18; y < canvas.height - 18; y += 28) {
        ctx.fillRect(12, y, 13, 13);
        ctx.fillRect(canvas.width - 25, y, 13, 13);
      }
    }
    for (let i = 0; i < countFor(); i++) {
      const col = grid ? i % 2 : 0,
        row = grid ? Math.floor(i / 2) : i;
      const x = pad + col * (photoW + gap),
        y = pad + row * (photoH + gap);
      ctx.fillStyle = theme.id === "black" ? "#45413d" : "#e8dfd5";
      ctx.fillRect(x - 5, y - 5, photoW + 10, photoH + 10);
      try {
        const img = await loadImage(state.photos[i]);
        const scale = Math.max(photoW / img.width, photoH / img.height),
          sw = photoW / scale,
          sh = photoH / scale,
          sx = (img.width - sw) / 2,
          sy = (img.height - sh) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, photoW, photoH);
        ctx.clip();
        ctx.drawImage(img, sx, sy, sw, sh, x, y, photoW, photoH);
        ctx.restore();
      } catch (e) {
        ctx.fillStyle = "#d8cec2";
        ctx.fillRect(x, y, photoW, photoH);
      }
      if (theme.id === "film") {
        ctx.strokeStyle = theme.ink;
        ctx.lineWidth = 5;
        ctx.strokeRect(x + 3, y + 3, photoW - 6, photoH - 6);
      }
    }
    ctx.fillStyle = theme.ink;
    ctx.textAlign = "center";
    if (caption) {
      ctx.font = "600 34px 'DM Sans',sans-serif";
      ctx.fillText(
        caption,
        canvas.width / 2,
        canvas.height - footer / 2 + 5,
        canvas.width - 70,
      );
    }
    if (date) {
      ctx.font = "500 19px 'DM Sans',sans-serif";
      ctx.globalAlpha = 0.72;
      ctx.fillText(date, canvas.width / 2, canvas.height - 23);
      ctx.globalAlpha = 1;
    }
    if (!caption && !date) {
      ctx.font = "600 20px 'DM Sans',sans-serif";
      ctx.globalAlpha = 0.55;
      ctx.fillText("SNAP STUDIO", canvas.width / 2, canvas.height - 25);
      ctx.globalAlpha = 1;
    }
    $("previewWrap").querySelector(".preview-empty")?.classList.add("hidden");
    canvas.classList.remove("hidden");
  }
  $("downloadBtn").onclick = () => {
    const canvas = $("resultCanvas");
    if (!canvas.width) {
      $("downloadStatus").textContent = "Create your preview first.";
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        $("downloadStatus").textContent =
          "Couldn't create the image. Please try again.";
        return;
      }
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `snap-studio-${Date.now()}.png`;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      $("downloadStatus").textContent = "Your photo strip has been saved.";
    }, "image/png");
  };
  renderThumbs();
  window.addEventListener("beforeunload", () =>
    state.stream?.getTracks().forEach((t) => t.stop()),
  );
})();
