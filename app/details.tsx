// app/details.tsx
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, Alert } from "react-native";
import { useStore } from "../src/store";

export default function DetailsScreen() {
  const router = useRouter();
  const { activeGroup, addPerson, deletePerson, addItem, deleteItem, deleteGroup } = useStore();
  const [personName, setPersonName] = useState("");
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState("");
  const [paidBy, setPaidBy] = useState<string>("");

  useEffect(() => {
    if (!activeGroup) {
      router.replace("/");
    }
  }, [activeGroup, router]); // Added router to dependency array

  const handleDeleteGroup = () => {
    if (!activeGroup) return;
    
    Alert.alert(
      "Delete Group",
      `Are you sure you want to delete "${activeGroup.name}"? This will remove all people and expenses in this group.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGroup(activeGroup.id);
              router.replace("/");
            } catch {
              Alert.alert("Error", "Failed to delete group. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleAddItem = async () => {
    if (!activeGroup) return; // Added null check
    
    if (!desc.trim() || !cost || !paidBy) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }
    const costNum = parseFloat(cost);
    if (isNaN(costNum) || costNum <= 0) {
      Alert.alert("Error", "Cost must be a valid positive number.");
      return;
    }
    if (!activeGroup.people.some(p => p.id === paidBy)) {
      Alert.alert("Error", "Please select a valid person who paid.");
      return;
    }
    
    await addItem(desc.trim(), costNum, paidBy);
    setDesc("");
    setCost("");
    setPaidBy("");
  };

  if (!activeGroup) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const canShowSummary = activeGroup.people.length >= 2 && activeGroup.items.length > 0;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Header */}
      <View style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontSize: 24, fontWeight: "700" }}>{activeGroup.name}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => router.back()}
              style={{ backgroundColor: "#666", padding: 8, borderRadius: 8 }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Back</Text>
            </Pressable>
            <Pressable
              onPress={handleDeleteGroup}
              style={{ backgroundColor: "#ff4444", padding: 8, borderRadius: 8 }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Delete</Text>
            </Pressable>
          </View>
        </View>
        <Text style={{ color: "#666", fontSize: 14 }}>
          Group ID: {activeGroup.id}
        </Text>
      </View>

      {/* Add Person Section */}
      <View style={{ borderWidth: 1, borderRadius: 10, padding: 15, borderColor: "#ddd" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 10 }}>Add Person</Text>
        <TextInput
          style={{ borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10, borderColor: "#ccc" }}
          placeholder="Enter person name"
          value={personName}
          onChangeText={setPersonName}
        />
        <Pressable
          onPress={async () => {
            if (personName.trim()) {
              await addPerson(personName.trim());
              setPersonName("");
            } else {
              Alert.alert("Error", "Please enter a person name");
            }
          }}
          style={{ backgroundColor: "#2d8cff", padding: 12, borderRadius: 10, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Add Person</Text>
        </Pressable>
      </View>

      {/* People List */}
      <View style={{ borderWidth: 1, borderRadius: 10, padding: 15, borderColor: "#ddd" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 10 }}>People ({activeGroup.people.length})</Text>
        {activeGroup.people.length === 0 ? (
          <Text style={{ color: "#666", textAlign: "center" }}>No people yet.</Text>
        ) : (
          activeGroup.people.map((p) => (
            <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 8, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600" }}>{p.name}</Text>
                <Text style={{ color: "#666", fontSize: 12 }}>ID: {p.id}</Text>
              </View>
              <Pressable
                onPress={async () => {
                  Alert.alert(
                    "Delete Person",
                    `Are you sure you want to delete "${p.name}"?`,
                    [
                      {
                        text: "Cancel",
                        style: "cancel"
                      },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => await deletePerson(p.id)
                      }
                    ]
                  );
                }}
                style={{ backgroundColor: "#ff4444", padding: 6, borderRadius: 5 }}
              >
                <Text style={{ color: "#fff", fontSize: 12 }}>Delete</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Add Item Section */}
      <View style={{ borderWidth: 1, borderRadius: 10, padding: 15, borderColor: "#ddd" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 10 }}>Add Expense</Text>
        <TextInput
          style={{ borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10, borderColor: "#ccc" }}
          placeholder="Description"
          value={desc}
          onChangeText={setDesc}
        />
        <TextInput
          style={{ borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10, borderColor: "#ccc" }}
          placeholder="Cost"
          value={cost}
          keyboardType="numeric"
          onChangeText={setCost}
        />
        
        {/* Paid By Dropdown */}
        <Text style={{ marginBottom: 5, fontWeight: "600" }}>Paid by:</Text>
        {activeGroup.people.length === 0 ? (
          <Text style={{ color: "#666", textAlign: "center", marginBottom: 10, padding: 10 }}>
            Add people first to select who paid
          </Text>
        ) : (
          <ScrollView horizontal style={{ marginBottom: 10 }} showsHorizontalScrollIndicator={false}>
            {activeGroup.people.map((person) => (
              <Pressable
                key={person.id}
                onPress={() => setPaidBy(person.id)}
                style={{
                  backgroundColor: paidBy === person.id ? "#2d8cff" : "#f0f0f0",
                  padding: 8,
                  borderRadius: 8,
                  marginRight: 8,
                  minWidth: 80,
                  alignItems: "center"
                }}
              >
                <Text style={{ 
                  color: paidBy === person.id ? "#fff" : "#000", 
                  fontSize: 12,
                  fontWeight: paidBy === person.id ? "700" : "400"
                }}>
                  {person.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Pressable
          onPress={handleAddItem}
          style={{ 
            backgroundColor: activeGroup.people.length > 0 ? "#2d8cff" : "#ccc",
            padding: 12, 
            borderRadius: 10, 
            alignItems: "center" 
          }}
          disabled={activeGroup.people.length === 0}
        >
          <Text style={{ 
            color: "#fff", 
            fontWeight: "700" 
          }}>
            {activeGroup.people.length > 0 ? "Add Expense" : "Add People First"}
          </Text>
        </Pressable>
      </View>

      {/* Items List */}
      <View style={{ borderWidth: 1, borderRadius: 10, padding: 15, borderColor: "#ddd" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 10 }}>Expenses ({activeGroup.items.length})</Text>
        {activeGroup.items.length === 0 ? (
          <Text style={{ color: "#666", textAlign: "center" }}>No expenses yet.</Text>
        ) : (
          activeGroup.items.map((i) => {
            const paidByName = activeGroup.people.find(p => p.id === i.paid_by)?.name || "Unknown";
            // Add safety check for cost
            const itemCost = i.cost || 0;
            return (
              <View key={i.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 8, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600" }}>{i.description}</Text>
                  <Text style={{ color: "#666", fontSize: 12 }}>Rs.{itemCost.toFixed(2)} • Paid by: {paidByName}</Text>
                  <Text style={{ color: "#999", fontSize: 10 }}>ID: {i.id}</Text>
                </View>
                <Pressable
                  onPress={async () => {
                    Alert.alert(
                      "Delete Expense",
                      `Are you sure you want to delete "${i.description}"?`,
                      [
                        {
                          text: "Cancel",
                          style: "cancel"
                        },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: async () => await deleteItem(i.id)
                        }
                      ]
                    );
                  }}
                  style={{ backgroundColor: "#ff4444", padding: 6, borderRadius: 5 }}
                >
                  <Text style={{ color: "#fff", fontSize: 12 }}>Delete</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>

      {/* Summary Button */}
      {canShowSummary && (
        <Pressable
          onPress={() => router.push("/summary")}
          style={{ backgroundColor: "#2db55d", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 10 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>View Split Summary</Text>
        </Pressable>
      )}

      {!canShowSummary && activeGroup.people.length > 0 && (
        <Text style={{ color: "#666", textAlign: "center", marginTop: 10 }}>
          Add at least 2 people and 1 expense to see summary
        </Text>
      )}

      {!canShowSummary && activeGroup.people.length === 0 && (
        <Text style={{ color: "#666", textAlign: "center", marginTop: 10 }}>
          Add people and expenses to get started
        </Text>
      )}
    </ScrollView>
  );
}