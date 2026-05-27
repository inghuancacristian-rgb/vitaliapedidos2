import { useEffect } from "react";

export default function KefirControlModulePage() {
  useEffect(() => {
    window.location.replace("/kefir-control/index.html");
  }, []);

  return null;
}
