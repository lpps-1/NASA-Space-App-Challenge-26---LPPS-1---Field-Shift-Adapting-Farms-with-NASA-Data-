export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="rise-in mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="kisan-label">{eyebrow}</p>}
        <h1 className="mt-1.5 font-display text-[24px] leading-tight tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  );
}
