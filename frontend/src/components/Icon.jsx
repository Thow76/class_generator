export default function Icon({ children, className = "", filled = false }) {
  const fillClass = filled ? " icon-filled" : "";
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-rounded${fillClass} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
