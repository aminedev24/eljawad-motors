import React from 'react';
import Link from 'next/link';

const VARIANT_CLASSES = {
  primary: 'bg-brand-navy text-white hover:bg-brand-navy-dark',
  accent: 'bg-brand-orange text-white hover:bg-brand-orange-hover',
  outline: 'border border-brand-navy text-brand-navy bg-transparent hover:bg-brand-navy hover:text-white',
};

const Button = ({ variant = 'primary', href, className = '', children, ...props }) => {
  const classes = `font-display inline-block px-8 py-3 font-bold text-center uppercase text-sm tracking-wide transition-colors duration-200 ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary} ${className}`;

  if (href && /^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...props}>
        {children}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};

export default Button;
