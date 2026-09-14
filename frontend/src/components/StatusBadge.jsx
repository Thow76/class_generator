import Icon from "./Icon.jsx";

export default function StatusBadge({ children, icon, tone = "neutral" }) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      {icon ? <Icon>{icon}</Icon> : null}
      {children}
    </span>
  );
}
