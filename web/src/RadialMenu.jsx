function polarPosition(index, total, radius) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  return {
    left: `${50 + Math.cos(angle) * radius}%`,
    top: `${50 + Math.sin(angle) * radius}%`,
  };
}

function MenuOption({ item, index, total, ring, selected, onSelect }) {
  const style = {
    ...polarPosition(index, total, ring === "outer" ? 39 : 25),
    ...(item.hex ? { "--option-color": item.hex } : {}),
  };

  return (
    <button
      type="button"
      className={`radial-option radial-option-${ring} ${item.hex ? "radial-option-color" : ""} ${selected ? "radial-option-selected" : ""}`}
      style={style}
      title={item.label}
      aria-label={item.label}
      onClick={() => onSelect(item)}
    >
      {item.hex ? <span className="radial-color-dot" /> : <span className="radial-option-emoji">{item.emoji}</span>}
      <span>{item.label}</span>
    </button>
  );
}

export function RadialMenu({ menu, preview, onSelect, onCancel }) {
  const config = {
    colors: { button: "L2", title: "Colors" },
    effects: { button: "L1", title: "Effects" },
    beeps: { button: "R1", title: "Beeps" },
    sounds: { button: "R2", title: "Sounds" },
  }[menu.kind];
  const selectedLabel = menu.selected?.label ?? "Move the right stick";

  return (
    <div className="radial-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className={`radial-menu radial-menu-${menu.kind}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${config.title} wheel`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="radial-menu-heading">
          <span>{config.button}</span>
          <h2>{config.title}</h2>
        </div>

        <div className="radial-wheel">
          {menu.items.map((item, index) => (
            <MenuOption
              key={item.id}
              item={item}
              index={index}
              total={menu.items.length}
              ring="outer"
              selected={menu.selected?.id === item.id}
              onSelect={onSelect}
            />
          ))}

          <div className="radial-menu-center">
            <span className="radial-menu-center-kicker">SELECTED</span>
            <b>{selectedLabel}</b>
            <small>right stick selects</small>
          </div>
        </div>

        <p className="radial-menu-help">
          Hold {config.button} · release to confirm · right button cancels
        </p>
        {preview && (
          <p className="radial-preview-note">
            Preview only — the train is not connected, so no command will be sent.
          </p>
        )}
        <button type="button" className="radial-cancel" onClick={onCancel}>Cancel</button>
      </section>
    </div>
  );
}
