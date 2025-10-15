// app/index.tsx
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View, Alert } from "react-native";
import { useState } from "react";
import { useStore } from "../src/store";

export default function HomeScreen() {
  const router = useRouter();
  const { groups, addGroup, deleteGroup, setActiveGroup } = useStore();
  const [groupName, setGroupName] = useState("");

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }
    await addGroup(groupName.trim());
    setGroupName("");
  };

  const handleGroupPress = async (groupId: string) => {
    await setActiveGroup(groupId);
    router.push("/details");
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    Alert.alert(
      "Delete Group",
      `Are you sure you want to delete "${groupName}"? This action cannot be undone.`,
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
              await deleteGroup(groupId);
            } catch {
              Alert.alert("Error", "Failed to delete group. Please try again.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 20 }}>
        Bill Splitting Groups
      </Text>

      {/* Create Group Section */}
      <View style={{ marginBottom: 20 }}>
        <TextInput
          style={{ borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10 }}
          placeholder="Enter group name"
          value={groupName}
          onChangeText={setGroupName}
        />
        <Pressable
          onPress={handleCreateGroup}
          style={{ backgroundColor: "#2d8cff", padding: 12, borderRadius: 10, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Create Group</Text>
        </Pressable>
      </View>

      {/* Groups List */}
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 10 }}>Your Groups</Text>
      <ScrollView style={{ flex: 1 }}>
        {Object.values(groups).length === 0 ? (
          <Text style={{ color: "#666", textAlign: "center", marginTop: 20 }}>
            No groups yet. Create your first group!
          </Text>
        ) : (
          Object.values(groups).map((group) => (
            <View
              key={group.id}
              style={{
                borderWidth: 1,
                borderRadius: 10,
                padding: 15,
                marginBottom: 10,
                backgroundColor: "#f9f9f9",
              }}
            >
              <Pressable
                onPress={() => handleGroupPress(group.id)}
                style={{ flex: 1 }}
              >
                <Text style={{ fontWeight: "700", fontSize: 16 }}>{group.name}</Text>
                <Text style={{ color: "#666", marginTop: 5 }}>
                  {group.people_count} people • {group.items_count} items
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => handleDeleteGroup(group.id, group.name)}
                style={{
                  backgroundColor: "#ff4444",
                  padding: 8,
                  borderRadius: 6,
                  marginTop: 10,
                  alignItems: "center"
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>
                  Delete Group
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}