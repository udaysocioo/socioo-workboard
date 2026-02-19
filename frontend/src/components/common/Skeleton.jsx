import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Skeleton = ({ className, variant = 'default', ...props }) => {
  const baseStyles = "animate-pulse bg-zinc-800/50 rounded-md";
  
  const variants = {
    default: "",
    circle: "rounded-full",
    card: "rounded-xl border border-zinc-800",
    text: "h-4 w-3/4",
    title: "h-8 w-1/2",
  };

  return (
    <div
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  );
};

export default Skeleton;
