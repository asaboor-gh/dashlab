export default {
    render({ model, el }) {
    let isVert = model.get("vertical");
    let n_steps = model.get("nsteps");
    el.classList.add('steps-widget', 'steps-slider', isVert ? 'vertical' : 'horizontal');

    el.innerHTML = `
        <div class="steps-body">
            <div class="slider-group">
            <div class="slider-container">
                <div class="widget-readout" role="button" tabindex="0" aria-label="Toggle play or pause" title="Toggle play or pause">1</div>
                <div class="steps-track"></div>
            </div>
            </div>
        </div>
    `;

    const trackDiv = el.querySelector(':scope .steps-track');
    const badgeVal = el.querySelector(':scope .widget-readout');
    let priorFocusedEl = null;

    function applyTrackMaxHeight() {
        const rawHeight = Number(model.get("height"));
        if (!Number.isFinite(rawHeight)) return;
        const trackMax = Math.max(0, rawHeight - 36);
        el.style.setProperty("--step-track-max", `${trackMax}px`);
    }

    let dotsHtml = "";
    for (let i = 1; i <= n_steps; i++) {
        dotsHtml += `<div class="step-dot-item" data-dot="${i}"></div>`;
    }
    trackDiv.innerHTML = dotsHtml;
    let dotItems = trackDiv.querySelectorAll('.step-dot-item');

    let timer = null;

    function updateView(val) {
        const clamped = Math.max(1, Math.min(n_steps, val));
        if (badgeVal) badgeVal.textContent = clamped;
        const activeStep = Number(clamped);

        dotItems.forEach(dot => {
        const dotStep = Number(dot.dataset.dot);
        const isActive = dotStep === activeStep;
        const isPrev = dotStep === activeStep - 1;
        const isNext = dotStep === activeStep + 1;
        dot.classList.toggle('active-dot', isActive);
        dot.classList.toggle('prev-dot', isPrev);
        dot.classList.toggle('next-dot', isNext);
        });
    }

    function stopPlayback() {
        if (timer) {
        clearInterval(timer);
        timer = null;
        }
        el.classList.remove('is-playing');
        model.set("playing", false);
        model.save_changes();
    }

    function startPlayback() {
        let intervalMs = model.get("interval") || 1500;
        el.classList.add('is-playing');
        model.set("playing", true);
        model.save_changes();

        timer = setInterval(() => {
        let next = model.get("value") + 1;
        if (next > n_steps) {
            stopPlayback();
            return;
        }
        model.set("value", next);
        model.save_changes();
        }, intervalMs);
    }

    function handlePointerMove(clientCoord) {
        stopPlayback();
        const rect = trackDiv.getBoundingClientRect();
        let pct = 0;
        if (!isVert) {
        const offsetX = clientCoord - rect.left;
        pct = Math.max(0, Math.min(1, offsetX / rect.width));
        } else {
        const offsetY = clientCoord - rect.top;
        pct = Math.max(0, Math.min(1, offsetY / rect.height));
        }
        const rawStep = Math.round(pct * (n_steps - 1)) + 1;
        model.set("value", rawStep);
        model.save_changes();
    }

    function setStepFromDotTarget(target) {
        const dotEl = target instanceof Element ? target.closest('.step-dot-item') : null;
        if (!dotEl || !trackDiv.contains(dotEl)) return false;

        const dotStep = Number(dotEl.dataset.dot);
        if (!Number.isFinite(dotStep)) return false;

        stopPlayback();
        model.set("value", dotStep);
        model.save_changes();
        return true;
    }

    const onPointerDown = (e) => {
        trackDiv.setPointerCapture(e.pointerId);
        if (!setStepFromDotTarget(e.target)) {
            handlePointerMove(!isVert ? e.clientX : e.clientY);
        }
    };

    const onPointerMove = (e) => {
        if (e.buttons > 0) {
        handlePointerMove(!isVert ? e.clientX : e.clientY);
        }
    };

    trackDiv.addEventListener('pointerdown', onPointerDown);
    trackDiv.addEventListener('pointermove', onPointerMove);

    const onReadoutActivate = () => {
        if (model.get("playing")) {
        stopPlayback();
        } else {
        if (model.get("value") >= n_steps) {
            model.set("value", 1);
        }
        startPlayback();
        }
    };

    const onWidgetMouseEnter = () => {
        const active = document.activeElement;
        priorFocusedEl = active instanceof HTMLElement ? active : null;
    };

    const onWidgetMouseLeave = () => {
        if (!priorFocusedEl || !priorFocusedEl.isConnected) return;
        if (el.contains(priorFocusedEl)) return;
        priorFocusedEl.focus({ preventScroll: true });
    };

    el.addEventListener('mouseenter', onWidgetMouseEnter);
    el.addEventListener('mouseleave', onWidgetMouseLeave);

    if (badgeVal) {
        badgeVal.addEventListener('click', onReadoutActivate);
    }

    const handleValChange = () => updateView(model.get("value"));
    const handlePlayingChange = () => {
        if (!model.get("playing") && timer) stopPlayback();
    };
    const handleNStepsChange = () => {
        let new_n = Math.max(1, Number(model.get("nsteps")) || 1);
        n_steps = new_n;
        let newDotsHtml = "";
        for (let i = 1; i <= new_n; i++) {
        newDotsHtml += `<div class="step-dot-item" data-dot="${i}"></div>`;
        }
        trackDiv.innerHTML = newDotsHtml;
        dotItems = trackDiv.querySelectorAll('.step-dot-item');
        updateView(model.get("value"));
    };
    const handleHeightChange = () => applyTrackMaxHeight();

    model.on("change:value", handleValChange);
    model.on("change:playing", handlePlayingChange);
    model.on("change:nsteps", handleNStepsChange);
    model.on("change:height", handleHeightChange);

    applyTrackMaxHeight();
    updateView(model.get("value"));

    return () => {
        stopPlayback();
        el.removeEventListener('mouseenter', onWidgetMouseEnter);
        el.removeEventListener('mouseleave', onWidgetMouseLeave);
        trackDiv.removeEventListener('pointerdown', onPointerDown);
        trackDiv.removeEventListener('pointermove', onPointerMove);
        if (badgeVal) {
        badgeVal.removeEventListener('click', onReadoutActivate);
        }
        model.off("change:value", handleValChange);
        model.off("change:playing", handlePlayingChange);
        model.off("change:nsteps", handleNStepsChange);
        model.off("change:height", handleHeightChange);
    };
    }
};
