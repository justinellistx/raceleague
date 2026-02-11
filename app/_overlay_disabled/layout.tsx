export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        margin: 0,
        background: "transparent",
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
      }}
    >
      {children}
    </div>
  );
}

