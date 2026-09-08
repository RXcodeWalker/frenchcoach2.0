import type { ReactNode } from 'react';

interface BaseProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

interface ButtonProps extends BaseProps {
  onClick: () => void;
  href?: undefined;
}

interface AnchorProps extends BaseProps {
  href: string;
  onClick?: undefined;
}

type Props = ButtonProps | AnchorProps;

const PRIMARY_CLASS = 'mk-cta px-7 py-3.5 rounded-full font-semibold text-sm';
const SECONDARY_CLASS =
  'mk-cta-secondary px-7 py-3.5 rounded-full font-semibold text-sm border mk-hairline-strong';

export function CtaButton(props: Props) {
  const variant = props.variant ?? 'primary';
  const className = variant === 'primary' ? PRIMARY_CLASS : SECONDARY_CLASS;

  if ('href' in props && props.href) {
    return (
      <a href={props.href} className={`inline-flex items-center justify-center ${className}`}>
        {props.children}
      </a>
    );
  }

  return (
    <button onClick={props.onClick} className={`inline-flex items-center justify-center ${className}`}>
      {props.children}
    </button>
  );
}
