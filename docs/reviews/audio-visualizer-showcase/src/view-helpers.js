export function createStatusView(element) {
  return {
    show(message) {
      element.textContent = message;
      element.dataset.visible = "true";
    },
    hide() {
      element.dataset.visible = "false";
    },
  };
}

export function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function renderModes(container, modes, activeMode, onSelect) {
  container.replaceChildren(
    ...Object.entries(modes).map(([id, mode], index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mode-button";
      button.dataset.mode = id;
      button.setAttribute("aria-pressed", String(id === activeMode));

      const number = document.createElement("span");
      number.className = "mode-number";
      number.textContent = `${String(index + 1).padStart(2, "0")} / ${mode.stage}`;

      const label = document.createElement("span");
      label.className = "mode-label";
      label.textContent = mode.title;
      button.replaceChildren(number, label);
      button.addEventListener("click", () => onSelect(id));
      return button;
    }),
  );
}
