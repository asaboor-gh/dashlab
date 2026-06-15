export function render({ model, el }) {
    el.style.margin = "4px 0";
    
    // Neutral Container Layout (Adapts dynamically to Light/Dark notebook themes)
    const container = document.createElement("div");
    container.style.padding = "6px 12px";
    container.style.border = "1px solid rgba(128, 128, 128, 0.2)";
    container.style.borderRadius = "4px";
    container.style.fontFamily = "monospace";
    container.style.fontSize = "12px";
    
    // Text Information Grid
    const infoDiv = document.createElement("div");
    infoDiv.style.display = "flex";
    infoDiv.style.gap = "8px";
    infoDiv.style.flexWrap = "wrap";
    infoDiv.style.opacity = "0.8";
    
    const statusSpan = document.createElement("span");
    statusSpan.style.fontWeight = "bold";
    
    const pathSpan = document.createElement("span");
    
    infoDiv.appendChild(statusSpan);
    infoDiv.appendChild(pathSpan);
    container.appendChild(infoDiv);
    
    // Minimal Neutral Action Toggle Button
    const btn = document.createElement("button");
    btn.style.background = "transparent";
    btn.style.border = "1px solid rgba(128, 128, 128, 0.4)";
    btn.style.color = "currentColor";
    btn.style.borderRadius = "3px";
    btn.style.padding = "2px 8px";
    btn.style.marginTop = "8px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "11px";
    btn.style.fontFamily = "monospace";
    container.appendChild(btn);
    el.appendChild(container);

    function updateUI() {
        const meta = model.get("_ping") || {};
        const isRunning = model.get("running");
        
        // Extract and display only the direct file name, removing absolute root paths
        pathSpan.innerHTML = `
            ${meta.exists === false ? '⛓️‍💥 <span style="color: rgba(240, 0, 22, 0.7);">[not found]</span>' : '🔗'} 
            ${meta.path ? meta.path : '—'} 
            🕝 ${meta.mtime || '—'}`;
        if (isRunning) {
            statusSpan.textContent = "[● Watcher Active]";
            statusSpan.style.color = "inherit";
            btn.textContent = "Stop";
        } else {
            statusSpan.textContent = "[○ Watcher Halted]";
            statusSpan.style.color = "rgba(128, 128, 128, 0.5)";
            btn.textContent = "Start";
        }
    }
    updateUI();
    // Sync local changes smoothly across UI updates
    model.on("change:_ping change:running", updateUI);
    // Core Interaction Hook: Flips the shared running traitlet down the wire
    btn.addEventListener("click", () => {
        model.set("running", !model.get("running"));
        model.save_changes();
    });
    // 1-Bit Execution Handshake Reflector
    model.on("change:_ping", () => {
        model.set("_pong", !model.get("_pong"));
        model.save_changes();
    });
}