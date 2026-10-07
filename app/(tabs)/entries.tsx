import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { LogOut, Calendar, Clock, QrCode, Ticket, Layers } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { InOutEntry } from "@/lib/types";
import { localApi } from "@/services/localApi";
import { formatDate, formatTime } from "@/lib/date";
import { useRouter } from "expo-router";

type Filter = "ALL" | "1" | "3";

const PASS_META: Record<string, { label: string; color: string; bg: string }> = {
  "1": { label: "1 Day Pass", color: "#0042BF", bg: "#E8EFFC" },
  "3": { label: "3 Day Pass", color: "#C2410C", bg: "#FFEDD5" },
};
const UNKNOWN_PASS = { label: "No Pass Info", color: "#6B7280", bg: "#F3F4F6" };

const passMeta = (validity: string | null) =>
  (validity && PASS_META[validity.trim()]) || UNKNOWN_PASS;

export default function EntriesTab() {
  const [entries, setEntries] = useState<InOutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const fetchEntries = async (isRefreshing = false) => {
    if (!user) return;

    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await localApi.entries(String(user.eventId));
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
    }, [user])
  );

  const counts = useMemo(() => {
    const c = { ALL: entries.length, "1": 0, "3": 0 };
    for (const e of entries) {
      const v = e.passValidity?.trim();
      if (v === "1") c["1"]++;
      else if (v === "3") c["3"]++;
    }
    return c;
  }, [entries]);

  const filteredEntries = useMemo(
    () =>
      filter === "ALL"
        ? entries
        : entries.filter((e) => e.passValidity?.trim() === filter),
    [entries, filter]
  );

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/(auth)" as any);
        },
      },
    ]);
  };

  const renderEntry = ({ item }: { item: InOutEntry }) => {
    const meta = passMeta(item.passValidity);
    return (
      <View style={styles.entryCard}>
        <View style={[styles.cardAccent, { backgroundColor: meta.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.entryHeader}>
            <View style={[styles.qrIconBox, { backgroundColor: meta.bg }]}>
              <QrCode size={22} color={meta.color} />
            </View>
            <View style={styles.qrTextBlock}>
              <Text style={styles.qrName} numberOfLines={1}>
                {item.qrName || "—"}
              </Text>
              <Text style={styles.qrId}>QR ID #{item.qrId ?? "—"}</Text>
            </View>
            <View style={[styles.passBadge, { backgroundColor: meta.bg }]}>
              <Ticket size={13} color={meta.color} />
              <Text style={[styles.passBadgeText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.entryDetails}>
            <View style={styles.detailItem}>
              <Calendar size={15} color="#8A8F98" />
              <Text style={styles.detailText}>{formatDate(item.logDate)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Clock size={15} color="#8A8F98" />
              <Text style={styles.detailText}>{formatTime(item.logDate)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const keyExtractor = (item: InOutEntry, index: number) =>
    `${item.eventLogId ?? item.qrId}-${item.logDate}-${index}`;

  const emptyLabel =
    filter === "ALL" ? "No entries yet" : `No ${PASS_META[filter].label} entries`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SI E-Pass Scanner</Text>
          <Text style={styles.headerSubtitle}>Guest Entries</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={24} color="#0042BF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <FilterChip
            label="All"
            count={counts.ALL}
            active={filter === "ALL"}
            icon={<Layers size={15} color={filter === "ALL" ? "#fff" : "#0042BF"} />}
            onPress={() => setFilter("ALL")}
          />
          <FilterChip
            label={PASS_META["1"].label}
            count={counts["1"]}
            active={filter === "1"}
            icon={<Ticket size={15} color={filter === "1" ? "#fff" : "#0042BF"} />}
            onPress={() => setFilter("1")}
          />
          <FilterChip
            label={PASS_META["3"].label}
            count={counts["3"]}
            active={filter === "3"}
            icon={<Ticket size={15} color={filter === "3" ? "#fff" : "#0042BF"} />}
            onPress={() => setFilter("3")}
          />
          {/* <FilterChip
            label="Date"
            active={false}
            disabled
            icon={<Calendar size={15} color="#A0A6B1" />}
            onPress={() => {}}
          /> */}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0042BF" />
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <QrCode size={36} color="#0042BF" />
          </View>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
          <Text style={styles.emptySubtext}>
            Pull to refresh or switch filters to see other entries.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => fetchEntries(true)}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          renderItem={renderEntry}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchEntries(true)}
              colors={["#0042BF"]}
              tintColor="#0042BF"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  icon,
  onPress,
  count,
  disabled,
}: {
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onPress: () => void;
  count?: number;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.chip,
        active ? styles.chipActive : styles.chipIdle,
        disabled && styles.chipDisabled,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.chipText,
          active && styles.chipTextActive,
          disabled && styles.chipTextDisabled,
        ]}
      >
        {label}
      </Text>
      {count !== undefined && (
        <View style={[styles.chipBadge, active ? styles.chipBadgeActive : styles.chipBadgeIdle]}>
          <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F8FC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E6E9EF",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#0042BF" },
  headerSubtitle: { fontSize: 14, color: "#1E1E1E", marginTop: 4 },
  logoutButton: { padding: 8 },

  filtersWrapper: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E6E9EF",
  },
  filtersRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipActive: { backgroundColor: "#0042BF", borderColor: "#0042BF" },
  chipIdle: { backgroundColor: "#fff", borderColor: "#C9D6F2" },
  chipDisabled: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB", borderStyle: "dashed" },
  chipText: { fontWeight: "700", fontSize: 13, color: "#0042BF" },
  chipTextActive: { color: "#fff" },
  chipTextDisabled: { color: "#A0A6B1" },
  chipBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: "center",
  },
  chipBadgeActive: { backgroundColor: "#fff" },
  chipBadgeIdle: { backgroundColor: "#E8EFFC" },
  chipBadgeText: { color: "#0042BF", fontWeight: "800", fontSize: 11 },
  chipBadgeTextActive: { color: "#0042BF" },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContainer: { padding: 16, paddingBottom: 24 },

  entryCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EAEDF3",
    shadowColor: "#0B1F4D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  entryHeader: { flexDirection: "row", alignItems: "center" },
  qrIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  qrTextBlock: { flex: 1, marginLeft: 12, marginRight: 8 },
  qrName: { fontSize: 17, fontWeight: "800", color: "#111827", letterSpacing: 1 },
  qrId: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginTop: 2 },
  passBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  passBadgeText: { fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#F0F2F6", marginVertical: 12 },
  entryDetails: { flexDirection: "row", justifyContent: "space-between" },
  detailItem: { flexDirection: "row", alignItems: "center" },
  detailText: { fontSize: 13, color: "#6B7280", marginLeft: 6, fontWeight: "500" },

  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E8EFFC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#1E1E1E", marginBottom: 8, textAlign: "center" },
  emptySubtext: { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 20 },
  refreshButton: { backgroundColor: "#0042BF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  refreshButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
