type Props = {
  index: string;
  label: string;
  /** two lines; the second is set in italic serif */
  title: [string, string];
  aside?: string;
  id?: string;
};

/** "01 / WORK" + light-sweep hairline + two-line display title. */
export default function SectionHead({ index, label, title, aside, id }: Props) {
  return (
    <div className="mb-14 md:mb-20">
      <div className="mb-8 flex items-center gap-4">
        <span className="label whitespace-nowrap text-ink/80">
          {index} / {label}
        </span>
        <span className="relative h-px flex-1 overflow-hidden">
          <span data-sweep className="absolute inset-0 block bg-ink/15">
            <span className="absolute right-0 top-1/2 h-[3px] w-24 -translate-y-1/2 bg-gradient-to-r from-transparent to-accent blur-[1px]" />
          </span>
        </span>
      </div>
      <div className="grid items-end gap-8 md:grid-cols-12">
        <h2 id={id} className="display text-[clamp(56px,9.5vw,148px)] md:col-span-8">
          <span className="block overflow-hidden pb-[0.04em]">
            <span data-line className="block">{title[0]}</span>
          </span>
          <span className="block overflow-hidden pb-[0.08em]">
            <span data-line className="serif-em block text-[0.92em] leading-[0.95]">{title[1]}</span>
          </span>
        </h2>
        {aside && (
          <p data-reveal className="max-w-sm text-[15px] leading-relaxed text-ink/65 md:col-span-4 md:justify-self-end">
            {aside}
          </p>
        )}
      </div>
    </div>
  );
}
