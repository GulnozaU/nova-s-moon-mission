import { GLOSSARY } from "../content/glossary";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function GlossaryDrawer({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-label="Space words"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>Space words</h2>
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="muted">Tap a word in the game anytime to see it again.</p>
        <ul>
          {GLOSSARY.map((g) => (
            <li key={g.id}>
              <img src={g.pictureSrc} alt="" className="drawer-pic" />
              <div>
                <strong>{g.term}</strong>
                <p>{g.definition}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
