import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/core/supabase/client";

export function useRealtimeActas() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("cambios-actas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "actas" },
        () => {
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: ["revision-actas"] }),
            queryClient.invalidateQueries({ queryKey: ["panel-provincial"] }),
            queryClient.invalidateQueries({
              queryKey: ["mesas-asignadas-veedor"],
            }),
          ]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
