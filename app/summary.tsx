// app/summary.tsx
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { calcBalances, simplify, useStore } from "../src/store";

export default function SummaryScreen() {
  const router = useRouter();
  const { activeGroup } = useStore();

  if (!activeGroup) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>No active group.</Text>
        <Pressable onPress={() => router.replace("/")} style={{ backgroundColor: "#2d8cff", padding: 10, borderRadius: 10, marginTop: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go Home</Text>
        </Pressable>
      </View>
    );
  }

  if (activeGroup.people.length < 2 || activeGroup.items.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Text>You need at least 2 people and 1 expense to see the summary.</Text>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: "#2d8cff", padding: 10, borderRadius: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const { total, balances } = calcBalances(activeGroup);
  const txns = simplify(balances);
  const name = (pid: string) => activeGroup.people.find((p) => p.id === pid)?.name ?? "Unknown";

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", textAlign: "center" }}>Split Summary</Text>
      
      {/* Total Expense */}
      <View style={{ backgroundColor: "#f8f9fa", padding: 15, borderRadius: 10, borderWidth: 1, borderColor: "#e9ecef" }}>
        <Text style={{ fontWeight: "700", fontSize: 18, textAlign: "center" }}>
          Total Expense: Rs.{total.toFixed(2)}
        </Text>
        <Text style={{ color: "#666", textAlign: "center", marginTop: 5 }}>
          Average per person: Rs.{(total / activeGroup.people.length).toFixed(2)}
        </Text>
      </View>

      {/* Who Owes Whom */}
      <View>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 15 }}>Settlement</Text>
        {txns.length === 0 ? (
          <View style={{ backgroundColor: "#d4edda", padding: 15, borderRadius: 10, borderWidth: 1, borderColor: "#c3e6cb" }}>
            <Text style={{ color: "#155724", textAlign: "center", fontWeight: "600" }}>
              🎉 Everyone is settled up!
            </Text>
          </View>
        ) : (
          txns.map((t, i) => (
            <View key={i} style={{ 
              backgroundColor: "#fff", 
              borderWidth: 1, 
              borderColor: "#dee2e6", 
              borderRadius: 10, 
              padding: 15, 
              marginBottom: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2
            }}>
              <Text style={{ fontSize: 16 }}>
                <Text style={{ fontWeight: "700" }}>{name(t.from)}</Text> owes{" "}
                <Text style={{ fontWeight: "700" }}>{name(t.to)}</Text>
              </Text>
              <Text style={{ marginTop: 8, fontSize: 20, fontWeight: "800", color: "#2db55d", textAlign: "center" }}>
                Rs.{t.amount.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Action Buttons */}
      <View style={{ gap: 10, marginTop: 10 }}>
        <Pressable 
          onPress={() => router.back()} 
          style={{ backgroundColor: "#6c757d", padding: 15, borderRadius: 10, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Back to Group</Text>
        </Pressable>
        
        <Pressable 
          onPress={() => router.replace("/")} 
          style={{ backgroundColor: "#2d8cff", padding: 15, borderRadius: 10, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Done</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}