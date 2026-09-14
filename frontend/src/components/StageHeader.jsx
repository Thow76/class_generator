export default function StageHeader({ step, title, children, action }) {
  return (
    <header className="stage-header">
      <span className="eyebrow">{step}</span>
      <div className="stage-header__title-row">
        <h1>{title}</h1>
        {action}
      </div>
      {children ? <p>{children}</p> : null}
    </header>
  );
}
