import { Stack } from "expo-router";
import { StoreProvider } from "../src/store";

export default function RootLayout() {
  return (
    <StoreProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Bill Splitter" }} />
        <Stack.Screen name="details" options={{ title: "Group Details" }} />
        <Stack.Screen name="summary" options={{ title: "Split Summary" }} />
      </Stack>
    </StoreProvider>
  );
}