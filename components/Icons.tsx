// Social icons from public/icons/*.png, applied as CSS masks so they
// render in currentColor (and invert on hover like the old SVGs).
import { asset } from "@/lib/asset";

const files: Record<string, string> = {
  instagram: "/icons/instagram.png",
  x: "/icons/x.png",
  linkedin: "/icons/linkedin.png",
  email: "/icons/mail.png",
};

export function Icon({ type }: { type: "instagram" | "x" | "linkedin" | "email" }) {
  const url = `url(${asset(files[type])})`;
  return (
    <span
      className="icon-mask"
      style={{ WebkitMaskImage: url, maskImage: url }}
      aria-hidden
    />
  );
}
