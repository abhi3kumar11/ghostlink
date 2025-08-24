import { useEffect, useState } from "react"
import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  const [theme, setTheme] = useState("system")

  useEffect(() => {
    const themeValue = document.documentElement.getAttribute("data-theme") || "system"
    setTheme(themeValue)
  }, [])

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)"
        }
      }
      {...props} />
  );
}

export { Toaster }
