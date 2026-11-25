import NetInfo from "@react-native-community/netinfo";
import {
  onlineManager,
  QueryClient,
} from "@tanstack/react-query";

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((estado) => {
    setOnline(
      estado.isInternetReachable ?? estado.isConnected ?? false,
    );
  }),
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});
