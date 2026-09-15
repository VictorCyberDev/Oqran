interface BackHeaderProps {
  title: string;
  onBack?: () => void;
  href?: string;
}

export function BackHeader({ title, onBack, href }: BackHeaderProps) {
  const content = (
    <span className="cursor-pointer bg-transparent p-0 text-2xl font-semibold leading-none text-text-primary">
      ‹
    </span>
  );

  return (
    <div className="flex items-center gap-3">
      {href ? (
        <a href={href} aria-label="Back">
          {content}
        </a>
      ) : (
        <button type="button" onClick={onBack} aria-label="Back">
          {content}
        </button>
      )}
      <h1 className="text-xl font-bold text-text-primary">{title}</h1>
    </div>
  );
}
