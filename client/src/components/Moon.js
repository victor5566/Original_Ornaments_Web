
export default function Moon({ className = "", dark = "bg-dark", children }) {
  return (
    <div className={`relative aspect-[1.4/1] ${className}`} aria-hidden={children ? undefined : "true"}>
      <div className="absolute inset-y-0 left-0 w-[71.4%] rounded-full bg-gold" />
      <div className={`absolute inset-y-0 right-0 flex w-[71.4%] items-center justify-center rounded-full ${dark}`}>
        {children}
      </div>
    </div>
  );
}
