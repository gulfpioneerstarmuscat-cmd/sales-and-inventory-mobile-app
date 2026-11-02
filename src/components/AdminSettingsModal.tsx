import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONTS, RADIUS, TOUCH_TARGET, ThemeColors } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { StaffProfile, Branch, UserRole, AuditLog } from '../types';
import { supabase } from '../config/supabase';

interface AdminSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [tab, setTab] = useState<'staff' | 'audit'>('staff');
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [auditList, setAuditList] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  // New Staff Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [newBranch, setNewBranch] = useState<Branch>('Al Khoudh');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (tab === 'staff') {
        const { data, error } = await supabase
          .from('staff_profiles')
          .select('*')
          .order('name');
        if (error) throw error;
        setStaffList((data as StaffProfile[]) || []);
      } else {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(25);
        if (error) throw error;
        setAuditList((data as AuditLog[]) || []);
      }
    } catch (e) {
      console.warn('Error fetching admin data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async () => {
    if (!newName.trim() || newPin.length !== 4) {
      Alert.alert('Validation Error', 'Please enter a valid staff name and 4-digit PIN.');
      return;
    }

    try {
      const { error } = await supabase.from('staff_profiles').insert([
        {
          name: newName.trim(),
          pin: newPin.trim(),
          role: newRole,
          branch: newRole === 'admin' ? 'All' : newBranch,
          phone: newPhone.trim() || null,
          is_active: true,
        },
      ]);

      if (error) throw error;

      Alert.alert('Staff Created', `Staff profile "${newName}" successfully registered with PIN ${newPin}.`);
      setShowAddForm(false);
      setNewName('');
      setNewPin('');
      setNewPhone('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create staff profile.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="shield-checkmark" size={22} color={colors.warning} />
              <Text style={styles.title}>ADMIN CONSOLE & GOVERNANCE</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Sub Navigation Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'staff' && styles.tabBtnActive]}
              onPress={() => setTab('staff')}
            >
              <Text style={[styles.tabText, tab === 'staff' && styles.tabTextActive]}>
                Staff PINs & Roles ({staffList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === 'audit' && styles.tabBtnActive]}
              onPress={() => setTab('audit')}
            >
              <Text style={[styles.tabText, tab === 'audit' && styles.tabTextActive]}>
                Live Audit Logs
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primaryLight} style={{ marginVertical: 30 }} />
          ) : tab === 'staff' ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Add Staff Button / Form Toggle */}
              {!showAddForm ? (
                <TouchableOpacity
                  style={styles.addStaffBtn}
                  onPress={() => setShowAddForm(true)}
                >
                  <Ionicons name="person-add" size={18} color="#FFFFFF" />
                  <Text style={styles.addStaffBtnText}>ADD NEW FLOOR STAFF / PIN</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.addFormCard}>
                  <Text style={styles.formTitle}>REGISTER NEW STAFF MEMBER</Text>

                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. Salim Al-Harthy"
                    placeholderTextColor={colors.textMuted}
                    value={newName}
                    onChangeText={setNewName}
                  />

                  <Text style={styles.inputLabel}>4-Digit Login PIN</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 5678"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={4}
                    value={newPin}
                    onChangeText={setNewPin}
                  />

                  <Text style={styles.inputLabel}>Role</Text>
                  <View style={styles.rolePickerRow}>
                    {(['staff', 'admin', 'visitor'] as UserRole[]).map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.roleChip,
                          newRole === r && styles.roleChipActive,
                        ]}
                        onPress={() => setNewRole(r)}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            newRole === r && styles.roleChipTextActive,
                          ]}
                        >
                          {r.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {newRole !== 'admin' && (
                    <>
                      <Text style={styles.inputLabel}>Assigned Branch</Text>
                      <View style={styles.rolePickerRow}>
                        {(['Al Khoudh', 'Ghala'] as Branch[]).map((br) => (
                          <TouchableOpacity
                            key={br}
                            style={[
                              styles.roleChip,
                              newBranch === br && styles.roleChipActive,
                            ]}
                            onPress={() => setNewBranch(br)}
                          >
                            <Text
                              style={[
                                styles.roleChipText,
                                newBranch === br && styles.roleChipTextActive,
                              ]}
                            >
                              {br}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  <View style={styles.formActionsRow}>
                    <TouchableOpacity
                      style={styles.cancelFormBtn}
                      onPress={() => setShowAddForm(false)}
                    >
                      <Text style={styles.cancelFormText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveStaffBtn}
                      onPress={handleCreateStaff}
                    >
                      <Text style={styles.saveStaffText}>SAVE PROFILE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Staff List Cards */}
              <View style={styles.staffCardsList}>
                {staffList.map((st) => (
                  <View key={st.id} style={styles.staffCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.staffCardName}>{st.name}</Text>
                      <Text style={styles.staffCardMeta}>
                        Branch: {st.branch} • PIN: <Text style={styles.pinSecret}>{st.pin}</Text>
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.roleBadge,
                        st.role === 'admin' ? styles.badgeAdmin : styles.badgeStaff,
                      ]}
                    >
                      <Text style={styles.roleBadgeText}>{st.role.toUpperCase()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            /* Audit Log Feed */
            <ScrollView showsVerticalScrollIndicator={false}>
              {auditList.map((log) => (
                <View key={log.id} style={styles.auditRow}>
                  <View style={styles.auditActionCol}>
                    <Text style={styles.auditAction}>{log.action}</Text>
                    <Text style={styles.auditTime}>
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={styles.auditDetailsCol}>
                    <Text style={styles.auditStaff}>By: {log.staff_name || 'System'}</Text>
                    <Text style={styles.auditMeta} numberOfLines={2}>
                      {log.branch ? `[${log.branch}] ` : ''}
                      {log.details ? JSON.stringify(log.details) : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: 24,
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  addStaffBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  addStaffBtnText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  addFormCard: {
    backgroundColor: colors.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: SPACING.md,
  },
  formTitle: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: colors.surfaceLight,
    height: 42,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    color: colors.textPrimary,
    fontSize: FONTS.sizes.xs,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.surfaceLight,
  },
  roleChipActive: {
    backgroundColor: colors.primary,
  },
  roleChipText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  formActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  cancelFormBtn: {
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  cancelFormText: {
    color: colors.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  saveStaffBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  saveStaffText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
  },
  staffCardsList: {
    gap: 8,
    paddingBottom: 20,
  },
  staffCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  staffCardName: {
    color: colors.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  staffCardMeta: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  pinSecret: {
    color: colors.warning,
    fontWeight: '800',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeAdmin: {
    backgroundColor: '#F59E0B22',
  },
  badgeStaff: {
    backgroundColor: '#3B82F622',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  auditRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  auditActionCol: {
    minWidth: 110,
  },
  auditAction: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
  },
  auditTime: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  auditDetailsCol: {
    flex: 1,
  },
  auditStaff: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  auditMeta: {
    color: colors.textSecondary,
    fontSize: 9,
    marginTop: 1,
  },
  });
